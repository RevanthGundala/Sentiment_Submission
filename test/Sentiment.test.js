const { assert, expect } = require("chai");
const {Sentiment, Verifier, Poseidon, VRFv2SubscriptionManager} = require("../deployed-contracts.json");
const { ethers, network } = require("hardhat");
const { poseidonContract, buildPoseidon } = require("circomlibjs");
const {MerkleTreeJS} = require("../constants/merkleTree.js");
const { groth16 } = require("snarkjs");
const path = require("path");
const {MERKLE_TREE_HEIGHT, NUM_INPUTS, SEPOLIA_FUNCTIONS_ORACLE_ADDRESS, SUB_ID, FULFILL_GAS_LIMIT} = require("../constants/index.js");

function poseidonHash(poseidon, inputs) {
  const hash = poseidon(inputs.map((x) => ethers.BigNumber.from(x).toBigInt()));
  const hashStr = poseidon.F.toString(hash);
  const hashHex = ethers.BigNumber.from(hashStr).toHexString();
  const bytes32 = ethers.utils.hexZeroPad(hashHex, 32);
  return bytes32;
}

class PoseidonHasher {
    poseidon;

  constructor(poseidon) {
    this.poseidon = poseidon;
  }

  hash(left, right) {
    return poseidonHash(this.poseidon, [left, right]);
  }
}

class Insert {
    nullifier;
    poseidon;
    leafIndex;

  constructor(nullifier, poseidon, leafIndex) {
    this.nullifier = nullifier;
    this.poseidon = poseidon;
    this.leafIndex = leafIndex;
  }

  static new(poseidon) {
    const nullifier = ethers.utils.randomBytes(15);
    return new this(nullifier, poseidon);
  }

  get commitment() {
    return poseidonHash(this.poseidon, [this.nullifier, 0]);
  }

  get nullifierHash() {
    if (this.leafIndex === undefined)
      throw new Error("leafIndex is unset yet");
    return poseidonHash(this.poseidon, [this.nullifier, 1, this.leafIndex]);
  }
}

async function prove(witness) {
  const wasmPath = path.join(__dirname, "../circuits/build/post_js/post.wasm");
  const zkeyPath = path.join(__dirname, "../circuits/build/post_js/post_0001.zkey");
  const { proof } = await groth16.fullProve(witness, wasmPath, zkeyPath);
  const solProof = {
    a: [proof.pi_a[0], proof.pi_a[1]],
    b: [
      [proof.pi_b[0][1], proof.pi_b[0][0]],
      [proof.pi_b[1][1], proof.pi_b[1][0]],
    ],
    c: [proof.pi_c[0], proof.pi_c[1]],
  };
  return solProof;
}

describe("Sentiment", () => {
    let sentiment;
    let name;
   // let verifier;
    let provider;
    let signer;
    let poseidon;
    let poseidonContractInstance;
    let VerifierABI;
    let PoseidonABI;
    // let SentimentABI;

    before(async () => {
        console.log("Testing on " + network.name + "\n");
        poseidon = await buildPoseidon();
        // SentimentABI = require("../artifacts/contracts/Sentiment.sol/Sentiment.json").abi;
        VerifierABI = require("../artifacts/contracts/Verifier.sol/Verifier.json").abi;
        PoseidonABI = poseidonContract.generateABI(NUM_INPUTS);
        name = "Uniswap"
    });

    beforeEach(async () => {
        if(network.name === "localhost" || network.name === "hardhat") {
            provider = ethers.getDefaultProvider();
            signer = (await ethers.getSigners())[0];
        }
        else{
             provider = new ethers.providers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
              // Get private wallet key from the .env file
              let signerPrivateKey = process.env.PRIVATE_KEY;
            signer = new ethers.Wallet(signerPrivateKey, provider);
        }
        //verifier = new ethers.Contract(Verifier, VerifierABI, signer);
        poseidonContractInstance = new ethers.Contract(Poseidon, PoseidonABI, signer);

        const SentimentContractFactory = await ethers.getContractFactory("Sentiment");
        args = [SEPOLIA_FUNCTIONS_ORACLE_ADDRESS, Verifier, MERKLE_TREE_HEIGHT, Poseidon, SUB_ID, FULFILL_GAS_LIMIT]
        sentiment = await SentimentContractFactory.deploy(...args);
        await sentiment.deployed();
    });

    it("generates same poseidon hash", async function () {
        const res = await poseidonContractInstance["poseidon(uint256[2])"]([1, 2]);
        const res2 = poseidon([1, 2]);
        assert.equal(res.toString(), poseidon.F.toString(res2));
    });

    describe("Constructor", () => {
        it("should create new messages array", async () => {
            const messages = await sentiment.getMessages(name);
            assert.equal(messages.length, 0);
        });
        it("should instantiate verifier contract", async () => {
            const verifier = await sentiment.verifier();
            assert.equal(verifier, Verifier);
        });
    });

    describe("insertIntoTree", () => {
        it("should emit an event", async () => {
            const insert = Insert.new(poseidon);
            const tx = await sentiment.insertIntoTree(insert.commitment, name);
            const txReceipt = await tx.wait(1);
            assert.equal(txReceipt.events[0].event, "Inserted");
        });
        it("should emit the correct commitment", async () => {
            const insert = Insert.new(poseidon);
            const tx = await sentiment.insertIntoTree(insert.commitment, name);
            const txReceipt = await tx.wait(1);
            assert.equal(txReceipt.events[0].args.commitment, insert.commitment);
        });

        it("should insert a new leaf into the tree", async () => {
            const insert = Insert.new(poseidon);
            const tx = await sentiment.insertIntoTree(insert.commitment, name);
            const txReceipt = await tx.wait(1);
            insert.leafIndex = txReceipt.events[0].args.insertedIndex;
            const rootFromContract = await sentiment.getLastRoot();
            const tree = new MerkleTreeJS(MERKLE_TREE_HEIGHT, "test", new PoseidonHasher(poseidon));
            await tree.insert(insert.commitment);
            const rootJS = await tree.root();
            assert.equal(rootFromContract.toString(), rootJS.toString());
        });

   });

     describe("postMessageWithProof", () => {
        it("should add the message to the messages array and emit an event", async () => {
            // Insert a message
            const insert = Insert.new(poseidon);
            let tx = await sentiment.insertIntoTree(insert.commitment, name);
            let txReceipt = await tx.wait(1);
            assert.equal(txReceipt.events[0].args.commitment, insert.commitment);
            insert.leafIndex = txReceipt.events[0].args.insertedIndex;
            const tree = new MerkleTreeJS(MERKLE_TREE_HEIGHT, "test", new PoseidonHasher(poseidon));
            assert.equal(await tree.root(), await sentiment.roots(0));
            await tree.insert(insert.commitment);
            assert.equal(tree.totalElements, await sentiment.nextIndex());
            assert.equal(await tree.root(), await sentiment.roots(1));
            // Post
            const message = "Hello world";
            const nullifierHash = insert.nullifierHash;
            const {root, path_elements, path_index} = await tree.path(
                insert.leafIndex
            );
            const witness = {
                root: root,
                nullifierHash: nullifierHash,
                // Private
                nullifier: ethers.BigNumber.from(insert.nullifier).toString(),
                pathElements: path_elements,
                pathIndices: path_index
            }
            const solProof = await prove(witness);
            const postMessageWithProoftx = await sentiment.postMessageWithProof(
                name,
                message,
                nullifierHash,
                root,
                solProof
            );
            txReceipt = await postMessageWithProoftx.wait(1);
            const messages = await sentiment.getMessages(name);
            assert.equal(messages[0], message);
            assert.equal(txReceipt.events[0].event, "messagePosted");
        });
        it("should prevent a user from posting more than one message", async () => {
            // Insert a message
            const insert = Insert.new(poseidon);
            let tx = await sentiment.insertIntoTree(insert.commitment, name);
            let txReceipt = await tx.wait(1);
            assert.equal(txReceipt.events[0].args.commitment, insert.commitment);
            insert.leafIndex = txReceipt.events[0].args.insertedIndex;
            const tree = new MerkleTreeJS(MERKLE_TREE_HEIGHT, "test", new PoseidonHasher(poseidon));
            assert.equal(await tree.root(), await sentiment.roots(0));
            await tree.insert(insert.commitment);
            assert.equal(tree.totalElements, await sentiment.nextIndex());
            assert.equal(await tree.root(), await sentiment.roots(1));
            // Post
            const nullifierHash = insert.nullifierHash;
            const {root, path_elements, path_index} = await tree.path(
                insert.leafIndex
            );
            const witness = {
                root: root,
                nullifierHash: nullifierHash,
                // Private
                nullifier: ethers.BigNumber.from(insert.nullifier).toString(),
                pathElements: path_elements,
                pathIndices: path_index
            }
            const solProof = await prove(witness);
            const message1 = "Hello world";
            const message2 = "Goodbye world";
            await sentiment.postMessageWithProof(
              name,
                message1,
                nullifierHash,
                root,
                solProof
            );
            try{
                await sentiment.postMessageWithProof(
                  name,
                    message2,
                    nullifierHash,
                    root,
                    solProof
                );
                assert.fail("Expect tx to fail");
            }
            catch(error){
                expect(error.message).to.have.string(
                    "Nullifier already used"
                );
            }
        });
        it("should prevent a user from posting from a non-existent root", async () => {
            // Insert a message
            const insert = Insert.new(poseidon);
            let tx = await sentiment.insertIntoTree(insert.commitment, name);
            let txReceipt = await tx.wait(1);
            assert.equal(txReceipt.events[0].args.commitment, insert.commitment);
            insert.leafIndex = txReceipt.events[0].args.insertedIndex;
            const insertAttacker = Insert.new(poseidon);
            insertAttacker.leafIndex = 1;
            const tree = new MerkleTreeJS(MERKLE_TREE_HEIGHT, "test", new PoseidonHasher(poseidon));
            await tree.insert(insert.commitment);
            await tree.insert(insertAttacker.commitment);
            // Post
            const nullifierHash = insertAttacker.nullifierHash;
            const {root, path_elements, path_index} = await tree.path(
                insertAttacker.leafIndex
            );
            const witness = {
                root: root,
                nullifierHash: nullifierHash,
                // Private
                nullifier: ethers.BigNumber.from(insertAttacker.nullifier).toString(),
                pathElements: path_elements,
                pathIndices: path_index
            }
            const solProof = await prove(witness);
            const message = "Hello world";
            try{
                await sentiment.postMessageWithProof(
                  name,
                    message,
                    nullifierHash,
                    root,
                    solProof
                );
                assert.fail("Expect tx to fail");
            }
            catch(error){
                expect(error.message).to.have.string(
                    "Root not known"
                );
            }
        });
    });

    describe("isNullifierUsed", () => {
        it("should check if the nullifier is used", async () => {
            let nullifier = poseidonHash(poseidon, [1, 2])
            let isUsed = await sentiment.isNullifierUsed(nullifier);
            assert.equal(isUsed, false);

            // Insert a message
            const insert = Insert.new(poseidon);
            let tx = await sentiment.insertIntoTree(insert.commitment, name);
            let txReceipt = await tx.wait(1);
            assert.equal(txReceipt.events[0].args.commitment, insert.commitment);
            insert.leafIndex = txReceipt.events[0].args.insertedIndex;
            const tree = new MerkleTreeJS(MERKLE_TREE_HEIGHT, "test", new PoseidonHasher(poseidon));
            assert.equal(await tree.root(), await sentiment.roots(0));
            await tree.insert(insert.commitment);
            assert.equal(tree.totalElements, await sentiment.nextIndex());
            assert.equal(await tree.root(), await sentiment.roots(1));
            // Post
            const message = "Hello world";
            const nullifierHash = insert.nullifierHash;
            const {root, path_elements, path_index} = await tree.path(
                insert.leafIndex
            );
            const witness = {
                root: root,
                nullifierHash: nullifierHash,
                // Private
                nullifier: ethers.BigNumber.from(insert.nullifier).toString(),
                pathElements: path_elements,
                pathIndices: path_index
            }
            const solProof = await prove(witness);
            const postMessageWithProoftx = await sentiment.postMessageWithProof(
              name,
              message,
              nullifierHash,
              root,
              solProof
          );
            isUsed = await sentiment.isNullifierUsed(nullifierHash);
            assert.equal(isUsed, true);
        })
    });

    describe("addName", () => {
      it("should add the name to the names array", async () => {
        const tx = await sentiment.addName(name);
        assert.equal(await sentiment.names(0), name);
      });
    });

        // TESTING ONLY <- Make function public in contract
//      describe("clearMessages", () => {
//         it("should emit an event", async () => {
//             const tx = await Sentiment.clearMessages();
//             const receipt = await tx.wait();
//             const event = receipt.events[0];
//             assert.equal(event.event, "messagesCleared");
//         });
//         it("should clear the messages array", async () => {
//             // Insert a message
//             const insert = Insert.new(poseidon);
//             let tx = await Sentiment.insertIntoTree(insert.commitment);
//             let txReceipt = await tx.wait(1);
//             assert.equal(txReceipt.events[0].args.commitment, insert.commitment);
//             insert.leafIndex = txReceipt.events[0].args.insertedIndex;
//             const tree = new MerkleTreeJS(MERKLE_TREE_HEIGHT, "test", new PoseidonHasher(poseidon));
//             assert.equal(await tree.root(), await Sentiment.roots(0));
//             await tree.insert(insert.commitment);
//             assert.equal(tree.totalElements, await Sentiment.nextIndex());
//             assert.equal(await tree.root(), await Sentiment.roots(1));
//             await Sentiment.addName(name);
//             // Post
//             const message = "Hello world";
//             const nullifierHash = insert.nullifierHash;
//             const {root, path_elements, path_index} = await tree.path(
//                 insert.leafIndex
//             );
//             const witness = {
//                 root: root,
//                 nullifierHash: nullifierHash,
//                 // Private
//                 nullifier: ethers.BigNumber.from(insert.nullifier).toString(),
//                 pathElements: path_elements,
//                 pathIndices: path_index
//             }
//             const solProof = await prove(witness);
//             const postMessageWithProoftx = await Sentiment.postMessageWithProof(
//               name,
//               message,
//               nullifierHash,
//               root,
//               solProof
//           );
              
//             let messages = await Sentiment.getMessages(name);
//             assert.equal(messages.length, 1);
//             tx = await Sentiment.clearMessages();
//             await tx.wait(1);
//             messages = await Sentiment.getMessages(name);
//             assert.equal(messages.length, 0);
//         });
   

//     it("should reset the tree", async () => {
//       // Insert a message
//       let tree = new MerkleTreeJS(MERKLE_TREE_HEIGHT, "test", new PoseidonHasher(poseidon));
//       let insert;
//       let message;
//       let messages;
//       const lastMessage = "Goodbye world";
//       for(let i = 0; i <= Math.pow(2, MERKLE_TREE_HEIGHT); i++) {
//         if(i === Math.pow(2, MERKLE_TREE_HEIGHT)) {
//           tree = new MerkleTreeJS(MERKLE_TREE_HEIGHT, "test", new PoseidonHasher(poseidon));
//           await Sentiment.clearMessages();
//         }
//           insert = Insert.new(poseidon);
//           const tx = await Sentiment.insertIntoTree(insert.commitment);
//           let txReceipt = await tx.wait(1);
//           insert.leafIndex = txReceipt.events[0].args.insertedIndex;
//           const rootFromContract = await Sentiment.getLastRoot();
//           await tree.insert(insert.commitment);
//           const rootJS = await tree.root();
//           assert.equal(rootFromContract.toString(), rootJS.toString());
//           await Sentiment.addName(name);
//           // Post
//           message = i === Math.pow(2, MERKLE_TREE_HEIGHT) ? "Goodbye world" : "Hello world" + i.toString();
//           const nullifierHash = insert.nullifierHash;
//           const {root, path_elements, path_index} = await tree.path(
//               insert.leafIndex
//           );
//           const witness = {
//               root: root,
//               nullifierHash: nullifierHash,
//               // Private
//               nullifier: ethers.BigNumber.from(insert.nullifier).toString(),
//               pathElements: path_elements,
//               pathIndices: path_index
//           }
//           const solProof = await prove(witness);
//           const postMessageWithProoftx = await Sentiment.postMessageWithProof(
//             name,
//             message,
//             nullifierHash,
//             root,
//             solProof
//         );
//           txReceipt = await postMessageWithProoftx.wait(1);
//           if(i !== Math.pow(2, MERKLE_TREE_HEIGHT)) {
//             messages = await Sentiment.getMessages(name);
//             assert.equal(messages[i], message);
//           }
//       }

//       messages = await Sentiment.getMessages(name);
//       assert.equal(messages[0], lastMessage);
//   }).timeout(1000000);
// });
});

// allow wallets from that whitelist to generate a committment and insert into tree
// Allow them to post a message from a different wallet
// message posts get inserted into a new db on SxT 

// 1. Get functions to return the correct data to contract
// 1a. modify fronted to display the correct data
// 2. Figre out if I can post to my own db the messages from each protocol with SXt or use dbeaver
// 3. Get everything working with Aave
// 4. Use the right sql command to get the wallets from SxT



const { assert, expect } = require("chai");
const {Sentiment, Verifier, Poseidon, Emoji} = require("../deployed-contracts.json");
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
             provider = new ethers.providers.JsonRpcProvider(process.env.ETHEREUM_SEPOLIA_RPC_URL);
              // Get private wallet key from the .env file
              let signerPrivateKey = process.env.PRIVATE_KEY;
            signer = new ethers.Wallet(signerPrivateKey, provider);
        }
        //verifier = new ethers.Contract(Verifier, VerifierABI, signer);
        poseidonContractInstance = new ethers.Contract(Poseidon, PoseidonABI, signer);

        const SentimentContractFactory = await ethers.getContractFactory("Sentiment");
        args = [SEPOLIA_FUNCTIONS_ORACLE_ADDRESS, Verifier, MERKLE_TREE_HEIGHT, Poseidon, Emoji]
        sentiment = await SentimentContractFactory.deploy(...args);
        await sentiment.deployed();
    });

    it("generates same poseidon hash", async function () {
        const res = await poseidonContractInstance["poseidon(uint256[2])"]([1, 2]);
        const res2 = poseidon([1, 2]);
        assert.equal(res.toString(), poseidon.F.toString(res2));
    });

    describe("Constructor", () => {
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
        it("should emit an event", async () => {
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
            assert.equal(txReceipt.events[0].event, "MessagePosted");
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
});


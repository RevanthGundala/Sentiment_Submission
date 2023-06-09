const {ethers, network} = require("hardhat");
const fs = require("fs");
const {SEPOLIA_FUNCTIONS_ORACLE_ADDRESS, MERKLE_TREE_HEIGHT, SEPOLIA_COORDINATOR_ADDRESS, SEPOLIA_LINK_TOKEN_ADDRESS, SEPOLIA_KEY_HASH, CALLBACK_GAS_LIMIT, REQUEST_CONFIRMATIONS, SUB_ID, FULFILL_GAS_LIMIT} = require("../constants/index.js");
const {getPoseidonFactory} = require("../constants/poseidon.js");

async function deploy() {
  let args;
  let signer = (await ethers.getSigners())[0];
  const poseidonContractFactory = getPoseidonFactory(2).connect(signer);
  const poseidonContract = await poseidonContractFactory.deploy();
  console.log("Poseidon deployed to:", poseidonContract.address);

  const verifierContractFactory = await ethers.getContractFactory("Verifier");
  const verifierContract = await verifierContractFactory.deploy();
  await verifierContract.deployed();
  console.log("Verifier deployed to:", verifierContract.address);

  // const VRFv2SubscriptionManagerFactory = await ethers.getContractFactory("VRFv2SubscriptionManager");
  // args = [SEPOLIA_COORDINATOR_ADDRESS, SEPOLIA_LINK_TOKEN_ADDRESS, SEPOLIA_KEY_HASH, REQUEST_CONFIRMATIONS, CALLBACK_GAS_LIMIT, MERKLE_TREE_HEIGHT];
  // const VRFv2SubscriptionManagerContract = await VRFv2SubscriptionManagerFactory.deploy(...args);
  // await VRFv2SubscriptionManagerContract.deployed();
  // console.log("VRFv2SubscriptionManager deployed to:", VRFv2SubscriptionManagerContract.address);

  const emojiNFTFactory = await ethers.getContractFactory("Emoji");
  const emojiNFTContract = await emojiNFTFactory.deploy();
  await emojiNFTContract.deployed();
  console.log("Emoji deployed to:", emojiNFTContract.address);

  const sentimentContractFactory = await ethers.getContractFactory("Sentiment");
  args = [SEPOLIA_FUNCTIONS_ORACLE_ADDRESS, verifierContract.address, MERKLE_TREE_HEIGHT, poseidonContract.address, SUB_ID, FULFILL_GAS_LIMIT, emojiNFTContract.address]
  const sentimentContract = await sentimentContractFactory.deploy(...args);
  await sentimentContract.deployed();
  console.log("Sentiment deployed to:", sentimentContract.address);

  const message = JSON.stringify({Verifier: verifierContract.address, Sentiment: sentimentContract.address, Poseidon: poseidonContract.address, Emoji: emojiNFTContract.address, VRFv2SubscriptionManager: ""}, null, 2);
  fs.writeFileSync("deployed-contracts.json", message);
}

module.exports = {
  deploy
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
// deploy().catch((error) => {
//   console.error(error);
//   process.exitCode = 1;
// });

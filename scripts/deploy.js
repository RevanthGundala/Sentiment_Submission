const {ethers, network} = require("hardhat");
const fs = require("fs");
const {SEPOLIA_FUNCTIONS_ORACLE_ADDRESS, MERKLE_TREE_HEIGHT, SEPOLIA_COORDINATOR_ADDRESS, SEPOLIA_LINK_TOKEN_ADDRESS, SEPOLIA_KEY_HASH, CALLBACK_GAS_LIMIT, REQUEST_CONFIRMATIONS, SUB_ID, FULFILL_GAS_LIMIT} = require("../constants/index.js");
const {getPoseidonFactory} = require("../constants/poseidon.js");

async function main() {
  let args;
  let signer = (await ethers.getSigners())[0];
  const poseidonContractFactory = getPoseidonFactory(2).connect(signer);
  const poseidonContract = await poseidonContractFactory.deploy();
  console.log("Poseidon deployed to:", poseidonContract.address);

  const verifierContractFactory = await ethers.getContractFactory("Verifier");
  const verifierContract = await verifierContractFactory.deploy();
  await verifierContract.deployed();
  console.log("Verifier deployed to:", verifierContract.address);

  const VRFv2SubscriptionManagerFactory = await ethers.getContractFactory("VRFv2SubscriptionManager");
  args = [SEPOLIA_COORDINATOR_ADDRESS, SEPOLIA_LINK_TOKEN_ADDRESS, SEPOLIA_KEY_HASH, REQUEST_CONFIRMATIONS, CALLBACK_GAS_LIMIT, MERKLE_TREE_HEIGHT];
  const VRFv2SubscriptionManagerContract = await VRFv2SubscriptionManagerFactory.deploy(...args);
  await VRFv2SubscriptionManagerContract.deployed();
  console.log("VRFv2SubscriptionManager deployed to:", VRFv2SubscriptionManagerContract.address);

  const sentimentContractFactory = await ethers.getContractFactory("Sentiment");
  args = [SEPOLIA_FUNCTIONS_ORACLE_ADDRESS, verifierContract.address, MERKLE_TREE_HEIGHT, poseidonContract.address, SUB_ID, FULFILL_GAS_LIMIT]
  const sentimentContract = await sentimentContractFactory.deploy(...args);
  await sentimentContract.deployed();
  console.log("Sentiment deployed to:", sentimentContract.address);

  const message = JSON.stringify({Verifier: verifierContract.address, Sentiment: sentimentContract.address, Poseidon: poseidonContract.address, VRFv2SubscriptionManager: VRFv2SubscriptionManagerContract.address}, null, 2);
  fs.writeFileSync("deployed-contracts.json", message);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

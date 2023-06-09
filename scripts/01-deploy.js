const {ethers, network} = require("hardhat");
const fs = require("fs");
const {SEPOLIA_FUNCTIONS_ORACLE_ADDRESS, MERKLE_TREE_HEIGHT} = require("../constants/index.js");
const {getPoseidonFactory} = require("../constants/poseidon.js");
const {verify} = require("./05-verify.js");

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

  const emojiNFTFactory = await ethers.getContractFactory("Emoji");
  const emojiNFTContract = await emojiNFTFactory.deploy();
  await emojiNFTContract.deployed();
  console.log("Emoji deployed to:", emojiNFTContract.address);

  const sentimentContractFactory = await ethers.getContractFactory("Sentiment");
  args = [SEPOLIA_FUNCTIONS_ORACLE_ADDRESS, verifierContract.address, MERKLE_TREE_HEIGHT, poseidonContract.address, emojiNFTContract.address]
  const sentimentContract = await sentimentContractFactory.deploy(...args);
  if(network.name !== "hardhat" && network.name !== "localhost"){
    await sentimentContract.deployTransaction.wait(5);
  }
  else{
    await sentimentContract.deployed();
  }
  console.log("Sentiment deployed to:", sentimentContract.address);

  const message = JSON.stringify({Verifier: verifierContract.address, Sentiment: sentimentContract.address, Poseidon: poseidonContract.address, Emoji: emojiNFTContract.address}, null, 2);
  fs.writeFileSync("deployed-contracts.json", message);
  if(network.name !== "hardhat" && network.name !== "localhost"){
    await verify(sentimentContract.address, args);
  }
}

module.exports = {
  deploy
}

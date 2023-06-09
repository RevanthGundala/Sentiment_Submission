const {ethers} = require("hardhat");
const {Sentiment} = require("../deployed-contracts.json");

async function addName(name){
    const SENTIMENT_ABI = require("../artifacts/contracts/Sentiment.sol/Sentiment.json").abi;
    const sentimentContract = new ethers.Contract(Sentiment, SENTIMENT_ABI, (await ethers.getSigners())[0]);
    const tx = await sentimentContract.addName(name);
    await tx.wait(1);
    console.log("Added name: " + name);
}

module.exports = {
    addName
}
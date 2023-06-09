const {ethers} = require("hardhat");
const {Sentiment} = require("../deployed-contracts.json");

async function mintNFT(metaDataURL){
    const SENTIMENT_ABI = require("../artifacts/contracts/Sentiment.sol/Sentiment.json").abi;
    const sentimentContract = new ethers.Contract(Sentiment, SENTIMENT_ABI, (await ethers.getSigners())[0]);
    const tx = await sentimentContract.addEmoji(metaDataURL);
    await tx.wait(1);
    console.log("Minted NFT: " + metaDataURL);
}

module.exports = {
    mintNFT
}
const {ethers, network} = require("hardhat");
require("dotenv").config();

async function mintNFT(Sentiment, metaDataURL){
    let provider;
    let signer;
    if(network.name === "hardhat" || network.name === "localhost"){
        signer = (await ethers.getSigners())[0]
    }
    else{
        provider = new ethers.providers.JsonRpcProvider(process.env.ETHEREUM_SEPOLIA_RPC_URL);
        signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    }
    const SENTIMENT_ABI = require("../artifacts/contracts/Sentiment.sol/Sentiment.json").abi;
    const sentimentContract = new ethers.Contract(Sentiment, SENTIMENT_ABI, signer);
    const tx = await sentimentContract.addEmoji(metaDataURL);
    await tx.wait(1);
    console.log("Minted NFT: " + metaDataURL);
}

module.exports = {
    mintNFT
}


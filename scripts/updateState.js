const {ethers} = require("hardhat");
const {Sentiment} = require("../deployed-contracts.json");


async function main(){
    const SENTIMENT_ABI = require("../artifacts/contracts/Sentiment.sol/Sentiment.json").abi;
    provider = new ethers.providers.JsonRpcProvider(process.env.ETHEREUM_SEPOLIA_RPC_URL);
    signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const contract = new ethers.Contract(Sentiment, SENTIMENT_ABI, signer);
    const tx = await contract.updateState();
    await tx.wait(2);
    console.log("State updated");
}

main();

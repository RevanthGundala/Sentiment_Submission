const {Sentiment} = require("../../deployed-contracts.json");
const SENTIMENT_ADDRESS = Sentiment;
const SENTIMENT_ABI = require("../../artifacts/contracts/Sentiment.sol/Sentiment.json").abi;
const SUB_ID = 380;
const FULFILL_GAS_LIMIT = 700000;

module.exports = {
    SENTIMENT_ABI,
    SENTIMENT_ADDRESS,
    SUB_ID,
    FULFILL_GAS_LIMIT
}



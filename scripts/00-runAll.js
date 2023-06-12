const {deploy} = require("./01-deploy.js");
const {storeNFT} = require("./02-store-content.js");
const {mintNFT} = require("./03-mint.js");
const {addProtocol} = require("./04-add-name.js");

const {EMOJIS, BASE_PATH, INITIAL_NAMES} = require("../constants/index.js")

async function runAll(){
  const sentimentAddress = await deploy();
  for(let i = 0; i < EMOJIS.length; i++){
    let metadataURL = await storeNFT(
      EMOJIS[i], 
      `This is a ${EMOJIS[i]} emoji`,
      BASE_PATH + EMOJIS[i] + ".png");
    await mintNFT(sentimentAddress, metadataURL);
  }
  for(let i = 0; i < INITIAL_NAMES.length; i++){
    await addProtocol(sentimentAddress, INITIAL_NAMES[i]);
  }
}

runAll().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
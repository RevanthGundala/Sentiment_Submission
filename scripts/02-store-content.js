const {NFTStorage, File} = require("nft.storage");
require("dotenv").config();
const fs = require('fs');
const API_KEY = process.env.NFT_STORAGE_API_KEY;

async function storeNFT(name, description, imagePath){
    const client = new NFTStorage({ token: API_KEY });
    const metadata = await client.store({
        name: `Sentiment ${name}`,
        description: description,
        image: new File([await fs.promises.readFile(imagePath)], `${name}.png`, { type: "image/png" })
    });
    return metadata.url;
}

module.exports = {
    storeNFT
}
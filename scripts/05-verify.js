const hre = require("hardhat");

async function verify(contractAddress, args){
    await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: args
    })
}

module.exports = {
    verify
};
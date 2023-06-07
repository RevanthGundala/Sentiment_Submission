const {ethers} = require("hardhat");
const {poseidonContract} = require("circomlibjs");

function getPoseidonFactory(nInputs) {
    const bytecode = poseidonContract.createCode(nInputs);
    const abiJson = poseidonContract.generateABI(nInputs);
    const abi = new ethers.utils.Interface(abiJson);
    return new ethers.ContractFactory(abi, bytecode);
}
exports.getPoseidonFactory = getPoseidonFactory;
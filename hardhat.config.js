require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("@nomiclabs/hardhat-etherscan");
/** @type import('hardhat/config').HardhatUserConfig */
const PRIVATE_KEY =
  process.env.PRIVATE_KEY ?? "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
module.exports = {
  solidity:{
  compilers: [
    {
      version: "0.8.9",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    },
    {
      version: "0.6.12",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    },
    {
      version: "0.4.24",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }
  ]
},
  networks: {
    hardhat: {
      chainId: 1337,
    },
    localhost: {
      url: "http://localhost:8545/",
    },
    goerli: {
      url: "https://eth-goerli.alchemyapi.io/v2/uCEYmy2DTEaZ7K-uSji3CWGnFjNwQg3K",
      accounts: [PRIVATE_KEY],
      chainId: 5,
    },
    sepolia: {
      url: "https://eth-sepolia.g.alchemy.com/v2/S74hlwWI4VY_rvgbmCup8y99ZHKb5lCO",
      accounts: [PRIVATE_KEY],
      chainId: 11155111,
    },
    "base-goerli": {
      url: "https://goerli.base.org",
      chainId: 84531,
      accounts: [PRIVATE_KEY],
    },
    "truffle-dashboard": {
      url: "http://localhost:24012/rpc",
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
};
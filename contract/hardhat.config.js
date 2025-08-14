require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true
    }
  },
  networks: {
    hardhat: {
      chainId: 1337,
      // Fork mainnet when FORK=true
      ...(process.env.FORK === "true" ? {
        forking: {
          url: process.env.MAINNET_RPC_URL || "https://mainnet.infura.io/v3/YOUR_KEY",
          blockNumber: 18500000 // Pin to specific block for consistency
        },
        // Fix gas price issues when forking
        initialBaseFeePerGas: 1000000000, // 1 gwei
        gasPrice: 1000000000, // 1 gwei
      } : {})
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111
    },
    mainnet: {
      url: process.env.MAINNET_RPC_URL || "https://mainnet.infura.io/v3/YOUR_KEY",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 1
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || ""
  }
};
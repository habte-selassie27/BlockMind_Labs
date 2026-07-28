require("@nomicfoundation/hardhat-verify")

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "paris"
    }
  },
  networks: {
    giwa: {
      url: "https://sepolia-rpc.giwa.io",
      chainId: 91342
    }
  },
  etherscan: {
    apiKey: {
      giwa: "no-api-key-needed"
    },
    customChains: [{
      network: "giwa",
      chainId: 91342,
      urls: {
        apiURL: "https://sepolia-explorer.giwa.io/api",
        browserURL: "https://sepolia-explorer.giwa.io"
      }
    }]
  }
}

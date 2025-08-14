// CryptoHeir Contract ABI
const CRYPTOHEIR_ABI = [
  // Setup and Configuration
  {
    "inputs": [
      {"name": "_inactivityPeriod", "type": "uint256"},
      {"name": "_heirs", "type": "address[]"},
      {"name": "_percentages", "type": "uint256[]"},
      {"name": "_tokens", "type": "address[]"}
    ],
    "name": "setupInheritance",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "updateActivity",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "_token", "type": "address"}],
    "name": "addToken",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "_token", "type": "address"}],
    "name": "removeToken",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "_heirs", "type": "address[]"},
      {"name": "_percentages", "type": "uint256[]"}
    ],
    "name": "updateAllHeirs",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "pauseInheritance",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "unpauseInheritance",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "deactivateInheritance",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "_newInactivityPeriod", "type": "uint256"}],
    "name": "updateInactivityPeriod",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  // Claiming
  {
    "inputs": [
      {"name": "user", "type": "address"},
      {"name": "token", "type": "address"}
    ],
    "name": "claimTokens",
    "outputs": [
      {"name": "success", "type": "bool"},
      {"name": "amount", "type": "uint256"}
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  // View Functions
  {
    "inputs": [{"name": "user", "type": "address"}],
    "name": "getUserConfig",
    "outputs": [
      {
        "components": [
          {"name": "inactivityPeriod", "type": "uint256"},
          {"name": "lastActivity", "type": "uint256"},
          {"name": "isActive", "type": "bool"},
          {"name": "isPaused", "type": "bool"},
          {"name": "pausedAt", "type": "uint256"}
        ],
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "user", "type": "address"}],
    "name": "getUserHeirs",
    "outputs": [
      {
        "components": [
          {"name": "wallet", "type": "address"},
          {"name": "percentage", "type": "uint8"}
        ],
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "user", "type": "address"}],
    "name": "getUserSelectedTokens",
    "outputs": [{"name": "", "type": "address[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "user", "type": "address"}],
    "name": "isInheritanceAvailable",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "user", "type": "address"}],
    "name": "getTimeUntilInheritance",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "user", "type": "address"},
      {"name": "heir", "type": "address"},
      {"name": "token", "type": "address"}
    ],
    "name": "hasHeirClaimedToken",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  
  // Events
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "user", "type": "address"},
      {"indexed": false, "name": "inactivityPeriod", "type": "uint256"}
    ],
    "name": "InheritanceSetup",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "user", "type": "address"}
    ],
    "name": "InheritanceDeactivated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "user", "type": "address"}
    ],
    "name": "InheritancePaused",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "user", "type": "address"}
    ],
    "name": "InheritanceUnpaused",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "user", "type": "address"},
      {"indexed": false, "name": "timestamp", "type": "uint256"}
    ],
    "name": "ActivityUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "user", "type": "address"},
      {"indexed": true, "name": "heir", "type": "address"},
      {"indexed": true, "name": "token", "type": "address"},
      {"indexed": false, "name": "amount", "type": "uint256"}
    ],
    "name": "TokenInherited",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "user", "type": "address"},
      {"indexed": true, "name": "heir", "type": "address"},
      {"indexed": true, "name": "token", "type": "address"},
      {"indexed": false, "name": "reason", "type": "string"}
    ],
    "name": "TokenClaimFailed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "user", "type": "address"},
      {"indexed": true, "name": "token", "type": "address"}
    ],
    "name": "TokenSelected",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "user", "type": "address"},
      {"indexed": true, "name": "token", "type": "address"}
    ],
    "name": "TokenRemoved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "user", "type": "address"}
    ],
    "name": "InheritanceCompleted",
    "type": "event"
  }
];

// ERC20 Token ABI (minimal)
const ERC20_ABI = [
  {
    "inputs": [{"name": "owner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "spender", "type": "address"},
      {"name": "amount", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "owner", "type": "address"},
      {"name": "spender", "type": "address"}
    ],
    "name": "allowance",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{"name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{"name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [{"name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  }
];

// Contract addresses (loaded from server config)
let CONTRACT_ADDRESSES = {};

// Load contract addresses from server
async function loadContractConfig() {
  const response = await fetch('/api/config');
  const config = await response.json();
  CONTRACT_ADDRESSES = config.contractAddresses;
}

// Initialize config on load
loadContractConfig();

// Common token addresses
const TOKEN_ADDRESSES = {
  MAINNET: {
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F'
  },
  SEPOLIA: {
    // Add Sepolia testnet token addresses here
  }
};
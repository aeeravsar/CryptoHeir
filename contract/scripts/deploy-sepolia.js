const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying CryptoHeir to Sepolia testnet...\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  
  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH\n");

  if (balance < ethers.parseEther("0.01")) {
    console.log("❌ Insufficient balance! Need at least 0.01 ETH for deployment");
    console.log("Get Sepolia ETH from: https://sepoliafaucet.com/");
    process.exit(1);
  }

  // Get current gas price
  const feeData = await ethers.provider.getFeeData();
  console.log("Current gas price:", ethers.formatUnits(feeData.gasPrice, "gwei"), "Gwei");

  // Deploy contract
  console.log("📄 Deploying CryptoHeir contract...");
  const CryptoHeir = await ethers.getContractFactory("CryptoHeir");
  
  const cryptoHeir = await CryptoHeir.deploy({
    gasLimit: 3000000, // Set explicit gas limit
  });

  console.log("⏳ Waiting for deployment confirmation...");
  await cryptoHeir.waitForDeployment();

  const contractAddress = await cryptoHeir.getAddress();
  console.log("✅ CryptoHeir deployed to:", contractAddress);

  // Get deployment transaction
  const deployTx = cryptoHeir.deploymentTransaction();
  const receipt = await deployTx.wait();
  
  console.log("\n📊 Deployment Stats:");
  console.log("Transaction hash:", deployTx.hash);
  console.log("Block number:", receipt.blockNumber);
  console.log("Gas used:", receipt.gasUsed.toString());
  console.log("Gas price:", ethers.formatUnits(receipt.gasPrice, "gwei"), "Gwei");
  
  const cost = receipt.gasUsed * receipt.gasPrice;
  console.log("Total cost:", ethers.formatEther(cost), "ETH");

  console.log("\n🔍 Verification:");
  console.log("1. Check on Sepolia Etherscan:");
  console.log(`   https://sepolia.etherscan.io/address/${contractAddress}`);
  
  console.log("\n2. Verify contract source (wait 1 minute first):");
  console.log(`   npx hardhat verify --network sepolia ${contractAddress}`);

  console.log("\n📝 Save this address for testing:");
  console.log(`   SEPOLIA_CONTRACT_ADDRESS=${contractAddress}`);

  console.log("\n🧪 Next steps:");
  console.log("1. Verify contract on Etherscan");
  console.log("2. Test with small amounts");
  console.log("3. Use Sepolia testnet tokens");
  console.log("4. Follow SEPOLIA_TESTING.md guide");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
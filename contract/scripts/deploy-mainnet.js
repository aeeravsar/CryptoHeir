const { ethers } = require("hardhat");

async function main() {
  console.log("🚨 MAINNET DEPLOYMENT - REAL MONEY INVOLVED! 🚨\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  
  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH\n");

  if (balance < ethers.parseEther("0.02")) {
    console.log("❌ Insufficient balance! Need at least 0.02 ETH for safe deployment");
    console.log("Current gas prices may require more ETH");
    process.exit(1);
  }

  // Get current gas price and estimate costs
  const feeData = await ethers.provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  console.log("Current gas price:", ethers.formatUnits(gasPrice, "gwei"), "Gwei");
  
  // Estimate deployment cost
  const estimatedGas = 2600000n; // Add buffer to actual gas usage
  const estimatedCost = estimatedGas * gasPrice;
  console.log("Estimated deployment cost:", ethers.formatEther(estimatedCost), "ETH");
  console.log("Estimated USD cost: $", (parseFloat(ethers.formatEther(estimatedCost)) * 4696.47).toFixed(2));

  // Safety check for high gas prices
  const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, "gwei"));
  if (gasPriceGwei > 20) {
    console.log("\n⚠️  WARNING: Gas price is HIGH (", gasPriceGwei, "Gwei)");
    console.log("Consider waiting for lower gas prices to save money");
    console.log("Check current prices: https://etherscan.io/gastracker");
    
    // Uncomment to force exit on high gas
    // process.exit(1);
  }

  console.log("\n🔒 FINAL SAFETY CHECKS:");
  console.log("1. ✅ Contract tested on Sepolia?");
  console.log("2. ✅ All tests passing locally?");
  console.log("3. ✅ Gas price acceptable?");
  console.log("4. ✅ Deployer account secured?");
  console.log("5. ✅ Ready for mainnet?");

  // Wait for user confirmation
  console.log("\n⏳ Deployment will start in 10 seconds...");
  console.log("Press Ctrl+C to cancel if not ready!");
  await new Promise(resolve => setTimeout(resolve, 10000));

  // Deploy contract
  console.log("\n🚀 Deploying CryptoHeir to ETHEREUM MAINNET...");
  const CryptoHeir = await ethers.getContractFactory("CryptoHeir");
  
  const cryptoHeir = await CryptoHeir.deploy({
    gasLimit: 3000000, // Set explicit gas limit with buffer
    gasPrice: gasPrice, // Use current gas price
  });

  console.log("⏳ Waiting for deployment confirmation...");
  console.log("Transaction hash:", cryptoHeir.deploymentTransaction().hash);
  
  await cryptoHeir.waitForDeployment();

  const contractAddress = await cryptoHeir.getAddress();
  console.log("\n🎉 CryptoHeir deployed to MAINNET:", contractAddress);

  // Get deployment transaction details
  const deployTx = cryptoHeir.deploymentTransaction();
  const receipt = await deployTx.wait();
  
  console.log("\n📊 Deployment Stats:");
  console.log("Transaction hash:", deployTx.hash);
  console.log("Block number:", receipt.blockNumber);
  console.log("Gas used:", receipt.gasUsed.toString());
  console.log("Gas price:", ethers.formatUnits(receipt.gasPrice, "gwei"), "Gwei");
  
  const actualCost = receipt.gasUsed * receipt.gasPrice;
  console.log("Actual cost:", ethers.formatEther(actualCost), "ETH");
  console.log("USD cost: $", (parseFloat(ethers.formatEther(actualCost)) * 4696.47).toFixed(2));

  console.log("\n🔍 Verification:");
  console.log("1. Check on Etherscan:");
  console.log(`   https://etherscan.io/address/${contractAddress}`);
  
  console.log("\n2. Verify contract source (wait 2-3 minutes first):");
  console.log(`   npx hardhat verify --network mainnet ${contractAddress}`);

  console.log("\n💾 IMPORTANT - Save this information:");
  console.log("=".repeat(60));
  console.log(`MAINNET_CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`DEPLOYMENT_TX=${deployTx.hash}`);
  console.log(`DEPLOYMENT_BLOCK=${receipt.blockNumber}`);
  console.log(`DEPLOYMENT_COST=${ethers.formatEther(actualCost)}_ETH`);
  console.log("=".repeat(60));

  console.log("\n🛡️  Security Reminders:");
  console.log("1. Contract is IMMUTABLE - cannot be upgraded");
  console.log("2. Test with small amounts initially");
  console.log("3. Verify contract source on Etherscan");
  console.log("4. Keep private keys secure");
  console.log("5. Document inheritance setup for beneficiaries");

  console.log("\n✅ Next steps:");
  console.log("1. Verify contract on Etherscan");
  console.log("2. Test with small token amounts");
  console.log("3. Set up inheritance for real use");
  console.log("4. Share contract address with heirs");
  
  console.log("\n🎯 DEPLOYMENT COMPLETE!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ MAINNET DEPLOYMENT FAILED:", error);
    console.error("\n🚨 Check transaction on Etherscan if gas was consumed");
    process.exit(1);
  });
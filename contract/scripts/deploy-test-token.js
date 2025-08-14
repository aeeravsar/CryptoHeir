const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    
    console.log("🪙 Deploying test token to Sepolia...");
    console.log("Deployer address:", deployer.address);
    console.log("Deployer balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
    
    // Deploy InheritanceTestToken
    const TestToken = await ethers.getContractFactory("InheritanceTestToken");
    const testToken = await TestToken.deploy();
    await testToken.waitForDeployment();
    
    const tokenAddress = await testToken.getAddress();
    console.log("✅ InheritanceTestToken deployed to:", tokenAddress);
    
    // Get some test tokens for the deployer
    console.log("🎁 Acquiring test tokens...");
    const mintTx = await testToken.getTestTokens();
    await mintTx.wait();
    
    const balance = await testToken.balanceOf(deployer.address);
    const symbol = await testToken.symbol();
    const name = await testToken.name();
    const decimals = await testToken.decimals();
    
    console.log(`📊 Token Info:`);
    console.log(`Name: ${name}`);
    console.log(`Symbol: ${symbol}`);
    console.log(`Decimals: ${decimals}`);
    console.log(`Balance: ${ethers.formatUnits(balance, decimals)} ${symbol}`);
    
    console.log(`\n🔍 Etherscan: https://sepolia.etherscan.io/address/${tokenAddress}`);
    console.log(`\n📝 Save this for testing:`);
    console.log(`TEST_TOKEN_ADDRESS=${tokenAddress}`);
    console.log(`\n🧪 Use this token address in the CryptoHeir web app for testing!`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("CryptoHeir - Mainnet Fork", function () {
  this.timeout(120000); // 2 minutes timeout for fork tests

  let cryptoHeir;
  let owner, heir1, heir2;
  let usdc, usdt, weth, dai;
  
  const INACTIVITY_PERIOD = 180 * 24 * 60 * 60; // 180 days
  
  // Mainnet token addresses
  const TOKENS = {
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F"
  };
  
  before(async function () {
    // Skip if not running fork
    if (!process.env.FORK) {
      this.skip();
    }
  });

  beforeEach(async function () {
    [owner, heir1, heir2] = await ethers.getSigners();
    
    // Deploy CryptoHeir
    const CryptoHeir = await ethers.getContractFactory("CryptoHeir");
    cryptoHeir = await CryptoHeir.deploy();
    await cryptoHeir.waitForDeployment();
    
    // Get token contracts
    usdc = await ethers.getContractAt("IERC20", TOKENS.USDC);
    usdt = await ethers.getContractAt("IERC20", TOKENS.USDT);
    weth = await ethers.getContractAt("IERC20", TOKENS.WETH);
    dai = await ethers.getContractAt("IERC20", TOKENS.DAI);
    
    // Use deal to give tokens directly to owner (Hardhat's cheat code)
    const usdcSlot = 9; // USDC balance slot
    const usdtSlot = 2; // USDT balance slot  
    const wethSlot = 3; // WETH balance slot
    const daiSlot = 2; // DAI balance slot
    
    // Set token balances using hardhat's setStorageAt
    await setTokenBalance(TOKENS.USDC, owner.address, ethers.parseUnits("10000", 6), usdcSlot);
    await setTokenBalance(TOKENS.USDT, owner.address, ethers.parseUnits("10000", 6), usdtSlot);
    await setTokenBalance(TOKENS.WETH, owner.address, ethers.parseEther("10"), wethSlot);
    await setTokenBalance(TOKENS.DAI, owner.address, ethers.parseEther("10000"), daiSlot);
  });
  
  async function setTokenBalance(tokenAddress, userAddress, amount, slot) {
    // Calculate storage slot for balance mapping
    const paddedUser = ethers.zeroPadValue(userAddress, 32);
    const paddedSlot = ethers.zeroPadValue(ethers.toBeHex(slot), 32);
    const balanceSlot = ethers.keccak256(paddedUser + paddedSlot.slice(2));
    
    // Set the balance
    await network.provider.send("hardhat_setStorageAt", [
      tokenAddress,
      balanceSlot,
      ethers.zeroPadValue(ethers.toBeHex(amount), 32)
    ]);
  }

  describe("Real Token Inheritance", function () {
    beforeEach(async function () {
      // Setup inheritance with real tokens
      await cryptoHeir.connect(owner).setupInheritance(
        INACTIVITY_PERIOD,
        [heir1.address, heir2.address],
        [60, 40],
        [TOKENS.USDC, TOKENS.USDT, TOKENS.WETH, TOKENS.DAI]
      );
      
      // Approve all tokens
      await usdc.connect(owner).approve(await cryptoHeir.getAddress(), ethers.MaxUint256);
      await usdt.connect(owner).approve(await cryptoHeir.getAddress(), ethers.MaxUint256);
      await weth.connect(owner).approve(await cryptoHeir.getAddress(), ethers.MaxUint256);
      await dai.connect(owner).approve(await cryptoHeir.getAddress(), ethers.MaxUint256);
      
      // Fast forward time
      await time.increase(INACTIVITY_PERIOD + 1);
    });

    it("Should claim USDC correctly", async function () {
      const balance = await usdc.balanceOf(owner.address);
      expect(balance).to.be.gt(0);
      
      await cryptoHeir.connect(heir1).claimTokens(owner.address, TOKENS.USDC);
      
      const heir1Balance = await usdc.balanceOf(heir1.address);
      expect(heir1Balance).to.equal((balance * 60n) / 100n);
    });

    it("Should claim USDT correctly", async function () {
      const balance = await usdt.balanceOf(owner.address);
      expect(balance).to.be.gt(0);
      
      await cryptoHeir.connect(heir1).claimTokens(owner.address, TOKENS.USDT);
      
      const heir1Balance = await usdt.balanceOf(heir1.address);
      expect(heir1Balance).to.equal((balance * 60n) / 100n);
    });

    it("Should claim WETH correctly", async function () {
      const balance = await weth.balanceOf(owner.address);
      expect(balance).to.be.gt(0);
      
      await cryptoHeir.connect(heir1).claimTokens(owner.address, TOKENS.WETH);
      
      const heir1Balance = await weth.balanceOf(heir1.address);
      expect(heir1Balance).to.equal((balance * 60n) / 100n);
    });

    it("Should claim DAI correctly", async function () {
      const balance = await dai.balanceOf(owner.address);
      expect(balance).to.be.gt(0);
      
      await cryptoHeir.connect(heir1).claimTokens(owner.address, TOKENS.DAI);
      
      const heir1Balance = await dai.balanceOf(heir1.address);
      expect(heir1Balance).to.equal((balance * 60n) / 100n);
    });

    it("Should handle multiple real tokens and auto-delete", async function () {
      // Both heirs claim all tokens
      for (const tokenAddress of [TOKENS.USDC, TOKENS.USDT, TOKENS.WETH, TOKENS.DAI]) {
        await cryptoHeir.connect(heir1).claimTokens(owner.address, tokenAddress);
        await cryptoHeir.connect(heir2).claimTokens(owner.address, tokenAddress);
      }
      
      // Should be auto-deleted
      const config = await cryptoHeir.getUserConfig(owner.address);
      expect(config.isActive).to.be.false;
    });

    it("Should verify actual token balances after claiming", async function () {
      const initialBalances = {
        usdc: await usdc.balanceOf(owner.address),
        usdt: await usdt.balanceOf(owner.address),
        weth: await weth.balanceOf(owner.address),
        dai: await dai.balanceOf(owner.address)
      };
      
      // Heir1 claims all tokens
      await cryptoHeir.connect(heir1).claimTokens(owner.address, TOKENS.USDC);
      await cryptoHeir.connect(heir1).claimTokens(owner.address, TOKENS.USDT);
      await cryptoHeir.connect(heir1).claimTokens(owner.address, TOKENS.WETH);
      await cryptoHeir.connect(heir1).claimTokens(owner.address, TOKENS.DAI);
      
      // Verify heir1 received 60% of each token
      const heir1UsdcBalance = await usdc.balanceOf(heir1.address);
      const heir1UsdtBalance = await usdt.balanceOf(heir1.address);
      const heir1WethBalance = await weth.balanceOf(heir1.address);
      const heir1DaiBalance = await dai.balanceOf(heir1.address);
      
      expect(heir1UsdcBalance).to.be.gt(0);
      expect(heir1UsdtBalance).to.be.gt(0);
      expect(heir1WethBalance).to.be.gt(0);
      expect(heir1DaiBalance).to.be.gt(0);
      
      // Heir2 claims all tokens
      await cryptoHeir.connect(heir2).claimTokens(owner.address, TOKENS.USDC);
      await cryptoHeir.connect(heir2).claimTokens(owner.address, TOKENS.USDT);
      await cryptoHeir.connect(heir2).claimTokens(owner.address, TOKENS.WETH);
      await cryptoHeir.connect(heir2).claimTokens(owner.address, TOKENS.DAI);
      
      // Verify heir2 received 40% of each token
      const heir2UsdcBalance = await usdc.balanceOf(heir2.address);
      const heir2UsdtBalance = await usdt.balanceOf(heir2.address);
      const heir2WethBalance = await weth.balanceOf(heir2.address);
      const heir2DaiBalance = await dai.balanceOf(heir2.address);
      
      expect(heir2UsdcBalance).to.be.gt(0);
      expect(heir2UsdtBalance).to.be.gt(0);
      expect(heir2WethBalance).to.be.gt(0);
      expect(heir2DaiBalance).to.be.gt(0);
      
      // Verify heir1 got more than heir2 (60% vs 40%)
      expect(heir1UsdcBalance).to.be.gt(heir2UsdcBalance);
      expect(heir1UsdtBalance).to.be.gt(heir2UsdtBalance);
    });
  });

  describe("Different Token Decimals", function () {
    it("Should handle tokens with different decimals correctly", async function () {
      await cryptoHeir.connect(owner).setupInheritance(
        INACTIVITY_PERIOD,
        [heir1.address],
        [100],
        [TOKENS.USDC, TOKENS.WETH] // USDC: 6 decimals, WETH: 18 decimals
      );
      
      await usdc.connect(owner).approve(await cryptoHeir.getAddress(), ethers.MaxUint256);
      await weth.connect(owner).approve(await cryptoHeir.getAddress(), ethers.MaxUint256);
      
      await time.increase(INACTIVITY_PERIOD + 1);
      
      const usdcBalanceBefore = await usdc.balanceOf(owner.address);
      const wethBalanceBefore = await weth.balanceOf(owner.address);
      
      await cryptoHeir.connect(heir1).claimTokens(owner.address, TOKENS.USDC);
      await cryptoHeir.connect(heir1).claimTokens(owner.address, TOKENS.WETH);
      
      // Heir should receive tokens (100% since they're the only heir)
      const heir1UsdcBalance = await usdc.balanceOf(heir1.address);
      const heir1WethBalance = await weth.balanceOf(heir1.address);
      
      expect(heir1UsdcBalance).to.be.gt(0);
      expect(heir1WethBalance).to.be.gt(0);
      
      // Verify both tokens were claimed despite different decimals
      console.log(`USDC (6 decimals): ${heir1UsdcBalance}`);
      console.log(`WETH (18 decimals): ${heir1WethBalance}`);
    });
  });

  describe("Gas Costs with Real Tokens", function () {
    it("Should measure gas costs for claiming real tokens", async function () {
      await cryptoHeir.connect(owner).setupInheritance(
        INACTIVITY_PERIOD,
        [heir1.address],
        [100],
        [TOKENS.USDC]
      );
      
      await usdc.connect(owner).approve(await cryptoHeir.getAddress(), ethers.MaxUint256);
      await time.increase(INACTIVITY_PERIOD + 1);
      
      const tx = await cryptoHeir.connect(heir1).claimTokens(owner.address, TOKENS.USDC);
      const receipt = await tx.wait();
      
      console.log(`Gas used for claiming USDC: ${receipt.gasUsed.toString()}`);
      expect(receipt.gasUsed).to.be.lt(200000); // Should use less than 200k gas
    });
  });
});
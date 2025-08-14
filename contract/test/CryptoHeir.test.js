const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("CryptoHeir", function () {
  let cryptoHeir;
  let owner, heir1, heir2, heir3, user2;
  let usdc, usdt, badToken;
  
  const INACTIVITY_PERIOD = 180 * 24 * 60 * 60; // 180 days

  beforeEach(async function () {
    [owner, heir1, heir2, heir3, user2] = await ethers.getSigners();
    
    // Deploy contracts
    const CryptoHeir = await ethers.getContractFactory("CryptoHeir");
    cryptoHeir = await CryptoHeir.deploy();
    await cryptoHeir.waitForDeployment();
    
    const TestToken = await ethers.getContractFactory("InheritanceTestToken");
    usdc = await TestToken.deploy();
    await usdc.waitForDeployment();
    
    usdt = await TestToken.deploy();
    await usdt.waitForDeployment();

    const BadToken = await ethers.getContractFactory("BadToken");
    badToken = await BadToken.deploy();
    await badToken.waitForDeployment();
  });

  describe("Setup", function () {
    it("Should setup inheritance with heirs and tokens in one transaction", async function () {
      await cryptoHeir.connect(owner).setupInheritance(
        INACTIVITY_PERIOD,
        [heir1.address, heir2.address],
        [60, 40],
        [await usdc.getAddress(), await usdt.getAddress()]
      );
      
      const config = await cryptoHeir.getUserConfig(owner.address);
      expect(config.isActive).to.be.true;
      
      const heirs = await cryptoHeir.getUserHeirs(owner.address);
      expect(heirs.length).to.equal(2);
      
      const tokens = await cryptoHeir.getUserSelectedTokens(owner.address);
      expect(tokens.length).to.equal(2);
    });

    it("Should allow empty heirs and tokens for later addition", async function () {
      await cryptoHeir.connect(owner).setupInheritance(
        INACTIVITY_PERIOD,
        [],
        [],
        []
      );
      
      const config = await cryptoHeir.getUserConfig(owner.address);
      expect(config.isActive).to.be.true;
    });

    it("Should not allow duplicate setup", async function () {
      await cryptoHeir.connect(owner).setupInheritance(
        INACTIVITY_PERIOD,
        [],
        [],
        []
      );
      
      await expect(
        cryptoHeir.connect(owner).setupInheritance(INACTIVITY_PERIOD, [], [], [])
      ).to.be.revertedWith("Inheritance already active, deactivate first");
    });

    it("Should validate heir percentages", async function () {
      await expect(
        cryptoHeir.connect(owner).setupInheritance(
          INACTIVITY_PERIOD,
          [heir1.address, heir2.address],
          [60, 50], // 110% total
          []
        )
      ).to.be.revertedWith("Total percentage exceeds 100");
    });
  });

  describe("Token Management", function () {
    beforeEach(async function () {
      await cryptoHeir.connect(owner).setupInheritance(
        INACTIVITY_PERIOD,
        [heir1.address, heir2.address],
        [60, 40],
        []
      );
    });

    it("Should add tokens after setup", async function () {
      await cryptoHeir.connect(owner).addToken(await usdc.getAddress());
      
      const tokens = await cryptoHeir.getUserSelectedTokens(owner.address);
      expect(tokens.length).to.equal(1);
      expect(await cryptoHeir.isTokenSelected(owner.address, await usdc.getAddress())).to.be.true;
    });

    it("Should prevent duplicate token addition", async function () {
      await cryptoHeir.connect(owner).addToken(await usdc.getAddress());
      
      await expect(
        cryptoHeir.connect(owner).addToken(await usdc.getAddress())
      ).to.be.revertedWith("Token already selected");
    });

    it("Should remove unclaimed tokens", async function () {
      await cryptoHeir.connect(owner).addToken(await usdc.getAddress());
      await cryptoHeir.connect(owner).removeToken(await usdc.getAddress());
      
      expect(await cryptoHeir.isTokenSelected(owner.address, await usdc.getAddress())).to.be.false;
    });

    it("Should not allow removing claimed tokens", async function () {
      await cryptoHeir.connect(owner).addToken(await usdc.getAddress());
      await usdc.approve(await cryptoHeir.getAddress(), ethers.MaxUint256);
      await time.increase(INACTIVITY_PERIOD + 1);
      
      await cryptoHeir.connect(heir1).claimTokens(owner.address, await usdc.getAddress());
      
      await expect(
        cryptoHeir.connect(owner).removeToken(await usdc.getAddress())
      ).to.be.revertedWith("Token already claimed by someone");
    });
  });

  describe("Heir Management", function () {
    beforeEach(async function () {
      await cryptoHeir.connect(owner).setupInheritance(
        INACTIVITY_PERIOD,
        [],
        [],
        []
      );
    });

    it("Should update all heirs at once", async function () {
      // Start with empty heirs, then update to add heirs
      await cryptoHeir.connect(owner).updateAllHeirs(
        [heir1.address, heir2.address],
        [70, 30]
      );
      
      let heirs = await cryptoHeir.getUserHeirs(owner.address);
      expect(heirs.length).to.equal(2);
      expect(heirs[0].wallet).to.equal(heir1.address);
      expect(heirs[1].wallet).to.equal(heir2.address);
      
      // Update to different heirs
      await cryptoHeir.connect(owner).updateAllHeirs(
        [heir2.address, heir3.address],
        [60, 40]
      );
      
      heirs = await cryptoHeir.getUserHeirs(owner.address);
      expect(heirs.length).to.equal(2);
      expect(heirs[0].wallet).to.equal(heir2.address);
      expect(heirs[1].wallet).to.equal(heir3.address);
    });

    it("Should allow many heirs (no artificial limit)", async function () {
      // Create 20 random heirs
      const heirAddresses = [];
      const percentages = [];
      
      for (let i = 0; i < 20; i++) {
        const wallet = ethers.Wallet.createRandom();
        heirAddresses.push(wallet.address);
        percentages.push(5);
      }
      
      await cryptoHeir.connect(owner).updateAllHeirs(heirAddresses, percentages);
      
      const heirs = await cryptoHeir.getUserHeirs(owner.address);
      expect(heirs.length).to.equal(20);
    });
  });

  describe("Activity Management", function () {
    beforeEach(async function () {
      await cryptoHeir.connect(owner).setupInheritance(
        INACTIVITY_PERIOD,
        [heir1.address],
        [100],
        [await usdc.getAddress()]
      );
    });

    it("Should update activity timestamp", async function () {
      const initialConfig = await cryptoHeir.getUserConfig(owner.address);
      
      await time.increase(3600);
      await cryptoHeir.connect(owner).updateActivity();
      
      const updatedConfig = await cryptoHeir.getUserConfig(owner.address);
      expect(updatedConfig.lastActivity).to.be.gt(initialConfig.lastActivity);
    });

    it("Should handle pause and unpause", async function () {
      await time.increase(INACTIVITY_PERIOD / 2);
      
      await cryptoHeir.connect(owner).pauseInheritance();
      let config = await cryptoHeir.getUserConfig(owner.address);
      expect(config.isPaused).to.be.true;
      
      await time.increase(24 * 60 * 60); // 1 day
      
      await cryptoHeir.connect(owner).unpauseInheritance();
      config = await cryptoHeir.getUserConfig(owner.address);
      expect(config.isPaused).to.be.false;
      
      // Time should be RESET to full period (unpause resets timer)
      const timeUntil = await cryptoHeir.getTimeUntilInheritance(owner.address);
      expect(timeUntil).to.be.closeTo(INACTIVITY_PERIOD, 100);
    });

    it("Should allow deactivation", async function () {
      await cryptoHeir.connect(owner).deactivateInheritance();
      
      const config = await cryptoHeir.getUserConfig(owner.address);
      expect(config.isActive).to.be.false;
      
      await expect(
        cryptoHeir.connect(owner).updateActivity()
      ).to.be.revertedWith("Inheritance not set up or deactivated");
    });
  });

  describe("Token Claiming", function () {
    beforeEach(async function () {
      await cryptoHeir.connect(owner).setupInheritance(
        INACTIVITY_PERIOD,
        [heir1.address, heir2.address],
        [60, 40],
        [await usdc.getAddress()]
      );
      
      await usdc.approve(await cryptoHeir.getAddress(), ethers.MaxUint256);
      await time.increase(INACTIVITY_PERIOD + 1);
    });

    it("Should allow heirs to claim their shares", async function () {
      const ownerBalance = await usdc.balanceOf(owner.address);
      
      await cryptoHeir.connect(heir1).claimTokens(owner.address, await usdc.getAddress());
      
      const heir1Balance = await usdc.balanceOf(heir1.address);
      expect(heir1Balance).to.equal((ownerBalance * 60n) / 100n);
      
      expect(await cryptoHeir.hasHeirClaimedToken(owner.address, heir1.address, await usdc.getAddress())).to.be.true;
    });

    it("Should create snapshot on first claim", async function () {
      const ownerBalance = await usdc.balanceOf(owner.address);
      
      await cryptoHeir.connect(heir1).claimTokens(owner.address, await usdc.getAddress());
      
      const snapshot = await cryptoHeir.totalInheritancePool(owner.address, await usdc.getAddress());
      expect(snapshot).to.equal(ownerBalance);
    });

    it("Should prevent double claiming", async function () {
      await cryptoHeir.connect(heir1).claimTokens(owner.address, await usdc.getAddress());
      
      await expect(
        cryptoHeir.connect(heir1).claimTokens(owner.address, await usdc.getAddress())
      ).to.be.revertedWith("Already claimed this token");
    });

    it("Should only allow claiming selected tokens", async function () {
      await expect(
        cryptoHeir.connect(heir1).claimTokens(owner.address, await usdt.getAddress())
      ).to.be.revertedWith("Token not selected for inheritance");
    });

    it("Should require inheritance to be available", async function () {
      await cryptoHeir.connect(owner).updateActivity();
      
      await expect(
        cryptoHeir.connect(heir1).claimTokens(owner.address, await usdc.getAddress())
      ).to.be.revertedWith("Inheritance not yet available");
    });
  });

  describe("Graceful Failure Handling", function () {
    beforeEach(async function () {
      await cryptoHeir.connect(owner).setupInheritance(
        INACTIVITY_PERIOD,
        [heir1.address],
        [100],
        [await usdc.getAddress(), await badToken.getAddress()]
      );
      
      await usdc.approve(await cryptoHeir.getAddress(), ethers.MaxUint256);
      await badToken.approve(await cryptoHeir.getAddress(), ethers.MaxUint256);
      await time.increase(INACTIVITY_PERIOD + 1);
    });

    it("Should handle bad token failures gracefully", async function () {
      const result = await cryptoHeir.connect(heir1).claimTokens(owner.address, await badToken.getAddress());
      
      await expect(result)
        .to.emit(cryptoHeir, "TokenClaimFailed")
        .withArgs(owner.address, heir1.address, await badToken.getAddress(), "Transfer failed");
      
      expect(await cryptoHeir.hasHeirClaimedToken(owner.address, heir1.address, await badToken.getAddress())).to.be.false;
    });

    it("Should still allow claiming good tokens after bad token failure", async function () {
      await cryptoHeir.connect(heir1).claimTokens(owner.address, await badToken.getAddress());
      
      await cryptoHeir.connect(heir1).claimTokens(owner.address, await usdc.getAddress());
      
      expect(await cryptoHeir.hasHeirClaimedToken(owner.address, heir1.address, await usdc.getAddress())).to.be.true;
    });
  });

  describe("Auto-deletion", function () {
    beforeEach(async function () {
      await cryptoHeir.connect(owner).setupInheritance(
        INACTIVITY_PERIOD,
        [heir1.address, heir2.address],
        [60, 40],
        [await usdc.getAddress()]
      );
      
      await usdc.approve(await cryptoHeir.getAddress(), ethers.MaxUint256);
      await time.increase(INACTIVITY_PERIOD + 1);
    });

    it("Should NOT auto-delete when only some heirs claim", async function () {
      await cryptoHeir.connect(heir1).claimTokens(owner.address, await usdc.getAddress());
      
      const config = await cryptoHeir.getUserConfig(owner.address);
      expect(config.isActive).to.be.true;
    });

    it("Should auto-delete when ALL heirs claim ALL tokens", async function () {
      await cryptoHeir.connect(heir1).claimTokens(owner.address, await usdc.getAddress());
      
      const tx = await cryptoHeir.connect(heir2).claimTokens(owner.address, await usdc.getAddress());
      
      await expect(tx).to.emit(cryptoHeir, "InheritanceCompleted").withArgs(owner.address);
      
      const config = await cryptoHeir.getUserConfig(owner.address);
      expect(config.isActive).to.be.false;
      
      const heirs = await cryptoHeir.getUserHeirs(owner.address);
      expect(heirs.length).to.equal(0);
      
      const tokens = await cryptoHeir.getUserSelectedTokens(owner.address);
      expect(tokens.length).to.equal(0);
    });

    it("Should handle multiple tokens correctly", async function () {
      await cryptoHeir.connect(owner).addToken(await usdt.getAddress());
      await usdt.approve(await cryptoHeir.getAddress(), ethers.MaxUint256);
      
      // Both heirs claim first token
      await cryptoHeir.connect(heir1).claimTokens(owner.address, await usdc.getAddress());
      await cryptoHeir.connect(heir2).claimTokens(owner.address, await usdc.getAddress());
      
      // Still active (second token not claimed)
      let config = await cryptoHeir.getUserConfig(owner.address);
      expect(config.isActive).to.be.true;
      
      // Both heirs claim second token
      await cryptoHeir.connect(heir1).claimTokens(owner.address, await usdt.getAddress());
      const tx = await cryptoHeir.connect(heir2).claimTokens(owner.address, await usdt.getAddress());
      
      await expect(tx).to.emit(cryptoHeir, "InheritanceCompleted");
      
      config = await cryptoHeir.getUserConfig(owner.address);
      expect(config.isActive).to.be.false;
    });
  });


  describe("Multi-User Isolation", function () {
    it("Should maintain separate configurations for different users", async function () {
      await cryptoHeir.connect(owner).setupInheritance(
        INACTIVITY_PERIOD,
        [heir1.address],
        [100],
        [await usdc.getAddress()]
      );
      
      await cryptoHeir.connect(user2).setupInheritance(
        INACTIVITY_PERIOD * 2,
        [heir2.address],
        [100],
        [await usdt.getAddress()]
      );
      
      const ownerConfig = await cryptoHeir.getUserConfig(owner.address);
      const user2Config = await cryptoHeir.getUserConfig(user2.address);
      
      expect(ownerConfig.inactivityPeriod).to.equal(INACTIVITY_PERIOD);
      expect(user2Config.inactivityPeriod).to.equal(INACTIVITY_PERIOD * 2);
      
      const ownerTokens = await cryptoHeir.getUserSelectedTokens(owner.address);
      const user2Tokens = await cryptoHeir.getUserSelectedTokens(user2.address);
      
      expect(ownerTokens[0]).to.equal(await usdc.getAddress());
      expect(user2Tokens[0]).to.equal(await usdt.getAddress());
    });

    it("Should allow same heir for multiple users", async function () {
      await cryptoHeir.connect(owner).setupInheritance(
        INACTIVITY_PERIOD,
        [heir1.address],
        [100],
        []
      );
      
      await cryptoHeir.connect(user2).setupInheritance(
        INACTIVITY_PERIOD,
        [heir1.address],
        [100],
        []
      );
      
      await usdc.approve(await cryptoHeir.getAddress(), ethers.MaxUint256);
      await cryptoHeir.connect(owner).addToken(await usdc.getAddress());
      
      await usdc.connect(user2).getTestTokens();
      await usdc.connect(user2).approve(await cryptoHeir.getAddress(), ethers.MaxUint256);
      await cryptoHeir.connect(user2).addToken(await usdc.getAddress());
      
      await time.increase(INACTIVITY_PERIOD + 1);
      
      // Heir1 can claim from both users
      await cryptoHeir.connect(heir1).claimTokens(owner.address, await usdc.getAddress());
      await cryptoHeir.connect(heir1).claimTokens(user2.address, await usdc.getAddress());
      
      expect(await cryptoHeir.hasHeirClaimedToken(owner.address, heir1.address, await usdc.getAddress())).to.be.true;
      expect(await cryptoHeir.hasHeirClaimedToken(user2.address, heir1.address, await usdc.getAddress())).to.be.true;
    });
  });

  describe("Period Updates", function () {
    beforeEach(async function () {
      await cryptoHeir.connect(owner).setupInheritance(
        INACTIVITY_PERIOD,
        [],
        [],
        []
      );
    });

    it("Should update inactivity period", async function () {
      const newPeriod = 90 * 24 * 60 * 60;
      await cryptoHeir.connect(owner).updateInactivityPeriod(newPeriod);
      
      const config = await cryptoHeir.getUserConfig(owner.address);
      expect(config.inactivityPeriod).to.equal(newPeriod);
    });

    it("Should not allow zero periods", async function () {
      await expect(
        cryptoHeir.connect(owner).updateInactivityPeriod(0)
      ).to.be.revertedWith("Inactivity period must be greater than 0");
    });
  });

  describe("Deactivation and Reactivation", function () {
    beforeEach(async function () {
      await cryptoHeir.connect(owner).setupInheritance(
        INACTIVITY_PERIOD,
        [heir1.address],
        [100],
        [await usdc.getAddress()]
      );
    });

    it("Should allow complete deactivation and fresh setup", async function () {
      // First setup
      let config = await cryptoHeir.getUserConfig(owner.address);
      expect(config.isActive).to.be.true;
      
      let heirs = await cryptoHeir.getUserHeirs(owner.address);
      expect(heirs.length).to.equal(1);
      expect(heirs[0].wallet).to.equal(heir1.address);
      
      let tokens = await cryptoHeir.getUserSelectedTokens(owner.address);
      expect(tokens.length).to.equal(1);
      
      // Deactivate
      await cryptoHeir.connect(owner).deactivateInheritance();
      
      config = await cryptoHeir.getUserConfig(owner.address);
      expect(config.isActive).to.be.false;
      
      // Check everything is cleared
      heirs = await cryptoHeir.getUserHeirs(owner.address);
      expect(heirs.length).to.equal(0);
      
      tokens = await cryptoHeir.getUserSelectedTokens(owner.address);
      expect(tokens.length).to.equal(0);
      
      // Setup again with different configuration
      await cryptoHeir.connect(owner).setupInheritance(
        90 * 24 * 60 * 60, // Different period
        [heir2.address, heir1.address], // Different heirs and order
        [70, 30], // Different percentages
        [] // No tokens initially
      );
      
      // Verify new setup
      config = await cryptoHeir.getUserConfig(owner.address);
      expect(config.isActive).to.be.true;
      expect(config.inactivityPeriod).to.equal(90 * 24 * 60 * 60);
      
      heirs = await cryptoHeir.getUserHeirs(owner.address);
      expect(heirs.length).to.equal(2);
      expect(heirs[0].wallet).to.equal(heir2.address);
      expect(heirs[0].percentage).to.equal(70);
      expect(heirs[1].wallet).to.equal(heir1.address);
      expect(heirs[1].percentage).to.equal(30);
    });

    it("Should not allow setup without deactivation when active", async function () {
      // Try to setup again without deactivation
      await expect(
        cryptoHeir.connect(owner).setupInheritance(
          INACTIVITY_PERIOD,
          [heir2.address],
          [100],
          []
        )
      ).to.be.revertedWith("Inheritance already active, deactivate first");
    });

    it("Should clear all mappings on deactivation", async function () {
      const tokenAddress = await usdc.getAddress();
      
      // Check mappings are populated
      expect(await cryptoHeir.isUserHeir(owner.address, heir1.address)).to.be.true;
      expect(await cryptoHeir.isTokenSelected(owner.address, tokenAddress)).to.be.true;
      
      // Deactivate
      await cryptoHeir.connect(owner).deactivateInheritance();
      
      // Check mappings are cleared
      expect(await cryptoHeir.isUserHeir(owner.address, heir1.address)).to.be.false;
      expect(await cryptoHeir.isTokenSelected(owner.address, tokenAddress)).to.be.false;
    });

    it("Should handle multiple deactivation cycles", async function () {
      // Cycle 1
      await cryptoHeir.connect(owner).deactivateInheritance();
      
      // Cycle 2
      await cryptoHeir.connect(owner).setupInheritance(
        INACTIVITY_PERIOD,
        [heir2.address],
        [100],
        []
      );
      await cryptoHeir.connect(owner).deactivateInheritance();
      
      // Cycle 3
      await cryptoHeir.connect(owner).setupInheritance(
        INACTIVITY_PERIOD,
        [heir1.address, heir2.address],
        [50, 50],
        []
      );
      
      const heirs = await cryptoHeir.getUserHeirs(owner.address);
      expect(heirs.length).to.equal(2);
      expect(heirs[0].percentage).to.equal(50);
      expect(heirs[1].percentage).to.equal(50);
    });
  });

  describe("Advanced Pause/Unpause", function () {
    beforeEach(async function () {
      await cryptoHeir.connect(owner).setupInheritance(
        86400, // 1 day for easier testing
        [heir1.address],
        [100],
        []
      );
    });

    it("Should RESET timer completely when unpaused", async function () {
      // Move forward 23 hours (almost at inheritance)
      await time.increase(82800);
      
      // Only 1 hour left
      let timeUntil = await cryptoHeir.getTimeUntilInheritance(owner.address);
      expect(timeUntil).to.be.closeTo(3600, 100); // ~1 hour left
      
      // Pause
      await cryptoHeir.connect(owner).pauseInheritance();
      
      // Wait any amount of time
      await time.increase(7200); // 2 hours
      
      // Unpause - should RESET timer
      await cryptoHeir.connect(owner).unpauseInheritance();
      
      // Should have FULL 24 hours again, not 1 hour
      timeUntil = await cryptoHeir.getTimeUntilInheritance(owner.address);
      expect(timeUntil).to.be.closeTo(86400, 100); // Full 24 hours!
    });

    it("Should prevent inheritance even after long pause", async function () {
      // Move forward 30 days (way past 1 day period)
      await time.increase(2592000);
      
      // Would be claimable now
      expect(await cryptoHeir.isInheritanceAvailable(owner.address)).to.be.true;
      
      // Pause
      await cryptoHeir.connect(owner).pauseInheritance();
      
      // Wait another 30 days while paused
      await time.increase(2592000);
      
      // Unpause - timer resets!
      await cryptoHeir.connect(owner).unpauseInheritance();
      
      // Should NOT be available (timer reset)
      expect(await cryptoHeir.isInheritanceAvailable(owner.address)).to.be.false;
      
      // Need full period again
      const timeUntil = await cryptoHeir.getTimeUntilInheritance(owner.address);
      expect(timeUntil).to.be.closeTo(86400, 100);
    });

    it("Should make pause/unpause a powerful safety feature", async function () {
      // Scenario: Owner notices suspicious activity
      
      // Almost at inheritance period
      await time.increase(86300); // 23h 55m
      
      // Only 100 seconds left!
      let timeUntil = await cryptoHeir.getTimeUntilInheritance(owner.address);
      expect(timeUntil).to.be.closeTo(100, 10);
      
      // PANIC! Pause immediately
      await cryptoHeir.connect(owner).pauseInheritance();
      
      // Investigate for a few hours...
      await time.increase(7200);
      
      // All clear, unpause
      await cryptoHeir.connect(owner).unpauseInheritance();
      
      // Phew! Full 24 hours again
      timeUntil = await cryptoHeir.getTimeUntilInheritance(owner.address);
      expect(timeUntil).to.be.closeTo(86400, 100);
    });
  });
});
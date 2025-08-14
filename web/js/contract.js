// Contract interaction manager
class ContractManager {
    constructor() {
        this.contract = null;
        this.signer = null;
        this.contractAddress = null;
    }
    
    async setSigner(signer) {
        this.signer = signer;
        await this.initContract();
    }
    
    async initContract() {
        
        if (!this.signer) {
            return;
        }
        
        // Get chain ID from signer if wallet manager doesn't have it yet
        let chainId = walletManager.chainId;
        
        if (!chainId && this.signer.provider) {
            try {
                const network = await this.signer.provider.getNetwork();
                chainId = network.chainId;
            } catch (error) {
                return;
            }
        }
        
        if (!chainId) {
            return;
        }
        
        // Get contract address for this chain
        const addresses = {
            1: CONTRACT_ADDRESSES.MAINNET,
            11155111: CONTRACT_ADDRESSES.SEPOLIA
        };
        
        this.contractAddress = addresses[chainId];
        
        if (!this.contractAddress || this.contractAddress === '0x0000000000000000000000000000000000000000') {
            UI.showToast(`Contract not deployed on this network (Chain ID: ${chainId})`, 'error');
            return;
        }
        
        this.contract = new ethers.Contract(this.contractAddress, CRYPTOHEIR_ABI, this.signer);
    }
    
    // Manual contract initialization check
    async ensureContract() {
        if (!this.contract && this.signer) {
            await this.initContract();
        }
        
        return !!this.contract;
    }
    
    // Setup inheritance
    async setupInheritance(inactivityPeriodSeconds, heirs, percentages, tokens) {
        // Try to ensure contract is initialized
        if (!(await this.ensureContract())) {
            throw new Error('Contract not initialized - please make sure you are connected to the correct network');
        }
        
        try {
            UI.showLoading(true);
            const tx = await this.contract.setupInheritance(
                inactivityPeriodSeconds,
                heirs,
                percentages,
                tokens
            );
            
            UI.showToast('Transaction sent. Waiting for confirmation...', 'info');
            const receipt = await tx.wait();
            
            // Verify the setup worked by checking the config immediately
            const verifyConfig = await this.getUserConfig(walletManager.address);
            
            UI.showToast('Inheritance setup successful!', 'success');
            return true;
            
        } catch (error) {
            UI.showToast('Setup failed: ' + this.parseError(error), 'error');
            return false;
        } finally {
            UI.showLoading(false);
        }
    }
    
    // Update activity
    async updateActivity() {
        if (!this.contract) throw new Error('Contract not initialized');
        
        try {
            UI.showLoading(true);
            const tx = await this.contract.updateActivity();
            
            UI.showToast('Updating activity...', 'info');
            await tx.wait();
            
            UI.showToast('Activity updated successfully!', 'success');
            return true;
            
        } catch (error) {
            UI.showToast('Update failed: ' + this.parseError(error), 'error');
            return false;
        } finally {
            UI.showLoading(false);
        }
    }
    
    // Add token
    async addToken(tokenAddress) {
        if (!this.contract) throw new Error('Contract not initialized');
        
        try {
            UI.showLoading(true);
            const tx = await this.contract.addToken(tokenAddress);
            
            UI.showToast('Adding token...', 'info');
            await tx.wait();
            
            UI.showToast('Token added successfully!', 'success');
            return true;
            
        } catch (error) {
            UI.showToast('Add token failed: ' + this.parseError(error), 'error');
            return false;
        } finally {
            UI.showLoading(false);
        }
    }
    
    // Remove token
    async removeToken(tokenAddress) {
        if (!this.contract) throw new Error('Contract not initialized');
        
        try {
            UI.showLoading(true);
            const tx = await this.contract.removeToken(tokenAddress);
            
            UI.showToast('Removing token...', 'info');
            await tx.wait();
            
            UI.showToast('Token removed successfully!', 'success');
            return true;
            
        } catch (error) {
            UI.showToast('Remove token failed: ' + this.parseError(error), 'error');
            return false;
        } finally {
            UI.showLoading(false);
        }
    }
    
    // Update all heirs
    async updateAllHeirs(heirs, percentages) {
        if (!this.contract) throw new Error('Contract not initialized');
        
        try {
            UI.showLoading(true);
            const tx = await this.contract.updateAllHeirs(heirs, percentages);
            
            UI.showToast('Updating heirs...', 'info');
            await tx.wait();
            
            UI.showToast('Heirs updated successfully!', 'success');
            return true;
            
        } catch (error) {
            UI.showToast('Update heirs failed: ' + this.parseError(error), 'error');
            return false;
        } finally {
            UI.showLoading(false);
        }
    }
    
    // Pause inheritance
    async pauseInheritance() {
        if (!this.contract) throw new Error('Contract not initialized');
        
        try {
            UI.showLoading(true);
            const tx = await this.contract.pauseInheritance();
            
            UI.showToast('Pausing inheritance...', 'info');
            await tx.wait();
            
            UI.showToast('Inheritance paused successfully!', 'success');
            return true;
            
        } catch (error) {
            UI.showToast('Pause failed: ' + this.parseError(error), 'error');
            return false;
        } finally {
            UI.showLoading(false);
        }
    }
    
    // Unpause inheritance
    async unpauseInheritance() {
        if (!this.contract) throw new Error('Contract not initialized');
        
        try {
            UI.showLoading(true);
            const tx = await this.contract.unpauseInheritance();
            
            UI.showToast('Unpausing inheritance...', 'info');
            await tx.wait();
            
            UI.showToast('Inheritance unpaused successfully!', 'success');
            return true;
            
        } catch (error) {
            UI.showToast('Unpause failed: ' + this.parseError(error), 'error');
            return false;
        } finally {
            UI.showLoading(false);
        }
    }
    
    // Deactivate inheritance
    async deactivateInheritance() {
        if (!this.contract) throw new Error('Contract not initialized');
        
        try {
            UI.showLoading(true);
            const tx = await this.contract.deactivateInheritance();
            
            UI.showToast('Deactivating inheritance...', 'info');
            await tx.wait();
            
            UI.showToast('Inheritance deactivated successfully!', 'success');
            return true;
            
        } catch (error) {
            UI.showToast('Deactivate failed: ' + this.parseError(error), 'error');
            return false;
        } finally {
            UI.showLoading(false);
        }
    }
    
    // Claim tokens
    async claimTokens(userAddress, tokenAddress) {
        if (!this.contract) throw new Error('Contract not initialized');
        
        try {
            UI.showLoading(true);
            
            // Pre-claim checks
            
            // Check if inheritance is available
            const isAvailable = await this.contract.isInheritanceAvailable(userAddress);
            
            // Check if claimer is an heir
            const userHeirs = await this.contract.getUserHeirs(userAddress);
            const isHeir = userHeirs.some(heir => heir.wallet.toLowerCase() === walletManager.address.toLowerCase());
            
            // Check if token is selected
            const selectedTokens = await this.contract.getUserSelectedTokens(userAddress);
            const isTokenSelected = selectedTokens.includes(tokenAddress);
            
            // Check if already claimed
            const alreadyClaimed = await this.contract.hasHeirClaimedToken(userAddress, walletManager.address, tokenAddress);
            
            // Check token details
            const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.signer);
            const userBalance = await tokenContract.balanceOf(userAddress);
            const allowance = await tokenContract.allowance(userAddress, this.contractAddress);
            const symbol = await tokenContract.symbol().catch(() => 'Unknown');
            
            // Check claimer's balance before
            const claimerBalanceBefore = await tokenContract.balanceOf(walletManager.address);
            
            if (!isAvailable) {
                throw new Error('Inheritance is not yet available');
            }
            if (!isHeir) {
                throw new Error('You are not an heir of this user');
            }
            if (!isTokenSelected) {
                throw new Error('This token is not selected for inheritance');
            }
            if (alreadyClaimed) {
                throw new Error('You have already claimed this token');
            }
            if (userBalance.eq(0)) {
                throw new Error('User has no tokens to inherit');
            }
            if (allowance.eq(0)) {
                throw new Error('Token owner needs to approve the CryptoHeir contract first');
            }
            
            const tx = await this.contract.claimTokens(userAddress, tokenAddress);
            
            UI.showToast('Claiming tokens...', 'info');
            const receipt = await tx.wait();
            
            // Check claimer's balance after
            const claimerBalanceAfter = await tokenContract.balanceOf(walletManager.address);
            const actualReceived = claimerBalanceAfter.sub(claimerBalanceBefore);
            
            // Check for events to determine success
            const claimedEvent = receipt.events?.find(e => e.event === 'TokenInherited');
            const failedEvent = receipt.events?.find(e => e.event === 'TokenClaimFailed');
            
            
            if (claimedEvent) {
                const amount = ethers.utils.formatUnits(claimedEvent.args.amount, 18);
                UI.showToast(`Tokens claimed successfully! Amount: ${amount}`, 'success');
            } else if (failedEvent) {
                UI.showToast(`Claim failed: ${failedEvent.args.reason}`, 'error');
            } else {
                if (actualReceived.gt(0)) {
                    UI.showToast(`Tokens received! Amount: ${ethers.utils.formatEther(actualReceived)}`, 'success');
                } else {
                    UI.showToast('Transaction completed but no tokens received - check contract state', 'warning');
                }
            }
            
            return true;
            
        } catch (error) {
            
            let errorMessage = this.parseError(error);
            
            // Handle common errors with better messages
            if (error.message?.includes('insufficient allowance') || error.message?.includes('ERC20: transfer amount exceeds allowance')) {
                errorMessage = 'Token owner needs to approve the CryptoHeir contract first';
            } else if (error.message?.includes('Already claimed')) {
                errorMessage = 'You have already claimed this token';
            } else if (error.message?.includes('Not an heir')) {
                errorMessage = 'You are not an heir of this user';
            } else if (error.message?.includes('Inheritance not yet available')) {
                errorMessage = 'Inheritance period has not expired yet';
            } else if (error.message?.includes('User has no tokens')) {
                errorMessage = 'User has no tokens to inherit';
            } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
                errorMessage = 'Transaction would fail - check if inheritance is available and you are an heir';
            }
            
            UI.showToast('Claim failed: ' + errorMessage, 'error');
            return false;
        } finally {
            UI.showLoading(false);
        }
    }
    
    // View functions
    async getUserConfig(userAddress) {
        if (!this.contract) {
            return null;
        }
        
        try {
            const config = await this.contract.getUserConfig(userAddress);
            
            // Ensure we return a properly structured config object
            if (!config) {
                return null;
            }
            
            // Convert BigNumber values to regular numbers/strings for easier handling
            const processedConfig = {
                inactivityPeriod: config.inactivityPeriod ? config.inactivityPeriod.toNumber() : 0,
                lastActivity: config.lastActivity ? config.lastActivity.toNumber() : 0,
                isActive: Boolean(config.isActive),
                isPaused: Boolean(config.isPaused),
                pausedAt: config.pausedAt ? config.pausedAt.toNumber() : 0
            };
            
            return processedConfig;
        } catch (error) {
            
            // If it's a network error, try to reinitialize contract once
            if (error.code === 'NETWORK_ERROR' || error.message?.includes('network')) {
                try {
                    await this.initContract();
                    if (this.contract) {
                        const config = await this.contract.getUserConfig(userAddress);
                        const processedConfig = {
                            inactivityPeriod: config.inactivityPeriod ? config.inactivityPeriod.toNumber() : 0,
                            lastActivity: config.lastActivity ? config.lastActivity.toNumber() : 0,
                            isActive: Boolean(config.isActive),
                            isPaused: Boolean(config.isPaused),
                            pausedAt: config.pausedAt ? config.pausedAt.toNumber() : 0
                        };
                        return processedConfig;
                    }
                } catch (retryError) {
                }
            }
            
            return null;
        }
    }
    
    async getUserHeirs(userAddress) {
        if (!this.contract) return [];
        
        try {
            return await this.contract.getUserHeirs(userAddress);
        } catch (error) {
            return [];
        }
    }
    
    async getUserSelectedTokens(userAddress) {
        if (!this.contract) return [];
        
        try {
            return await this.contract.getUserSelectedTokens(userAddress);
        } catch (error) {
            return [];
        }
    }
    
    async isInheritanceAvailable(userAddress) {
        if (!this.contract) return false;
        
        try {
            return await this.contract.isInheritanceAvailable(userAddress);
        } catch (error) {
            return false;
        }
    }
    
    async getTimeUntilInheritance(userAddress) {
        if (!this.contract) return 0;
        
        try {
            const time = await this.contract.getTimeUntilInheritance(userAddress);
            return time.toNumber();
        } catch (error) {
            return 0;
        }
    }
    
    async hasHeirClaimedToken(userAddress, heirAddress, tokenAddress) {
        if (!this.contract) return false;
        
        try {
            return await this.contract.hasHeirClaimedToken(userAddress, heirAddress, tokenAddress);
        } catch (error) {
            return false;
        }
    }
    
    // Token utility functions
    async getTokenInfo(tokenAddress) {
        if (!this.signer) return null;
        
        try {
            const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.signer);
            
            const [symbol, decimals, balance] = await Promise.all([
                tokenContract.symbol().catch(() => 'Unknown'),
                tokenContract.decimals().catch(() => 18),
                tokenContract.balanceOf(walletManager.address).catch(() => '0')
            ]);
            
            return { symbol, decimals, balance };
        } catch (error) {
            return null;
        }
    }
    
    async approveToken(tokenAddress, spenderAddress, amount) {
        
        if (!this.signer) throw new Error('No signer available');
        
        try {
            const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.signer);
            
            // Check current allowance before approval
            const currentAllowance = await tokenContract.allowance(walletManager.address, spenderAddress);
            
            UI.showLoading(true);
            const tx = await tokenContract.approve(spenderAddress, amount);
            
            UI.showToast('Approving token...', 'info');
            const receipt = await tx.wait();
            
            // Check allowance after approval
            const newAllowance = await tokenContract.allowance(walletManager.address, spenderAddress);
            
            const approvalSuccessful = newAllowance.gt(0);
            
            if (approvalSuccessful) {
                UI.showToast('Token approved successfully!', 'success');
                return true;
            } else {
                UI.showToast('Token approval transaction succeeded but allowance not set', 'error');
                return false;
            }
            
        } catch (error) {
            UI.showToast('Token approval failed: ' + this.parseError(error), 'error');
            return false;
        } finally {
            UI.showLoading(false);
        }
    }
    
    // Error parsing
    parseError(error) {
        if (error.reason) return error.reason;
        if (error.message) {
            // Extract revert reason from message
            const match = error.message.match(/revert (.+)/);
            if (match) return match[1];
            return error.message;
        }
        return 'Unknown error';
    }
}

// Initialize contract manager
const contractManager = new ContractManager();
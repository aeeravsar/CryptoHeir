// UI utility functions and components
class UI {
    static showToast(message, type = 'info', duration = 5000) {
        const container = document.getElementById('toastContainer');
        
        const toast = document.createElement('div');
        toast.className = `crypto-toast crypto-toast--${type}`;
        
        // Create clean structure with proper positioning
        toast.innerHTML = `
            <div class="crypto-toast__icon">
                ${this.getToastIcon(type)}
            </div>
            <div class="crypto-toast__message">
                ${message}
            </div>
            <button class="crypto-toast__close" title="Close notification">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
            </button>
        `;
        
        container.appendChild(toast);
        
        // Show toast with animation
        requestAnimationFrame(() => {
            toast.classList.add('crypto-toast--show');
        });
        
        // Auto remove
        const removeToast = () => {
            toast.classList.remove('crypto-toast--show');
            setTimeout(() => {
                if (container.contains(toast)) {
                    container.removeChild(toast);
                }
            }, 300);
        };
        
        const timeoutId = setTimeout(removeToast, duration);
        
        // Manual close
        toast.querySelector('.crypto-toast__close').addEventListener('click', () => {
            clearTimeout(timeoutId);
            removeToast();
        });
    }
    
    static getToastIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }
    
    static showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (show) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }
    
    static formatAddress(address) {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
    
    static getEtherscanUrl(address, chainId = null) {
        const currentChainId = chainId || walletManager.chainId || 1;
        const baseUrls = {
            1: 'https://etherscan.io',
            11155111: 'https://sepolia.etherscan.io'
        };
        const baseUrl = baseUrls[currentChainId] || 'https://etherscan.io';
        return `${baseUrl}/address/${address}`;
    }
    
    static openEtherscan(address, chainId = null) {
        const url = this.getEtherscanUrl(address, chainId);
        window.open(url, '_blank');
    }
    
    static formatAddressWithLink(address, chainId = null, className = '') {
        if (!address) return '';
        const formattedAddress = this.formatAddress(address);
        return `<span class="etherscan-link ${className}" onclick="UI.openEtherscan('${address}', ${chainId})" title="View on Etherscan">${formattedAddress}</span>`;
    }
    
    static formatTime(seconds) {
        if (seconds === 0) return 'Available now';
        if (seconds >= Number.MAX_SAFE_INTEGER) return 'Never (paused)';
        
        const days = Math.floor(seconds / (24 * 60 * 60));
        const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
        const minutes = Math.floor((seconds % (60 * 60)) / 60);
        
        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }
    
    static convertTimeToSeconds(value, unit) {
        const conversions = {
            minutes: 60,
            hours: 60 * 60,
            days: 24 * 60 * 60,
            weeks: 7 * 24 * 60 * 60,
            months: 30 * 24 * 60 * 60, // Approximate
            years: 365 * 24 * 60 * 60  // Approximate
        };
        
        return value * (conversions[unit] || conversions.days);
    }
    
    static formatTimeFromSeconds(seconds) {
        if (seconds === 0) return { value: 0, unit: 'minutes' };
        
        const units = [
            { name: 'years', seconds: 365 * 24 * 60 * 60 },
            { name: 'months', seconds: 30 * 24 * 60 * 60 },
            { name: 'weeks', seconds: 7 * 24 * 60 * 60 },
            { name: 'days', seconds: 24 * 60 * 60 },
            { name: 'hours', seconds: 60 * 60 },
            { name: 'minutes', seconds: 60 }
        ];
        
        for (const unit of units) {
            if (seconds >= unit.seconds && seconds % unit.seconds === 0) {
                return {
                    value: seconds / unit.seconds,
                    unit: unit.name
                };
            }
        }
        
        // Default to days if no exact match
        return {
            value: Math.round(seconds / (24 * 60 * 60)),
            unit: 'days'
        };
    }
    
    static formatTimestamp(timestamp) {
        const date = new Date(timestamp * 1000);
        return date.toLocaleString();
    }
    
    static isValidAddress(address) {
        return ethers.utils.isAddress(address);
    }
    
    static async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Copied to clipboard!', 'success', 2000);
        } catch (error) {
            this.showToast('Failed to copy to clipboard', 'error');
        }
    }
    
    static confirmAction(message) {
        return window.confirm(message);
    }
    
    static updatePercentageTotal() {
        const percentageInputs = document.querySelectorAll('.heir-percentage');
        let total = 0;
        
        percentageInputs.forEach(input => {
            const value = parseInt(input.value) || 0;
            total += value;
        });
        
        const totalElement = document.getElementById('totalPercentage');
        if (totalElement) {
            const textElement = totalElement.querySelector('span') || totalElement;
            textElement.textContent = `Total: ${total}%`;
            
            // Update color based on total
            if (total === 100) {
                textElement.className = 'text-sm font-medium text-green-400';
            } else if (total > 100) {
                textElement.className = 'text-sm font-medium text-red-400';
            } else {
                textElement.className = 'text-sm font-medium text-dark-600';
            }
        }
        
        return total;
    }
    
    static addHeirEntry() {
        const container = document.getElementById('heirsContainer');
        const heirEntry = document.createElement('div');
        heirEntry.className = 'heir-entry grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-dark-200 rounded-xl border border-dark-300 mb-3';
        heirEntry.innerHTML = `
            <input type="text" placeholder="Heir address (0x...)" class="heir-address form-input md:col-span-8" required>
            <input type="number" placeholder="%" min="1" max="100" class="heir-percentage form-input md:col-span-2" required>
            <button type="button" class="btn-danger md:col-span-2 remove-heir">Remove</button>
        `;
        
        container.appendChild(heirEntry);
        
        // Add event listeners
        heirEntry.querySelector('.heir-percentage').addEventListener('input', UI.updatePercentageTotal);
        heirEntry.querySelector('.remove-heir').addEventListener('click', function() {
            container.removeChild(heirEntry);
            UI.updatePercentageTotal();
        });
    }
    
    static addTokenEntry() {
        const container = document.getElementById('tokensContainer');
        const tokenEntry = document.createElement('div');
        tokenEntry.className = 'token-entry grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-dark-200 rounded-xl border border-dark-300 mb-3';
        tokenEntry.innerHTML = `
            <input type="text" placeholder="Token address (0x...)" class="token-address form-input md:col-span-10">
            <button type="button" class="btn-danger md:col-span-2 remove-token">Remove</button>
        `;
        
        container.appendChild(tokenEntry);
        
        // Add event listener
        tokenEntry.querySelector('.remove-token').addEventListener('click', function() {
            container.removeChild(tokenEntry);
        });
    }
    
    static getHeirsFromForm() {
        const heirEntries = document.querySelectorAll('.heir-entry');
        const heirs = [];
        const percentages = [];
        
        heirEntries.forEach(entry => {
            const address = entry.querySelector('.heir-address').value.trim();
            const percentage = parseInt(entry.querySelector('.heir-percentage').value) || 0;
            
            if (address && percentage > 0) {
                heirs.push(address);
                percentages.push(percentage);
            }
        });
        
        return { heirs, percentages };
    }
    
    static getTokensFromForm() {
        const tokenEntries = document.querySelectorAll('.token-entry');
        const tokens = [];
        
        tokenEntries.forEach(entry => {
            const address = entry.querySelector('.token-address').value.trim();
            if (address && this.isValidAddress(address)) {
                tokens.push(address);
            }
        });
        
        return tokens;
    }
    
    static clearHeirsForm() {
        const container = document.getElementById('heirsContainer');
        container.innerHTML = `
            <div class="heir-entry grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-dark-200 rounded-xl border border-dark-300">
                <input type="text" placeholder="Heir address (0x...)" class="heir-address form-input md:col-span-8" required>
                <input type="number" placeholder="%" min="1" max="100" class="heir-percentage form-input md:col-span-2" required>
                <button type="button" class="btn-danger md:col-span-2 remove-heir">Remove</button>
            </div>
        `;
        
        // Re-add event listeners
        const entry = container.querySelector('.heir-entry');
        entry.querySelector('.heir-percentage').addEventListener('input', UI.updatePercentageTotal);
        entry.querySelector('.remove-heir').addEventListener('click', function() {
            if (container.children.length > 1) {
                container.removeChild(entry);
                UI.updatePercentageTotal();
            }
        });
        
        UI.updatePercentageTotal();
    }
    
    static clearTokensForm() {
        const container = document.getElementById('tokensContainer');
        container.innerHTML = `
            <div class="token-entry grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-dark-200 rounded-xl border border-dark-300">
                <input type="text" placeholder="Token address (0x...)" class="token-address form-input md:col-span-10">
                <button type="button" class="btn-danger md:col-span-2 remove-token">Remove</button>
            </div>
        `;
        
        // Re-add event listeners
        const entry = container.querySelector('.token-entry');
        entry.querySelector('.remove-token').addEventListener('click', function() {
            if (container.children.length > 1) {
                container.removeChild(entry);
            }
        });
    }
    
    static displayHeirs(heirs) {
        const container = document.getElementById('currentHeirs');
        
        if (!heirs || heirs.length === 0) {
            container.innerHTML = '<div class="text-center py-8"><div class="text-4xl mb-2">👥</div><p class="text-dark-500">No heirs configured</p></div>';
            return;
        }
        
        const heirsList = heirs.map(heir => `
            <div class="flex items-center justify-between p-4 bg-dark-100 rounded-lg border border-dark-300 mb-3">
                <div class="flex items-center space-x-4">
                    <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        👤
                    </div>
                    <div>
                        <div class="font-mono text-sm text-dark-700">${this.formatAddressWithLink(heir.wallet)}</div>
                    </div>
                </div>
                <div class="flex items-center space-x-3">
                    <div class="text-lg font-bold text-primary-400">${heir.percentage}%</div>
                    <button class="btn-secondary text-xs px-3 py-1" onclick="UI.copyToClipboard('${heir.wallet}')">
                        📋 Copy
                    </button>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = heirsList;
    }
    
    static displayTokens(tokens) {
        const container = document.getElementById('currentTokens');
        
        if (!tokens || tokens.length === 0) {
            container.innerHTML = '<div class="text-center py-8"><div class="text-4xl mb-2">🪙</div><p class="text-dark-500">No tokens selected</p></div>';
            return;
        }
        
        // Display tokens and fetch names with improved method
        const tokensList = tokens.map((token, index) => {
            const displayId = `token-display-${index}`;
            
            // Start fetching token info asynchronously with improved method
            this.fetchTokenInfoSafely(token, displayId);
            
            return `
                <div class="flex items-center justify-between p-4 bg-dark-100 rounded-lg border border-dark-300 mb-3">
                    <div class="flex items-center space-x-4">
                        <div class="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            🪙
                        </div>
                        <div>
                            <div class="font-semibold text-dark-800" id="${displayId}">TOKEN</div>
                            <div class="font-mono text-xs text-dark-500">${this.formatAddressWithLink(token, null, 'text-xs')}</div>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button class="btn-secondary text-xs px-3 py-1" onclick="UI.copyToClipboard('${token}')">
                            📋 Copy
                        </button>
                        <button class="btn-danger text-xs px-3 py-1" onclick="removeToken('${token}')">
                            🗑️ Remove
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = tokensList;
    }
    
    static fetchedTokens = new Set();
    static tokenFetchQueue = [];
    static isProcessingQueue = false;
    static lastFetchTime = 0;
    static FETCH_DELAY = 1000; // 1 second between fetches
    
    static clearTokenCache() {
        this.fetchedTokens.clear();
        this.tokenFetchQueue = [];
    }
    
    static async fetchTokenInfoSafely(tokenAddress, displayId) {
        // Prevent duplicate fetches
        const lowerAddress = tokenAddress.toLowerCase();
        if (this.fetchedTokens.has(lowerAddress)) {
            return;
        }
        
        // Add to queue instead of processing immediately
        this.tokenFetchQueue.push({ tokenAddress, displayId, lowerAddress });
        this.fetchedTokens.add(lowerAddress);
        
        // Start processing queue if not already processing
        if (!this.isProcessingQueue) {
            this.processTokenFetchQueue();
        }
    }
    
    static async processTokenFetchQueue() {
        if (this.isProcessingQueue || this.tokenFetchQueue.length === 0) {
            return;
        }
        
        this.isProcessingQueue = true;
        
        while (this.tokenFetchQueue.length > 0) {
            const { tokenAddress, displayId } = this.tokenFetchQueue.shift();
            
            // Rate limiting - wait between requests
            const now = Date.now();
            const timeSinceLastFetch = now - this.lastFetchTime;
            if (timeSinceLastFetch < this.FETCH_DELAY) {
                await new Promise(resolve => setTimeout(resolve, this.FETCH_DELAY - timeSinceLastFetch));
            }
            this.lastFetchTime = Date.now();
            
            try {
                // Try to get token symbol with rate limiting
                let symbol = await this.tryTokenFetch(tokenAddress);
                
                // Update display if we got a valid symbol
                const element = document.getElementById(displayId);
                if (element && symbol && symbol !== 'TOKEN') {
                    element.textContent = symbol;
                }
                
            } catch (error) {
                // Silent failure - circuit breaker triggered, stop processing
                if (error.message?.includes('circuit breaker') || error.code === -32603) {
                    this.tokenFetchQueue = []; // Clear queue
                    break;
                }
            }
        }
        
        this.isProcessingQueue = false;
    }
    
    static async tryTokenFetch(tokenAddress) {
        try {
            // Use the server's token metadata endpoint (powered by Alchemy)
            const response = await fetch('/api/token-metadata', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    address: tokenAddress,
                    chainId: walletManager.chainId || 1
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.symbol && data.symbol !== 'TOKEN') {
                    return data.symbol;
                }
            }
        } catch (error) {
        }
        
        // Return fallback
        return 'TOKEN';
    }
    
    
    
    static async displayClaimableTokens(userAddress, tokens, isHeir, isAvailable) {
        const container = document.getElementById('tokensClaimList');
        
        if (!tokens || tokens.length === 0) {
            container.innerHTML = '<p class="no-data">No tokens available for inheritance</p>';
            return;
        }
        
        if (!isHeir) {
            container.innerHTML = '<p class="no-data">You are not an heir of this user</p>';
            return;
        }
        
        if (!isAvailable) {
            container.innerHTML = '<p class="no-data">Inheritance not yet available</p>';
            return;
        }
        
        // Show loading state first
        container.innerHTML = '<p class="loading">Loading token information...</p>';
        
        // Get heir information to calculate shares
        const userHeirs = await contractManager.getUserHeirs(userAddress);
        const currentHeir = userHeirs.find(heir => 
            heir.wallet.toLowerCase() === walletManager.address.toLowerCase()
        );
        const heirPercentage = currentHeir ? currentHeir.percentage : 0;
        
        // Build tokens list with detailed claim information
        const tokensList = await Promise.all(tokens.map(async (token) => {
            const info = await contractManager.getTokenInfo(token);
            const alreadyClaimed = await contractManager.hasHeirClaimedToken(userAddress, walletManager.address, token);
            const ownerBalance = await this.getUserTokenBalance(userAddress, token);
            
            const claimId = `claim-${token.replace(/[^a-zA-Z0-9]/g, '')}`;
            const symbolText = info?.symbol || 'Unknown';
            const decimals = info?.decimals || 18;
            
            // Calculate claimable amount based on heir percentage
            const totalBalance = parseFloat(ownerBalance);
            const claimableAmount = totalBalance * (heirPercentage / 100);
            
            let buttonContent;
            let buttonClass;
            let buttonDisabled = '';
            let claimStatusText = '';
            
            if (alreadyClaimed) {
                buttonContent = '✓ Claimed';
                buttonClass = 'btn btn-success';
                buttonDisabled = 'disabled';
                claimStatusText = 'Successfully claimed by you';
            } else if (totalBalance === 0) {
                buttonContent = 'No Balance';
                buttonClass = 'btn btn-secondary';
                buttonDisabled = 'disabled';
                claimStatusText = 'Owner has no tokens';
            } else if (heirPercentage === 0) {
                buttonContent = 'No Share';
                buttonClass = 'btn btn-secondary';
                buttonDisabled = 'disabled';
                claimStatusText = 'You have 0% inheritance share';
            } else {
                buttonContent = `Claim ${claimableAmount.toFixed(2)} ${symbolText}`;
                buttonClass = 'btn btn-primary claim-btn';
                claimStatusText = `Ready to claim ${heirPercentage}% share`;
            }
            
            return `
                <div class="bg-dark-100 rounded-xl p-6 border border-dark-300 mb-4 ${alreadyClaimed ? 'border-green-500 bg-green-950' : ''} transition-all duration-200 hover:shadow-lg">
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center space-x-3">
                            <div class="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                                🪙
                            </div>
                            <div>
                                <div class="text-lg font-semibold text-dark-800">${symbolText}</div>
                                <div class="text-sm text-dark-500 font-mono">${this.formatAddress(token)}</div>
                            </div>
                        </div>
                        <div class="px-3 py-1 rounded-full text-xs font-medium ${alreadyClaimed ? 'bg-green-500 text-white' : totalBalance === 0 ? 'bg-gray-500 text-white' : 'bg-blue-500 text-white'}">
                            ${claimStatusText}
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div class="bg-dark-200 rounded-lg p-3 border border-dark-400">
                            <div class="text-xs text-dark-500 mb-1">Owner's Balance</div>
                            <div class="text-sm font-semibold text-dark-800">${totalBalance.toFixed(2)} ${symbolText}</div>
                        </div>
                        <div class="bg-dark-200 rounded-lg p-3 border border-dark-400">
                            <div class="text-xs text-dark-500 mb-1">Status</div>
                            <div class="text-sm font-semibold ${alreadyClaimed ? 'text-green-400' : isAvailable ? 'text-blue-400' : 'text-yellow-400'}">
                                ${alreadyClaimed ? '✓ Claimed' : isAvailable ? '✅ Available' : '🔒 Waiting'}
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex flex-wrap gap-2">
                        <button class="${buttonClass}" 
                                onclick="claimToken('${userAddress}', '${token}')" 
                                id="${claimId}"
                                ${buttonDisabled}
                                title="${claimStatusText}">
                            ${buttonContent}
                        </button>
                        <button class="btn-secondary text-sm" onclick="UI.copyToClipboard('${token}')" title="Copy token address">
                            📋 Copy
                        </button>
                    </div>
                </div>
            `;
        }));
        
        container.innerHTML = tokensList.join('');
    }
    
    static async getUserTokenBalance(userAddress, tokenAddress) {
        try {
            const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, contractManager.signer);
            const balance = await tokenContract.balanceOf(userAddress);
            return ethers.utils.formatEther(balance);
        } catch (error) {
            return '0';
        }
    }
    
    static showTokenDetails(tokenAddress, symbol, totalBalance, heirPercentage) {
        const claimableAmount = totalBalance * (heirPercentage / 100);
        
        const details = `
Token Details for ${symbol}

📍 Contract Address: ${tokenAddress}
💰 Owner's Total Balance: ${totalBalance.toFixed(4)} ${symbol}
🎯 Your Inheritance Share: ${heirPercentage}%
💎 Your Claimable Amount: ${claimableAmount.toFixed(4)} ${symbol}

Note: Actual amounts may vary based on transaction fees and contract execution.
        `;
        
        alert(details);
    }
}

// Global UI helper functions
window.removeToken = async function(tokenAddress) {
    if (UI.confirmAction('Are you sure you want to remove this token?')) {
        try {
            await contractManager.removeToken(tokenAddress);
            // Refresh the manage tab
            if (typeof refreshManageTab === 'function') {
                refreshManageTab();
            } else if (window.app && typeof window.app.loadManageTabData === 'function') {
                window.app.loadManageTabData();
            }
        } catch (error) {
            UI.showToast('Failed to remove token: ' + error.message, 'error');
        }
    }
};

window.claimToken = async function(userAddress, tokenAddress) {
    
    // Get the button element
    const claimId = `claim-${tokenAddress.replace(/[^a-zA-Z0-9]/g, '')}`;
    const button = document.getElementById(claimId);
    
    if (UI.confirmAction('Are you sure you want to claim this token?')) {
        
        // Disable button during claim to prevent double-clicking
        if (button) {
            button.disabled = true;
            button.textContent = 'Claiming...';
            button.className = 'btn btn-warning';
        }
        
        try {
            const result = await contractManager.claimTokens(userAddress, tokenAddress);
            
            if (result) {
                // Update button to show success
                if (button) {
                    button.textContent = '✓ Claimed';
                    button.className = 'btn btn-success';
                    button.disabled = true;
                }
                
                // Update the token item to show claimed status
                const tokenItem = button.closest('.claimable-token-item');
                if (tokenItem) {
                    tokenItem.classList.add('claimed');
                    const tokenInfo = tokenItem.querySelector('.token-info');
                    if (tokenInfo && !tokenInfo.querySelector('.claim-status')) {
                        const claimStatus = document.createElement('div');
                        claimStatus.className = 'claim-status';
                        claimStatus.textContent = '✓ Already claimed by you';
                        tokenInfo.appendChild(claimStatus);
                    }
                }
                
                // Refresh the claim tab after a delay to show updated balances
                setTimeout(() => {
                    if (typeof refreshClaimTab === 'function') {
                        refreshClaimTab();
                    } else if (window.app && typeof window.app.checkInheritance === 'function') {
                        window.app.checkInheritance();
                    }
                }, 2000);
            } else {
                // Re-enable button on failure
                if (button) {
                    button.disabled = false;
                    button.textContent = 'Claim';
                    button.className = 'btn btn-primary claim-btn';
                }
            }
            
        } catch (error) {
            UI.showToast('Failed to claim token: ' + error.message, 'error');
            
            // Re-enable button on error
            if (button) {
                button.disabled = false;
                button.textContent = 'Claim';
                button.className = 'btn btn-primary claim-btn';
            }
        }
    } else {
    }
};
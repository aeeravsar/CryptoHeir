// Wallet connection and management
class WalletManager {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.address = null;
        this.chainId = 1; // Default to mainnet
        this.isConnected = false;
        
        this.init();
    }
    
    async init() {
        // Check if MetaMask is installed
        if (typeof window.ethereum !== 'undefined') {
            this.provider = new ethers.providers.Web3Provider(window.ethereum);
            
            // Check if already connected
            const accounts = await this.provider.listAccounts();
            if (accounts.length > 0) {
                await this.handleConnection();
            }
            
            // Listen for account changes
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    this.handleDisconnection();
                } else {
                    this.handleConnection();
                }
            });
            
            // Listen for chain changes
            window.ethereum.on('chainChanged', (chainId) => {
                window.location.reload(); // Reload page on chain change
            });
        }
    }
    
    async connect() {
        try {
            if (typeof window.ethereum === 'undefined') {
                throw new Error('MetaMask is not installed');
            }
            
            // Request account access
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            await this.handleConnection();
            
            return true;
        } catch (error) {
            UI.showToast('Failed to connect wallet: ' + error.message, 'error');
            return false;
        }
    }
    
    async handleConnection() {
        try {
            this.signer = this.provider.getSigner();
            this.address = await this.signer.getAddress();
            this.chainId = await this.provider.getNetwork().then(network => network.chainId);
            this.isConnected = true;
            
            // Update UI
            this.updateUI();
            
            // Initialize contract with new signer
            if (window.contractManager) {
                await contractManager.setSigner(this.signer);
                
                // Verify contract initialization
                if (contractManager.contract) {
                    UI.showToast('Wallet and contract connected successfully!', 'success');
                } else {
                    UI.showToast('Wallet connected, but contract not available on this network', 'warning');
                }
            } else {
                UI.showToast('Wallet connected successfully!', 'success');
            }
            
            // Update step progress to step 2 (Choose Action)
            if (window.updateStepProgress) {
                updateStepProgress(2);
            }
            
            // Dispatch event for app to respond to connection
            window.dispatchEvent(new CustomEvent('walletConnected', {
                detail: { address: this.address, chainId: this.chainId }
            }));
        } catch (error) {
            this.handleDisconnection();
        }
    }
    
    
    handleDisconnection() {
        this.signer = null;
        this.address = null;
        this.chainId = null;
        this.isConnected = false;
        
        this.updateUI();
        UI.showToast('Wallet disconnected', 'info');
    }
    
    updateUI() {
        const connectBtn = document.getElementById('connectWalletBtn');
        const connectPromptBtn = document.getElementById('connectPromptBtn');
        const connectPromptSection = document.getElementById('connectPromptSection');
        const walletAddress = document.getElementById('walletAddress');
        const networkIndicator = document.getElementById('networkIndicator');
        const networkName = document.getElementById('networkName');
        const heroSection = document.getElementById('heroSection');
        const stepProgress = document.getElementById('stepProgress');
        const tabNavigation = document.getElementById('tabNavigation');
        const appContent = document.getElementById('appContent');
        const homeNetworkName = document.getElementById('homeNetworkName');
        const homeWalletAddr = document.getElementById('homeWalletAddr');
        
        if (this.isConnected) {
            // Show navigation and app content
            tabNavigation.classList.remove('hidden');
            appContent.classList.remove('hidden');
            
            // Hide entire connect prompt section
            if (connectPromptSection) {
                connectPromptSection.style.display = 'none';
            }
            
            // Update wallet info
            connectBtn.textContent = 'Connected';
            connectBtn.disabled = true;
            walletAddress.textContent = this.formatAddress(this.address);
            walletAddress.classList.remove('hidden');
            
            // Update network display
            updateNetworkDisplay(this.chainId);
            
            // Update network text color based on connection
            const networkInfo = this.getNetworkInfo(this.chainId);
            networkName.className = networkInfo.connected ? 'text-green-400' : 'text-dark-500';
            
            // Update home tab status elements
            if (homeNetworkName) homeNetworkName.textContent = networkInfo.name;
            if (homeWalletAddr) homeWalletAddr.textContent = this.formatAddress(this.address);
            
        } else {
            // Hide navigation and app content only
            tabNavigation.classList.add('hidden');
            appContent.classList.add('hidden');
            
            // Show entire connect prompt section
            if (connectPromptSection) {
                connectPromptSection.style.display = 'block';
            }
            
            // Update step progress to show Step 1
            if (window.updateStepProgress) {
                updateStepProgress(1);
            }
            
            // Reset wallet info
            connectBtn.textContent = 'Connect Wallet';
            connectBtn.disabled = false;
            walletAddress.classList.add('hidden');
            networkName.textContent = 'Not Connected';
            networkName.className = 'text-dark-500';
            
            // Reset network dot
            const networkDot = networkIndicator.querySelector('div');
            networkDot.className = 'w-2 h-2 bg-red-500 rounded-full';
        }
    }
    
    formatAddress(address) {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
    
    getNetworkInfo(chainId) {
        const networks = {
            1: { name: 'Ethereum', connected: true },
            11155111: { name: 'Sepolia', connected: true },
            1337: { name: 'Local', connected: true }
        };
        
        return networks[chainId] || { name: `Chain ${chainId}`, connected: false };
    }
    
    async switchNetwork(targetChainId) {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: ethers.utils.hexValue(targetChainId) }],
            });
        } catch (error) {
            // If network doesn't exist, add it (for testnets)
            if (error.code === 4902) {
                await this.addNetwork(targetChainId);
            } else {
                throw error;
            }
        }
    }
    
    async addNetwork(chainId) {
        const networks = {
            11155111: {
                chainId: '0xaa36a7',
                chainName: 'Sepolia Testnet',
                nativeCurrency: {
                    name: 'ETH',
                    symbol: 'ETH',
                    decimals: 18
                },
                rpcUrls: ['https://rpc.sepolia.org'],
                blockExplorerUrls: ['https://sepolia.etherscan.io']
            }
        };
        
        const networkData = networks[chainId];
        if (!networkData) {
            throw new Error('Network not supported');
        }
        
        await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [networkData]
        });
    }
    
    getContractAddress() {
        const addresses = {
            1: CONTRACT_ADDRESSES.MAINNET,
            11155111: CONTRACT_ADDRESSES.SEPOLIA
        };
        
        return addresses[this.chainId] || null;
    }
    
    isMainnet() {
        return this.chainId === 1;
    }
    
    isTestnet() {
        return this.chainId === 11155111;
    }
}

// Initialize wallet manager
const walletManager = new WalletManager();

// Global network selector functions
window.toggleNetworkDropdown = function() {
    const dropdown = document.getElementById('networkDropdown');
    dropdown.classList.toggle('show');
    
    // Close dropdown when clicking outside
    if (dropdown.classList.contains('show')) {
        document.addEventListener('click', function closeDropdown(e) {
            if (!e.target.closest('.network-selector')) {
                dropdown.classList.remove('show');
                document.removeEventListener('click', closeDropdown);
            }
        });
    }
};

window.selectNetwork = async function(chainId) {
    const dropdown = document.getElementById('networkDropdown');
    const currentChainId = parseInt(chainId);
    
    // Update active option
    document.querySelectorAll('.network-option').forEach(option => {
        option.classList.remove('active');
        if (parseInt(option.dataset.chainId) === currentChainId) {
            option.classList.add('active');
        }
    });
    
    // Close dropdown
    dropdown.classList.remove('show');
    
    // Update network display
    updateNetworkDisplay(currentChainId);
    
    // If wallet is connected, try to switch network
    if (walletManager.isConnected) {
        try {
            await walletManager.switchNetwork(currentChainId);
        } catch (error) {
            UI.showToast('Failed to switch network', 'error');
        }
    } else {
        // Just update the default network for when user connects
        walletManager.chainId = currentChainId;
    }
};

function updateNetworkDisplay(chainId) {
    const networkName = document.getElementById('networkName');
    const networkDot = document.getElementById('networkDot');
    
    const networks = {
        1: { name: 'Ethereum Mainnet', color: 'bg-green-500' },
        11155111: { name: 'Sepolia Testnet', color: 'bg-yellow-500' }
    };
    
    const network = networks[chainId] || { name: 'Unknown Network', color: 'bg-red-500' };
    
    if (networkName) networkName.textContent = network.name;
    if (networkDot) {
        networkDot.className = `w-2 h-2 ${network.color} rounded-full`;
    }
    
    // Update active state in dropdown
    document.querySelectorAll('.network-option').forEach(option => {
        option.classList.remove('active');
        if (parseInt(option.dataset.chainId) === parseInt(chainId)) {
            option.classList.add('active');
        }
    });
}

// Initialize network dropdown click handlers
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.network-option').forEach(option => {
        option.addEventListener('click', function(e) {
            e.stopPropagation();
            selectNetwork(this.dataset.chainId);
        });
    });
    
    // Set default to mainnet
    updateNetworkDisplay(1);
});
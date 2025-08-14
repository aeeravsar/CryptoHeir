// Main application logic
class CryptoHeirApp {
    constructor() {
        this.currentTab = 'home';
        this.userConfig = null;
        this.userHeirs = [];
        this.userTokens = [];
        this.isLoadingUserData = false;
        this.lastLoadTime = 0;
        this.loadDebounceTimeout = null;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupTabNavigation();
        
        // Initial UI setup - delayed to allow wallet connection
        setTimeout(() => {
            if (walletManager.isConnected) {
                this.loadUserData();
                this.loadUserTokens();
            } else {
                // Show step 1 if not connected
                if (window.updateStepProgress) {
                    updateStepProgress(1);
                }
            }
        }, 1000);
        
        // Listen for wallet connection events
        window.addEventListener('walletConnected', (event) => {
            // Use debounced loading instead of timeout
            if (this.loadDebounceTimeout) {
                clearTimeout(this.loadDebounceTimeout);
            }
            this.loadDebounceTimeout = setTimeout(async () => {
                // Force contract reinitialization after wallet connection
                if (walletManager.signer) {
                    await contractManager.setSigner(walletManager.signer);
                }
                
                // Load user data only once
                await this.loadUserData();
                this.loadUserTokens();
            }, 500);
        });
    }
    
    setupEventListeners() {
        // Wallet connection
        document.getElementById('connectWalletBtn').addEventListener('click', () => {
            walletManager.connect();
        });
        
        document.getElementById('connectPromptBtn').addEventListener('click', () => {
            walletManager.connect();
        });
        
        
        // Setup form
        document.getElementById('setupForm').addEventListener('submit', this.handleSetupSubmit.bind(this));
        document.getElementById('addHeirBtn').addEventListener('click', UI.addHeirEntry);
        document.getElementById('addTokenBtn').addEventListener('click', UI.addTokenEntry);
        
        // Initial heir/token entry listeners
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('heir-percentage')) {
                UI.updatePercentageTotal();
            }
            if (e.target.classList.contains('token-address')) {
                // Refresh token display when manual inputs change
                if (window.app && window.app.refreshUserTokensDisplay) {
                    setTimeout(() => {
                        window.app.refreshUserTokensDisplay();
                    }, 50);
                }
            }
        });
        
        // Time preview update listeners
        document.getElementById('inactivityPeriod').addEventListener('input', this.updateTimePreview.bind(this));
        document.getElementById('timeUnit').addEventListener('change', this.updateTimePreview.bind(this));
        
        // Initial time preview
        this.updateTimePreview();
        
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-heir')) {
                const entry = e.target.closest('.heir-entry');
                const container = document.getElementById('heirsContainer');
                if (container.children.length > 1) {
                    container.removeChild(entry);
                    UI.updatePercentageTotal();
                }
            }
            
            if (e.target.classList.contains('remove-token')) {
                const entry = e.target.closest('.token-entry');
                const container = document.getElementById('tokensContainer');
                
                if (container.children.length > 1) {
                    container.removeChild(entry);
                } else {
                    // Just clear the input if it's the last one
                    const input = entry.querySelector('.token-address');
                    if (input) {
                        input.value = '';
                    }
                }
                
                // Always refresh token display when tokens are changed
                
                if (window.app && window.app.refreshUserTokensDisplay) {
                    // Add small delay to ensure DOM has updated
                    setTimeout(() => {
                        window.app.refreshUserTokensDisplay();
                    }, 50);
                } else {
                }
            }
            
            if (e.target.classList.contains('time-preset')) {
                const value = e.target.dataset.value;
                const unit = e.target.dataset.unit;
                document.getElementById('inactivityPeriod').value = value;
                document.getElementById('timeUnit').value = unit;
                this.updateTimePreview();
            }
        });
        
        // Manage tab buttons
        document.getElementById('updateActivityBtn').addEventListener('click', this.sendHeartbeat.bind(this));
        document.getElementById('pauseBtn').addEventListener('click', this.pauseInheritance.bind(this));
        document.getElementById('unpauseBtn').addEventListener('click', this.unpauseInheritance.bind(this));
        document.getElementById('updateHeirsBtn').addEventListener('click', this.showHeirsUpdateModal.bind(this));
        document.getElementById('addNewTokenBtn').addEventListener('click', this.addNewToken.bind(this));
        document.getElementById('deactivateBtn').addEventListener('click', this.deactivateInheritance.bind(this));
        
        // Claim tab
        document.getElementById('checkInheritanceBtn').addEventListener('click', this.checkInheritance.bind(this));
        
        // Token quick-add functionality
        document.getElementById('refreshTokensBtn').addEventListener('click', this.loadUserTokens.bind(this));
        
        // Delegate event for quick-add token buttons
        document.addEventListener('click', (e) => {
            
            // Store the initial state to prevent double-processing
            const isAddButton = e.target.classList.contains('quick-add-token');
            const isRemoveButton = e.target.classList.contains('quick-remove-token');
            
            if (isAddButton) {
                this.quickAddToken(e.target.dataset.tokenAddress);
                e.preventDefault();
                e.stopPropagation();
            } else if (isRemoveButton) {
                this.quickRemoveToken(e.target.dataset.tokenAddress);
                e.preventDefault();
                e.stopPropagation();
            }
        });
    }
    
    setupTabNavigation() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;
                
                // Update active states for Tailwind classes
                tabButtons.forEach(btn => {
                    btn.classList.remove('bg-primary-600', 'text-white', 'shadow-sm');
                    btn.classList.add('text-dark-500', 'hover:text-dark-700', 'hover:bg-dark-200');
                });
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Set active button
                button.classList.remove('text-dark-500', 'hover:text-dark-700', 'hover:bg-dark-200');
                button.classList.add('bg-primary-600', 'text-white', 'shadow-sm');
                
                document.getElementById(`${tabName}Tab`).classList.add('active');
                
                this.currentTab = tabName;
                
                // Load data for specific tabs
                if (tabName === 'setup') {
                    // Update step progress to step 3 (Configure)
                    if (window.updateStepProgress) {
                        updateStepProgress(3, this.userConfig, 'setup');
                    }
                    
                    // Load data only if not already loaded recently
                    if (!this.isLoadingUserData) {
                        this.loadUserData();
                        this.refreshUserTokensDisplay();
                        // If user has inheritance set up, also load manage data
                        if (this.userConfig && this.userConfig.isActive) {
                            this.loadManageTabData();
                        }
                    }
                } else if (tabName === 'home') {
                    // Update step progress based on user state
                    if (window.updateStepProgress) {
                        if (this.userConfig && this.userConfig.isActive) {
                            updateStepProgress(4);
                        } else {
                            updateStepProgress(2);
                        }
                    }
                    
                    // Only refresh if data is stale
                    if (!this.isLoadingUserData && (Date.now() - this.lastLoadTime) > 5000) {
                        this.loadUserData();
                    }
                } else if (tabName === 'claim') {
                    // Claim tab - step 3 with claim-specific description
                    if (window.updateStepProgress) {
                        updateStepProgress(3, null, 'claim');
                    }
                }
            });
        });
    }
    
    updateTimePreview() {
        const periodValue = parseInt(document.getElementById('inactivityPeriod').value) || 0;
        const timeUnit = document.getElementById('timeUnit').value;
        const seconds = UI.convertTimeToSeconds(periodValue, timeUnit);
        
        const preview = document.getElementById('timePreview');
        if (preview) {
            const readableTime = UI.formatTime(seconds);
            const textElement = preview.querySelector('span') || preview;
            textElement.textContent = `≈ ${readableTime} (${seconds.toLocaleString()} seconds)`;
            
            // Add validation styling with Tailwind classes
            if (seconds < 60) {
                textElement.className = 'text-red-300 text-sm font-medium';
                textElement.textContent += ' - Minimum 1 minute required';
            } else {
                textElement.className = 'text-primary-300 text-sm font-medium';
            }
        }
    }
    
    async loadUserData() {
        if (!walletManager.isConnected) return;
        
        // Prevent duplicate calls with debouncing
        const now = Date.now();
        if (this.isLoadingUserData || (now - this.lastLoadTime) < 1000) {
            return;
        }
        
        this.isLoadingUserData = true;
        this.lastLoadTime = now;
        
        try {
            // Always ensure contract is initialized before loading data
            if (!contractManager.contract && walletManager.signer) {
                await contractManager.setSigner(walletManager.signer);
            }
            
            // If still no contract, skip loading
            if (!contractManager.contract) {
                this.userConfig = null;
                this.userHeirs = [];
                this.userTokens = [];
                this.updateSetupTabUI();
                return;
            }
            
            // Single contract call instead of retry loop
            try {
                this.userConfig = await contractManager.getUserConfig(walletManager.address);
                
                this.userHeirs = await contractManager.getUserHeirs(walletManager.address);
                this.userTokens = await contractManager.getUserSelectedTokens(walletManager.address);
                
            } catch (contractError) {
                // Set safe defaults on error instead of retrying
                this.userConfig = null;
                this.userHeirs = [];
                this.userTokens = [];
            }
            
            this.updateSetupTabUI();
            
            if (this.currentTab === 'setup' && this.userConfig && this.userConfig.isActive) {
                this.loadManageTabData();
            }
        } catch (error) {
            // Set safe defaults on error
            this.userConfig = null;
            this.userHeirs = [];
            this.userTokens = [];
            this.updateSetupTabUI();
        } finally {
            this.isLoadingUserData = false;
        }
    }
    
    updateSetupTabUI() {
        
        const statusIndicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');
        const setupForm = document.getElementById('setupForm');
        const manageInterface = document.getElementById('manageInterface');
        const setupTabIcon = document.getElementById('setupTabIcon');
        const setupTabTitle = document.getElementById('setupTabTitle');
        const setupTabDesc = document.getElementById('setupTabDesc');
        const setupManageIcon = document.getElementById('setupManageIcon');
        const setupManageText = document.getElementById('setupManageText');
        const homeSetupCard = document.getElementById('homeSetupCard');
        const homeSetupTitle = document.getElementById('homeSetupTitle');
        const homeSetupDesc = document.getElementById('homeSetupDesc');
        const homeSetupAction = document.getElementById('homeSetupAction');
        const homeStatusIcon = document.getElementById('homeStatusIcon');
        const homeStatusText = document.getElementById('homeStatusText');
        const homeStatusDesc = document.getElementById('homeStatusDesc');
        
        // Check for missing elements
        const requiredElements = [
            {name: 'statusIndicator', element: statusIndicator},
            {name: 'statusText', element: statusText},
            {name: 'setupForm', element: setupForm},
            {name: 'manageInterface', element: manageInterface}
        ];
        
        const missingElements = requiredElements.filter(item => !item.element);
        if (missingElements.length > 0) {
            return; // Exit early to prevent errors
        }
        
        // Update step progress based on user's inheritance status
        if (walletManager.isConnected && window.updateStepProgress) {
            if (this.userConfig && this.userConfig.isActive) {
                // User has active inheritance - show complete status based on current tab
                if (this.currentTab === 'claim') {
                    updateStepProgress(4, null, 'claim');
                } else {
                    updateStepProgress(4);
                }
            } else if (this.currentTab === 'setup') {
                // User is on setup tab but no inheritance - step 3
                updateStepProgress(3, this.userConfig);
            } else {
                // User connected but no specific action - step 2
                updateStepProgress(2);
            }
        }
        
        if (this.userConfig && this.userConfig.isActive) {
            // User has active inheritance - show manage interface
            if (statusIndicator) statusIndicator.className = 'w-3 h-3 rounded-full ' + (this.userConfig.isPaused ? 'bg-yellow-500' : 'bg-green-500');
            if (statusText) {
                statusText.textContent = this.userConfig.isPaused ? 'Paused' : 'Active';
                statusText.className = 'font-medium ' + (this.userConfig.isPaused ? 'text-yellow-400' : 'text-green-400');
            }
            if (setupForm) setupForm.classList.add('hidden');
            if (manageInterface) manageInterface.classList.remove('hidden');
            
            // Update tab appearance to show "Manage"
            if (setupTabIcon) setupTabIcon.textContent = '📊';
            if (setupTabTitle) setupTabTitle.textContent = 'Manage Inheritance';
            if (setupTabDesc) setupTabDesc.textContent = 'Update and monitor your existing inheritance configuration';
            if (setupManageIcon) setupManageIcon.textContent = '📊';
            if (setupManageText) setupManageText.textContent = 'Manage';
            
            // Update home card to show "Manage"
            if (homeSetupCard) {
                homeSetupCard.querySelector('.w-20').innerHTML = '📊';
                homeSetupCard.querySelector('.w-20').className = 'w-20 h-20 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center text-3xl mb-6';
                homeSetupCard.classList.remove('hover:border-primary-500');
                homeSetupCard.classList.add('hover:border-green-500');
            }
            if (homeSetupTitle) homeSetupTitle.textContent = 'Manage Your Inheritance';
            if (homeSetupDesc) homeSetupDesc.textContent = 'Update your current inheritance configuration and settings.';
            if (homeSetupAction) {
                homeSetupAction.textContent = 'Manage →';
                homeSetupAction.className = 'text-green-500 font-semibold text-lg';
            }
            
            // Update home status section for active inheritance
            if (homeStatusIcon) {
                homeStatusIcon.textContent = this.userConfig.isPaused ? '⏸️' : '✅';
            }
            if (homeStatusText) {
                homeStatusText.textContent = this.userConfig.isPaused ? 'Paused' : 'Active & Protected';
            }
            if (homeStatusDesc) {
                if (this.userConfig.isPaused) {
                    homeStatusDesc.textContent = 'Inheritance is paused';
                } else {
                    homeStatusDesc.textContent = 'Your assets are protected';
                }
            }
        } else {
            // No active inheritance - show setup form
            if (statusIndicator) statusIndicator.className = 'w-3 h-3 bg-red-500 rounded-full';
            if (statusText) {
                statusText.textContent = 'Not Set Up';
                statusText.className = 'text-dark-600 font-medium';
            }
            if (setupForm) setupForm.classList.remove('hidden');
            if (manageInterface) manageInterface.classList.add('hidden');
            
            // Update tab appearance to show "Setup"
            if (setupTabIcon) setupTabIcon.textContent = '⚙️';
            if (setupTabTitle) setupTabTitle.textContent = 'Setup Inheritance';
            if (setupTabDesc) setupTabDesc.textContent = 'Create a secure inheritance plan for your digital assets';
            if (setupManageIcon) setupManageIcon.textContent = '⚙️';
            if (setupManageText) setupManageText.textContent = 'Setup';
            
            // Update home card to show "Setup"
            if (homeSetupCard) {
                homeSetupCard.querySelector('.w-20').innerHTML = '⚙️';
                homeSetupCard.querySelector('.w-20').className = 'w-20 h-20 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-3xl mb-6';
                homeSetupCard.classList.remove('hover:border-green-500');
                homeSetupCard.classList.add('hover:border-primary-500');
            }
            if (homeSetupTitle) homeSetupTitle.textContent = 'Setup Your Inheritance';
            if (homeSetupDesc) homeSetupDesc.textContent = 'Create a new inheritance plan for your digital assets.';
            if (homeSetupAction) {
                homeSetupAction.textContent = 'Get Started →';
                homeSetupAction.className = 'text-primary-500 font-semibold text-lg';
            }
            
            // Update home status section for no inheritance
            if (homeStatusIcon) {
                homeStatusIcon.textContent = '⏱️';
            }
            if (homeStatusText) {
                homeStatusText.textContent = 'Not Set Up';
            }
            if (homeStatusDesc) {
                homeStatusDesc.textContent = 'Click Setup to get started';
            }
        }
    }
    
    async handleSetupSubmit(event) {
        event.preventDefault();
        
        // Check wallet connection first
        
        if (!walletManager.isConnected) {
            UI.showToast('Please connect your wallet first', 'error');
            return;
        }
        
        // Always force contract initialization if contract is missing
        if (!contractManager.contract) {
            
            if (!walletManager.signer) {
                UI.showToast('Wallet signer not available - please reconnect', 'error');
                return;
            }
            
            await contractManager.setSigner(walletManager.signer);
            
            
            if (!contractManager.contract) {
                UI.showToast('Failed to initialize contract - check network connection', 'error');
                return;
            }
        }
        
        const periodValue = parseInt(document.getElementById('inactivityPeriod').value);
        const timeUnit = document.getElementById('timeUnit').value;
        const inactivityPeriodSeconds = UI.convertTimeToSeconds(periodValue, timeUnit);
        const { heirs, percentages } = UI.getHeirsFromForm();
        const tokens = UI.getTokensFromForm();
        
        // Validation
        if (heirs.length === 0) {
            UI.showToast('Please add at least one heir', 'error');
            return;
        }
        
        const totalPercentage = percentages.reduce((sum, p) => sum + p, 0);
        if (totalPercentage > 100) {
            UI.showToast('Total percentage cannot exceed 100%', 'error');
            return;
        }
        
        // Check for duplicate heirs
        const uniqueHeirs = new Set(heirs);
        if (uniqueHeirs.size !== heirs.length) {
            UI.showToast('Duplicate heir addresses found', 'error');
            return;
        }
        
        // Validate addresses
        for (const heir of heirs) {
            if (!UI.isValidAddress(heir)) {
                UI.showToast(`Invalid heir address: ${heir}`, 'error');
                return;
            }
            if (heir.toLowerCase() === walletManager.address.toLowerCase()) {
                UI.showToast('Cannot add yourself as an heir', 'error');
                return;
            }
        }
        
        for (const token of tokens) {
            if (!UI.isValidAddress(token)) {
                UI.showToast(`Invalid token address: ${token}`, 'error');
                return;
            }
        }
        
        // Validation for minimum time periods
        if (inactivityPeriodSeconds < 60) { // Less than 1 minute
            UI.showToast('Inactivity period must be at least 1 minute', 'error');
            return;
        }
        
        // Approve tokens first, then setup inheritance
        
        if (tokens.length === 0) {
        } else {
            UI.showToast('Approving tokens for inheritance...', 'info');
        }
        
        let allTokensApproved = true;
        
        for (let i = 0; i < tokens.length; i++) {
            const tokenAddress = tokens[i];
            
            try {
                const approved = await contractManager.approveToken(
                    tokenAddress, 
                    contractManager.contractAddress, 
                    ethers.constants.MaxUint256
                );
                
                if (!approved) {
                    allTokensApproved = false;
                    break;
                } else {
                }
            } catch (error) {
                UI.showToast(`Failed to approve token ${UI.formatAddress(tokenAddress)}`, 'error');
                allTokensApproved = false;
                break;
            }
        }
        
        
        if (!allTokensApproved) {
            UI.showToast('Token approval failed. Please try again.', 'error');
            return;
        }
        
        if (tokens.length > 0) {
            UI.showToast('Tokens approved! Setting up inheritance...', 'success');
        }
        
        // Setup inheritance
        const success = await contractManager.setupInheritance(
            inactivityPeriodSeconds,
            heirs,
            percentages,
            tokens
        );
        
        if (success) {
            // Update step progress to complete (step 4)
            if (window.updateStepProgress) {
                updateStepProgress(4);
            }
            
            // Add a small delay to ensure blockchain state is updated
            setTimeout(async () => {
                // Refresh user data
                await this.loadUserData();
                
                // Force UI update
                this.updateSetupTabUI();
            }, 1000);
            
            // Clear form
            document.getElementById('setupForm').reset();
            UI.clearHeirsForm();
            UI.clearTokensForm();
        }
    }
    
    async loadManageTabData() {
        if (!walletManager.isConnected) return;
        
        try {
            await this.loadUserData();
            
            // Update status grid
            const statusGrid = document.getElementById('statusGrid');
            if (this.userConfig && this.userConfig.isActive) {
                const timeUntil = await contractManager.getTimeUntilInheritance(walletManager.address);
                
                document.getElementById('currentStatus').textContent = 
                    this.userConfig.isPaused ? 'Paused' : 'Active';
                document.getElementById('lastActivity').textContent = 
                    UI.formatTimestamp(this.userConfig.lastActivity);
                document.getElementById('inactivityPeriodDisplay').textContent = 
                    UI.formatTime(this.userConfig.inactivityPeriod);
                document.getElementById('timeUntilInheritance').textContent = 
                    UI.formatTime(timeUntil);
                
                // Update pause/unpause buttons
                const pauseBtn = document.getElementById('pauseBtn');
                const unpauseBtn = document.getElementById('unpauseBtn');
                
                if (this.userConfig.isPaused) {
                    pauseBtn.classList.add('hidden');
                    unpauseBtn.classList.remove('hidden');
                } else {
                    pauseBtn.classList.remove('hidden');
                    unpauseBtn.classList.add('hidden');
                }
                
                // Enable management buttons
                this.enableManagementButtons(true);
            } else {
                document.getElementById('currentStatus').textContent = 'Not Set Up';
                document.getElementById('lastActivity').textContent = 'N/A';
                document.getElementById('inactivityPeriodDisplay').textContent = 'N/A';
                document.getElementById('timeUntilInheritance').textContent = 'N/A';
                
                // Hide pause/unpause buttons and disable management
                document.getElementById('pauseBtn').classList.add('hidden');
                document.getElementById('unpauseBtn').classList.add('hidden');
                this.enableManagementButtons(false);
            }
            
            // Display heirs and tokens (safe even if empty)
            UI.displayHeirs(this.userHeirs || []);
            UI.displayTokens(this.userTokens || []);
            
        } catch (error) {
            // Set safe defaults
            document.getElementById('currentStatus').textContent = 'Error Loading';
            document.getElementById('lastActivity').textContent = 'N/A';
            document.getElementById('inactivityPeriodDisplay').textContent = 'N/A';
            document.getElementById('timeUntilInheritance').textContent = 'N/A';
            UI.displayHeirs([]);
            UI.displayTokens([]);
            this.enableManagementButtons(false);
        }
    }
    
    enableManagementButtons(enabled) {
        const buttons = [
            'updateActivityBtn',
            'pauseBtn', 
            'unpauseBtn',
            'updateHeirsBtn',
            'addNewTokenBtn',
            'deactivateBtn'
        ];
        
        buttons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.disabled = !enabled;
                if (!enabled) {
                    btn.title = 'Set up inheritance first';
                } else {
                    btn.title = '';
                }
            }
        });
    }
    
    async sendHeartbeat() {
        if (!this.userConfig || !this.userConfig.isActive) {
            UI.showToast('Please set up inheritance first', 'warning');
            return;
        }
        
        const success = await contractManager.updateActivity();
        if (success) {
            UI.showToast('Heartbeat sent successfully! ❤️', 'success');
            this.loadManageTabData();
        }
    }
    
    async pauseInheritance() {
        if (!this.userConfig || !this.userConfig.isActive) {
            UI.showToast('Please set up inheritance first', 'warning');
            return;
        }
        
        if (UI.confirmAction('Are you sure you want to pause your inheritance?')) {
            const success = await contractManager.pauseInheritance();
            if (success) {
                this.loadManageTabData();
            }
        }
    }
    
    async unpauseInheritance() {
        if (!this.userConfig || !this.userConfig.isActive) {
            UI.showToast('Please set up inheritance first', 'warning');
            return;
        }
        
        if (UI.confirmAction('This will reset your inheritance timer. Are you sure?')) {
            const success = await contractManager.unpauseInheritance();
            if (success) {
                this.loadManageTabData();
            }
        }
    }
    
    showHeirsUpdateModal() {
        if (!this.userConfig || !this.userConfig.isActive) {
            UI.showToast('Please set up inheritance first', 'warning');
            return;
        }
        
        // Show the modal
        const modal = document.getElementById('updateHeirsModal');
        
        if (modal) {
            modal.classList.remove('hidden');
        }
        
        // Populate with current heirs
        this.populateHeirsModal();
        
        // Prevent background scroll
        document.body.style.overflow = 'hidden';
        
        // Add escape key listener
        document.addEventListener('keydown', this.handleModalKeydown.bind(this));
    }
    
    populateHeirsModal() {
        const container = document.getElementById('modalHeirsContainer');
        container.innerHTML = '';
        
        // Add current heirs
        if (this.userHeirs && this.userHeirs.length > 0) {
            this.userHeirs.forEach((heir, index) => {
                this.addHeirEntryToModal(heir.wallet, heir.percentage, index);
            });
        } else {
            // Add one empty heir entry
            this.addHeirEntryToModal('', 0, 0);
        }
        
        this.updateModalPercentageTotal();
    }
    
    addHeirEntryToModal(address = '', percentage = 0, index = 0) {
        const container = document.getElementById('modalHeirsContainer');
        const heirDiv = document.createElement('div');
        heirDiv.className = 'heir-entry-modal';
        heirDiv.innerHTML = `
            <div class="flex-1">
                <label class="text-xs text-dark-500 mb-1 block">Heir Address</label>
                <input type="text" 
                       class="heir-address-input w-full" 
                       placeholder="0x..." 
                       value="${address}"
                       oninput="app.updateModalPercentageTotal()">
            </div>
            <div>
                <label class="text-xs text-dark-500 mb-1 block">%</label>
                <input type="number" 
                       class="heir-percentage-input" 
                       min="0" 
                       max="100" 
                       value="${percentage}"
                       oninput="app.updateModalPercentageTotal()">
            </div>
            <button type="button" 
                    class="remove-heir-modal" 
                    onclick="app.removeHeirFromModal(this)"
                    title="Remove heir">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
            </button>
        `;
        
        container.appendChild(heirDiv);
    }
    
    removeHeirFromModal(button) {
        const container = document.getElementById('modalHeirsContainer');
        const heirEntry = button.closest('.heir-entry-modal');
        
        // Don't allow removing the last heir
        if (container.children.length > 1) {
            heirEntry.remove();
            this.updateModalPercentageTotal();
        } else {
            UI.showToast('Must have at least one heir', 'warning');
        }
    }
    
    updateModalPercentageTotal() {
        const percentageInputs = document.querySelectorAll('#modalHeirsContainer .heir-percentage-input');
        let total = 0;
        
        percentageInputs.forEach(input => {
            const value = parseInt(input.value) || 0;
            total += value;
        });
        
        const totalElement = document.getElementById('modalPercentageTotal');
        if (totalElement) {
            totalElement.textContent = `${total}%`;
            
            // Color coding for validation
            if (total === 0) {
                totalElement.className = 'font-semibold text-dark-500';
            } else if (total <= 100) {
                totalElement.className = 'font-semibold text-green-400';
            } else {
                totalElement.className = 'font-semibold text-red-400';
            }
        }
    }
    
    async saveHeirsUpdate() {
        // Collect heir data from modal
        const heirEntries = document.querySelectorAll('#modalHeirsContainer .heir-entry-modal');
        const heirs = [];
        const percentages = [];
        
        for (const entry of heirEntries) {
            const addressInput = entry.querySelector('.heir-address-input');
            const percentageInput = entry.querySelector('.heir-percentage-input');
            
            const address = addressInput.value.trim();
            const percentage = parseInt(percentageInput.value) || 0;
            
            if (address && percentage > 0) {
                heirs.push(address);
                percentages.push(percentage);
            }
        }
        
        // Validation
        if (heirs.length === 0) {
            UI.showToast('Please add at least one heir with a valid address and percentage', 'error');
            return;
        }
        
        const totalPercentage = percentages.reduce((sum, p) => sum + p, 0);
        if (totalPercentage > 100) {
            UI.showToast('Total percentage cannot exceed 100%', 'error');
            return;
        }
        
        if (totalPercentage === 0) {
            UI.showToast('Total percentage must be greater than 0%', 'error');
            return;
        }
        
        // Check for duplicate heirs
        const uniqueHeirs = new Set(heirs);
        if (uniqueHeirs.size !== heirs.length) {
            UI.showToast('Duplicate heir addresses found', 'error');
            return;
        }
        
        // Validate addresses
        for (const heir of heirs) {
            if (!UI.isValidAddress(heir)) {
                UI.showToast(`Invalid heir address: ${UI.formatAddress(heir)}`, 'error');
                return;
            }
            if (heir.toLowerCase() === walletManager.address.toLowerCase()) {
                UI.showToast('Cannot add yourself as an heir', 'error');
                return;
            }
        }
        
        // Close modal first
        this.closeUpdateHeirsModal();
        
        // Update heirs on blockchain
        const success = await contractManager.updateAllHeirs(heirs, percentages);
        if (success) {
            await this.loadManageTabData();
            UI.showToast('Heirs updated successfully!', 'success');
        }
    }
    
    closeUpdateHeirsModal() {
        const modal = document.getElementById('updateHeirsModal');
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
        
        // Remove escape key listener
        document.removeEventListener('keydown', this.handleModalKeydown.bind(this));
    }
    
    handleModalKeydown(event) {
        if (event.key === 'Escape') {
            const modal = document.getElementById('updateHeirsModal');
            if (!modal.classList.contains('hidden')) {
                this.closeUpdateHeirsModal();
            }
        }
    }
    
    async addNewToken() {
        if (!this.userConfig || !this.userConfig.isActive) {
            UI.showToast('Please set up inheritance first', 'warning');
            return;
        }
        
        const tokenAddress = document.getElementById('newTokenAddress').value.trim();
        
        if (!tokenAddress) {
            UI.showToast('Please enter a token address', 'error');
            return;
        }
        
        if (!UI.isValidAddress(tokenAddress)) {
            UI.showToast('Invalid token address', 'error');
            return;
        }
        
        // Approve token first
        try {
            UI.showToast('Approving token for inheritance...', 'info');
            
            const approved = await contractManager.approveToken(
                tokenAddress, 
                contractManager.contractAddress, 
                ethers.constants.MaxUint256
            );
            
            if (!approved) {
                UI.showToast('Token approval failed', 'error');
                return;
            }
            
            UI.showToast('Token approved! Adding to inheritance...', 'success');
        } catch (error) {
            UI.showToast('Failed to approve token: ' + error.message, 'error');
            return;
        }
        
        // Add token to inheritance
        const success = await contractManager.addToken(tokenAddress);
        if (success) {
            document.getElementById('newTokenAddress').value = '';
            this.loadManageTabData();
        }
    }
    
    async deactivateInheritance() {
        if (!this.userConfig || !this.userConfig.isActive) {
            UI.showToast('No active inheritance to deactivate', 'warning');
            return;
        }
        
        if (UI.confirmAction('This will permanently delete your inheritance setup. Are you sure?')) {
            const success = await contractManager.deactivateInheritance();
            if (success) {
                await this.loadUserData();
            }
        }
    }
    
    async checkInheritance() {
        const userAddress = document.getElementById('userAddressInput').value.trim();
        
        if (!userAddress) {
            UI.showToast('Please enter a user address', 'error');
            return;
        }
        
        if (!UI.isValidAddress(userAddress)) {
            UI.showToast('Invalid user address', 'error');
            return;
        }
        
        try {
            // Get user data
            const userConfig = await contractManager.getUserConfig(userAddress);
            const userHeirs = await contractManager.getUserHeirs(userAddress);
            const userTokens = await contractManager.getUserSelectedTokens(userAddress);
            const isAvailable = await contractManager.isInheritanceAvailable(userAddress);
            const timeUntil = await contractManager.getTimeUntilInheritance(userAddress);
            
            // Check if current user is an heir
            const isHeir = userHeirs.some(heir => 
                heir.wallet.toLowerCase() === walletManager.address.toLowerCase()
            );
            
            // Display comprehensive inheritance info
            const infoContainer = document.getElementById('inheritanceInfo');
            const detailsContainer = document.getElementById('inheritanceDetails');
            
            if (userConfig && userConfig.isActive) {
                // Find current user's heir info
                const currentHeirInfo = userHeirs.find(heir => 
                    heir.wallet.toLowerCase() === walletManager.address.toLowerCase()
                );
                
                // Calculate total inheritance stats and user's share
                const totalTokenStats = await this.calculateTotalInheritanceStats(userAddress, userTokens);
                const userShare = currentHeirInfo ? currentHeirInfo.percentage : 0;
                
                detailsContainer.innerHTML = `
                    <div class="inheritance-overview">
                        <div class="inheritance-status-card ${isAvailable ? 'available' : userConfig.isPaused ? 'paused' : 'active'}">
                            <div class="status-header">
                                <div class="status-icon">${isAvailable ? '✅' : userConfig.isPaused ? '⏸️' : '🔒'}</div>
                                <div class="status-text">
                                    <h3>${isAvailable ? 'Ready to Claim' : userConfig.isPaused ? 'Inheritance Paused' : 'Inheritance Active'}</h3>
                                    <p>${isAvailable ? 'Inheritance period has expired' : userConfig.isPaused ? 'Owner has paused the inheritance' : `Available ${UI.formatTime(timeUntil)}`}</p>
                                </div>
                            </div>
                            ${!userConfig.isPaused ? `
                                <div class="timeline-progress">
                                    <div class="timeline-bar">
                                        <div class="timeline-fill" style="width: ${Math.min(100, ((userConfig.inactivityPeriod - timeUntil) / userConfig.inactivityPeriod) * 100)}%"></div>
                                    </div>
                                    <div class="timeline-labels">
                                        <span>Last Heartbeat: ${UI.formatTimestamp(userConfig.lastActivity)}</span>
                                        <span>Inheritance Period: ${UI.formatTime(userConfig.inactivityPeriod)}</span>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                        
                        ${isHeir ? `
                            <div class="heir-info-card">
                                <h4>🎯 Your Inheritance Share</h4>
                                <div class="heir-share-details">
                                    <div class="share-percentage">
                                        <span class="percentage-value">${userShare}%</span>
                                        <span class="percentage-label">of total inheritance</span>
                                    </div>
                                    <div class="share-tokens">
                                        <span class="tokens-amount">${(totalTokenStats.totalTokenBalance * (userShare / 100)).toFixed(2)}</span>
                                        <span class="tokens-label">total tokens claimable</span>
                                    </div>
                                </div>
                            </div>
                        ` : `
                            <div class="non-heir-card">
                                <h4>⚠️ Access Denied</h4>
                                <p>You are not listed as an heir for this inheritance. Only designated heirs can view detailed information and claim tokens.</p>
                            </div>
                        `}
                        
                        <div class="inheritance-stats">
                            <div class="stat-grid">
                                <div class="stat-item">
                                    <span class="stat-value">${userHeirs.length}</span>
                                    <span class="stat-label">Total Heirs</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-value">${userTokens.length}</span>
                                    <span class="stat-label">Token Types</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-value">${totalTokenStats.totalTokenBalance.toFixed(0)}</span>
                                    <span class="stat-label">Total Tokens</span>
                                </div>
                            </div>
                        </div>
                        
                        ${isHeir && userHeirs.length > 1 ? `
                            <div class="all-heirs-card">
                                <h4>👥 All Heirs</h4>
                                <div class="heirs-list">
                                    ${userHeirs.map(heir => `
                                        <div class="heir-item ${heir.wallet.toLowerCase() === walletManager.address.toLowerCase() ? 'current-user' : ''}">
                                            <div class="heir-address-info">
                                                <span class="heir-address">${UI.formatAddress(heir.wallet)}</span>
                                                ${heir.wallet.toLowerCase() === walletManager.address.toLowerCase() ? '<span class="heir-tag">You</span>' : ''}
                                            </div>
                                            <div class="heir-percentage">${heir.percentage}%</div>
                                            <div class="heir-tokens">${(totalTokenStats.totalTokenBalance * (heir.percentage / 100)).toFixed(2)} tokens</div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                `;
                
                infoContainer.classList.remove('hidden');
                
                // Display claimable tokens
                const tokensContainer = document.getElementById('claimableTokens');
                await UI.displayClaimableTokens(userAddress, userTokens, isHeir, isAvailable);
                tokensContainer.classList.remove('hidden');
                
            } else {
                detailsContainer.innerHTML = '<div class="text-center py-8"><div class="text-6xl mb-4">🔍</div><p class="text-dark-500">No active inheritance found for this address</p></div>';
                infoContainer.classList.remove('hidden');
                document.getElementById('claimableTokens').classList.add('hidden');
            }
            
        } catch (error) {
            UI.showToast('Failed to check inheritance', 'error');
        }
    }
    
    async calculateTotalInheritanceStats(userAddress, tokens) {
        let totalTokenBalance = 0;
        
        for (const tokenAddress of tokens) {
            try {
                const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, contractManager.signer);
                const balance = await tokenContract.balanceOf(userAddress);
                const balanceFormatted = parseFloat(ethers.utils.formatEther(balance));
                
                totalTokenBalance += balanceFormatted;
                
            } catch (error) {
            }
        }
        
        return {
            totalTokenBalance
        };
    }
    
    // Token detection and quick-add functionality
    async loadUserTokens() {
        if (!walletManager.isConnected || !walletManager.address) {
            document.getElementById('userTokensList').innerHTML = 
                '<div class="text-center py-4 text-dark-500 text-sm">Connect wallet to see your tokens</div>';
            return;
        }
        
        const userTokensList = document.getElementById('userTokensList');
        userTokensList.innerHTML = 
            '<div class="text-center py-4 text-dark-500 text-sm"><div class="animate-spin w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2"></div>Discovering your tokens...</div>';
        
        try {
            const userTokens = [];
            
            // Method 1: Use multiple discovery approaches
            const discoveredTokens = await this.discoverTokensFlexible(walletManager.address);
            
            // Check balances for discovered tokens
            let successCount = 0;
            for (const tokenAddress of discoveredTokens) {
                try {
                    const tokenInfo = await this.getTokenInfoSafe(tokenAddress);
                    
                    if (tokenInfo && tokenInfo.balance && parseFloat(tokenInfo.balance) > 0) {
                        userTokens.push(tokenInfo);
                        successCount++;
                    } else if (tokenInfo) {
                    }
                } catch (error) {
                }
            }
            
            this.displayUserTokens(userTokens);
            
        } catch (error) {
            userTokensList.innerHTML = 
                '<div class="text-center py-4 text-red-400 text-sm">Error discovering tokens. Try again.</div>';
        }
    }
    
    async discoverTokensFlexible(userAddress) {
        const tokenSet = new Set();
        
        // Method 1: Try RPC-based token balance detection
        try {
            const rpcTokens = await this.getRPCTokenBalances(userAddress);
            rpcTokens.forEach(addr => tokenSet.add(addr));
        } catch (error) {
        }
        
        // Method 2: Fallback to transaction scanning if RPC method fails
        if (tokenSet.size === 0) {
            try {
                const recentTokens = await this.scanRecentTransfers(userAddress);
                recentTokens.forEach(addr => tokenSet.add(addr));
            } catch (error) {
            }
        }
        
        // Method 3: If we still have nothing, let user know they can add manually
        if (tokenSet.size === 0) {
        }
        
        return tokenSet;
    }
    
    async getRPCTokenBalances(userAddress) {
        try {
            
            // Call our secure backend API (same server, different route)
            const apiUrl = '/api/token-balances';
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    address: userAddress,
                    chainId: walletManager.chainId
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return [];
            }
            
            const data = await response.json();
            
            if (data.success && data.tokens) {
                const tokenAddresses = data.tokens.map(token => token.contractAddress);
                return tokenAddresses;
            } else {
                return [];
            }
            
        } catch (error) {
            return [];
        }
    }
    
    getContractRPC(chainId) {
        // Use public RPC URLs for general blockchain calls
        const rpcUrls = {
            1: 'https://ethereum.publicnode.com',
            11155111: 'https://ethereum-sepolia.publicnode.com'
        };
        return rpcUrls[chainId];
    }
    
    async scanRecentTransfers(userAddress) {
        try {
            // Use public RPC for transaction scanning
            const publicRPC = this.getContractRPC(walletManager.chainId);
            const provider = publicRPC ? 
                new ethers.providers.JsonRpcProvider(publicRPC) : 
                walletManager.provider;
                
            const currentBlock = await provider.getBlockNumber();
            const fromBlock = Math.max(0, currentBlock - 5000); // Fewer blocks for public RPC
            
            
            const transferTopic = ethers.utils.id("Transfer(address,address,uint256)");
            const userAddressHex = ethers.utils.hexZeroPad(userAddress, 32);
            
            // Just check transfers TO user (most common case)
            const transfers = await provider.getLogs({
                fromBlock: fromBlock,
                toBlock: currentBlock,
                topics: [transferTopic, null, userAddressHex]
            });
            
            const tokenAddresses = new Set();
            transfers.forEach(log => {
                if (log.address && ethers.utils.isAddress(log.address)) {
                    tokenAddresses.add(log.address);
                }
            });
            
            return Array.from(tokenAddresses);
        } catch (error) {
            return [];
        }
    }
    
    
    async getTokenInfoSafe(tokenAddress) {
        try {
            const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, walletManager.signer);
            
            // Get balance first - if this fails, the token is probably not ERC-20
            const balance = await tokenContract.balanceOf(walletManager.address);
            
            // Get token info with safe fallbacks
            const [symbol, decimals, name] = await Promise.allSettled([
                tokenContract.symbol(),
                tokenContract.decimals(),
                tokenContract.name()
            ]);
            
            const symbolValue = symbol.status === 'fulfilled' ? symbol.value : 'UNKNOWN';
            const decimalsValue = decimals.status === 'fulfilled' ? decimals.value : 18;
            const nameValue = name.status === 'fulfilled' ? name.value : symbolValue;
            
            const formattedBalance = ethers.utils.formatUnits(balance, decimalsValue);
            
            return {
                address: tokenAddress,
                symbol: symbolValue,
                balance: formattedBalance,
                decimals: decimalsValue,
                name: nameValue
            };
            
        } catch (error) {
            return null;
        }
    }
    
    
    
    displayUserTokens(tokens) {
        const userTokensList = document.getElementById('userTokensList');
        
        if (tokens.length === 0) {
            userTokensList.innerHTML = 
                '<div class="text-center py-4 text-dark-500 text-sm">No tokens found in your wallet</div>';
            return;
        }
        
        const currentTokens = this.getCurrentlySelectedTokens();
        
        userTokensList.innerHTML = tokens.map(token => {
            const isSelected = currentTokens.includes(token.address.toLowerCase());
            const buttonClass = isSelected ? 'quick-remove-token btn-warning' : 'quick-add-token btn-primary';
            const buttonText = isSelected ? '✓ Added' : '+ Add';
            
            return `
                <div class="flex items-center justify-between p-3 bg-dark-200 rounded-lg border border-dark-300">
                    <div class="flex-1">
                        <div class="flex items-center space-x-3">
                            <div class="text-lg">🪙</div>
                            <div>
                                <div class="font-semibold text-dark-800">${token.symbol}</div>
                                <div class="text-xs text-dark-500">${token.name}</div>
                                <div class="text-xs text-dark-600 font-mono">${UI.formatAddress(token.address)}</div>
                            </div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-sm font-semibold text-dark-700">${parseFloat(token.balance).toFixed(4)}</div>
                        <button type="button" 
                                class="${buttonClass} text-xs px-3 py-1 mt-1" 
                                data-token-address="${token.address}">
                            ${buttonText}
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    getCurrentlySelectedTokens() {
        const tokenInputs = document.querySelectorAll('.token-address');
        const tokens = [];
        tokenInputs.forEach((input, index) => {
            if (input.value.trim()) {
                tokens.push(input.value.trim().toLowerCase());
            }
        });
        return tokens;
    }
    
    quickAddToken(tokenAddress) {
        
        // Find an empty token input or create a new one
        const tokenInputs = document.querySelectorAll('.token-address');
        let emptyInput = null;
        
        for (const input of tokenInputs) {
            if (!input.value.trim()) {
                emptyInput = input;
                break;
            }
        }
        
        if (!emptyInput) {
            // Add a new token entry
            UI.addTokenEntry();
            const newInputs = document.querySelectorAll('.token-address');
            emptyInput = newInputs[newInputs.length - 1];
        }
        
        emptyInput.value = tokenAddress;
        
        // Refresh the user tokens list to update button states
        this.refreshUserTokensDisplay();
        
        UI.showToast('Token added to inheritance list!', 'success');
    }
    
    quickRemoveToken(tokenAddress) {
        const tokenInputs = document.querySelectorAll('.token-address');
        
        for (const input of tokenInputs) {
            if (input.value.trim().toLowerCase() === tokenAddress.toLowerCase()) {
                input.value = '';
                
                // If this was not the first input and it's now empty, remove the entire entry
                const container = document.getElementById('tokensContainer');
                if (container.children.length > 1 && !input.value.trim()) {
                    const entry = input.closest('.token-entry');
                    container.removeChild(entry);
                }
                break;
            }
        }
        
        // Refresh the user tokens list to update button states
        this.refreshUserTokensDisplay();
        
        UI.showToast('Token removed from inheritance list!', 'info');
    }
    
    // Debug function to manually test inheritance detection
    async debugInheritanceDetection() {
        
        if (!walletManager.isConnected) {
            return;
        }
        
        try {
            const config = await contractManager.getUserConfig(walletManager.address);
            
            if (config) {
            }
            
            this.userConfig = config;
            this.updateSetupTabUI();
            
        } catch (error) {
        }
    }

    refreshUserTokensDisplay() {
        // Get current tokens and refresh display without reloading from blockchain
        const userTokensList = document.getElementById('userTokensList');
        const tokenElements = userTokensList.querySelectorAll('[data-token-address]');
        const currentTokens = this.getCurrentlySelectedTokens();
        
        
        tokenElements.forEach((element, index) => {
            const tokenAddress = element.dataset.tokenAddress.toLowerCase();
            const isSelected = currentTokens.includes(tokenAddress);
            const oldClass = element.className;
            
            
            if (isSelected) {
                element.className = element.className.replace('quick-add-token btn-primary', 'quick-remove-token btn-warning');
                element.textContent = '✓ Added';
            } else {
                element.className = element.className.replace('quick-remove-token btn-warning', 'quick-add-token btn-primary');
                element.textContent = '+ Add';
            }
            
            if (oldClass !== element.className) {
            }
        });
    }
}

// Global refresh functions for UI callbacks
window.refreshManageTab = function() {
    if (app.currentTab === 'manage') {
        app.loadManageTabData();
    }
};

window.refreshClaimTab = function() {
    if (app.currentTab === 'claim') {
        app.checkInheritance();
    }
};

// Global modal functions (called from HTML)
window.closeUpdateHeirsModal = function() {
    const modal = document.getElementById('updateHeirsModal');
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
};

window.addHeirToModal = function() {
    if (app) {
        app.addHeirEntryToModal();
    }
};

window.saveHeirsUpdate = function() {
    if (app) {
        app.saveHeirsUpdate();
    }
};

// Step progress management
window.updateStepProgress = function(step, userConfig = null, context = null) {
    const progressBar = document.getElementById('progressBar');
    const prevStepIcon = document.getElementById('prevStepIcon');
    const prevStepText = document.getElementById('prevStepText');
    const currentStepIcon = document.getElementById('currentStepIcon');
    const currentStepText = document.getElementById('currentStepText');
    const stepDescription = document.getElementById('stepDescription');
    
    if (!progressBar || !prevStepIcon || !prevStepText || !currentStepIcon || !currentStepText || !stepDescription) return;
    
    // Add smooth animation to progress bar
    progressBar.className = 'h-2 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-1000 ease-out step-progress-bar';
    
    // Add animation to step description
    stepDescription.className = 'text-dark-400 text-center step-description highlighted';
    
    switch(step) {
        case 1: // Connect Wallet (not connected)
            progressBar.style.width = '0%';
            // Hide previous step
            prevStepIcon.style.opacity = '0.3';
            prevStepIcon.textContent = '1';
            prevStepIcon.className = 'w-10 h-10 bg-dark-300 rounded-full flex items-center justify-center text-dark-500 font-bold';
            prevStepText.textContent = 'Step 1: Connect Wallet';
            prevStepText.className = 'text-lg font-semibold text-dark-500';
            // Current step
            currentStepIcon.textContent = '1';
            currentStepIcon.className = 'w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg animate-pulse step-icon';
            currentStepText.textContent = 'Step 1: Connect Wallet';
            stepDescription.textContent = "Connect your MetaMask wallet to get started with CryptoHeir.";
            break;
            
        case 2: // Choose Action (wallet connected)
            progressBar.style.width = '33%';
            // Previous step (completed)
            prevStepIcon.style.opacity = '1';
            prevStepIcon.textContent = '✓';
            prevStepIcon.className = 'w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg';
            prevStepText.textContent = 'Step 1: Connect Wallet';
            prevStepText.className = 'text-lg font-semibold text-green-400';
            // Current step
            currentStepIcon.textContent = '2';
            currentStepIcon.className = 'w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg animate-pulse step-icon';
            currentStepText.textContent = 'Step 2: Choose Your Path';
            stepDescription.textContent = "Great! Your wallet is connected. Now choose what you'd like to do.";
            break;
            
        case 3: // Setup/Claim in progress
            progressBar.style.width = '66%';
            // Previous step (completed)
            prevStepIcon.style.opacity = '1';
            prevStepIcon.textContent = '✓';
            prevStepIcon.className = 'w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg';
            prevStepText.textContent = 'Step 2: Choose Your Path';
            prevStepText.className = 'text-lg font-semibold text-green-400';
            // Current step
            currentStepIcon.textContent = '3';
            currentStepIcon.className = 'w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg animate-pulse step-icon';
            
            if (context === 'claim') {
                currentStepText.textContent = 'Step 3: Claim Inheritance';
                stepDescription.textContent = "Enter an address to check if inheritance is available for claiming.";
            } else {
                currentStepText.textContent = 'Step 3: Configure Inheritance';
                if (userConfig && userConfig.isActive) {
                    stepDescription.textContent = "Perfect! You're managing your existing inheritance setup.";
                } else {
                    stepDescription.textContent = "You're setting up your inheritance plan. Follow the form below.";
                }
            }
            break;
            
        case 4: // Complete
            progressBar.style.width = '100%';
            // Previous step (completed)
            prevStepIcon.style.opacity = '1';
            prevStepIcon.textContent = '✓';
            prevStepIcon.className = 'w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg';
            
            if (context === 'claim') {
                prevStepText.textContent = 'Step 2: Choose Your Path';
                // Current step for claim
                currentStepIcon.innerHTML = '💎';
                currentStepIcon.className = 'w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg step-icon';
                currentStepText.textContent = 'Claim Ready';
                stepDescription.textContent = "Ready to claim your inheritance! Enter the address to check.";
            } else {
                prevStepText.textContent = 'Step 3: Configure Inheritance';
                // Current step for setup completion
                currentStepIcon.innerHTML = '✓';
                currentStepIcon.className = 'w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg step-icon completed';
                currentStepText.textContent = 'All Done!';
                stepDescription.textContent = "Your inheritance is active and protecting your digital assets!";
                
                // Add celebration effect for completion
                setTimeout(() => {
                    if (currentStepIcon.innerHTML === '✓') {
                        currentStepIcon.classList.add('glow-success');
                    }
                }, 500);
            }
            prevStepText.className = 'text-lg font-semibold text-green-400';
            break;
    }
    
    // Update step 1 icon based on connection status
    const step1Icon = document.getElementById('step1Icon');
    if (step1Icon) {
        if (step >= 2) {
            step1Icon.innerHTML = '✓';
            step1Icon.className = 'w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg';
        } else {
            step1Icon.textContent = '1';
            step1Icon.className = 'w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg animate-pulse';
        }
    }
    
    // Update the preview boxes
    updateStepPreviewBoxes(step);
};

function updateStepPreviewBoxes(step) {
    const step1Box = document.getElementById('step1Box');
    const step2Box = document.getElementById('step2Box');
    const step3Box = document.getElementById('step3Box');
    
    // Reset all boxes to default state
    if (step1Box) {
        step1Box.className = 'bg-dark-100 rounded-xl p-6 border border-dark-200 opacity-40';
        document.getElementById('step1BoxIcon').innerHTML = '1';
        document.getElementById('step1BoxIcon').className = 'w-8 h-8 bg-dark-300 rounded-full flex items-center justify-center text-dark-500 font-bold mx-auto mb-3';
        document.getElementById('step1BoxStatus').textContent = 'Next';
        document.getElementById('step1BoxStatus').className = 'text-sm font-medium text-dark-500';
        document.getElementById('step1BoxDesc').className = 'text-xs text-dark-500 mt-1';
    }
    
    if (step2Box) {
        step2Box.className = 'bg-dark-100 rounded-xl p-6 border border-dark-200 opacity-40';
        document.getElementById('step2BoxIcon').innerHTML = '2';
        document.getElementById('step2BoxIcon').className = 'w-8 h-8 bg-dark-300 rounded-full flex items-center justify-center text-dark-500 font-bold mx-auto mb-3';
        document.getElementById('step2BoxStatus').textContent = 'Next';
        document.getElementById('step2BoxStatus').className = 'text-sm font-medium text-dark-500';
        document.getElementById('step2BoxDesc').className = 'text-xs text-dark-500 mt-1';
    }
    
    if (step3Box) {
        step3Box.className = 'bg-dark-100 rounded-xl p-6 border border-dark-200 opacity-40';
        document.getElementById('step3BoxIcon').innerHTML = '3';
        document.getElementById('step3BoxIcon').className = 'w-8 h-8 bg-dark-300 rounded-full flex items-center justify-center text-dark-500 font-bold mx-auto mb-3';
        document.getElementById('step3BoxStatus').textContent = 'Next';
        document.getElementById('step3BoxStatus').className = 'text-sm font-medium text-dark-500';
        document.getElementById('step3BoxDesc').className = 'text-xs text-dark-500 mt-1';
    }
    
    // Update based on current step
    if (step === 1) {
        // Step 1 is current
        if (step1Box) {
            step1Box.className = 'bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-6 border border-primary-400 shadow-lg';
            document.getElementById('step1BoxIcon').className = 'w-8 h-8 bg-white rounded-full flex items-center justify-center text-primary-600 font-bold mx-auto mb-3';
            document.getElementById('step1BoxStatus').textContent = 'Current Step';
            document.getElementById('step1BoxStatus').className = 'text-sm font-medium text-white';
            document.getElementById('step1BoxDesc').className = 'text-xs text-primary-100 mt-1';
        }
    } else if (step === 2) {
        // Step 1 completed, Step 2 current
        if (step1Box) {
            step1Box.className = 'bg-dark-100 rounded-xl p-6 border border-dark-200 opacity-60';
            document.getElementById('step1BoxIcon').innerHTML = '✓';
            document.getElementById('step1BoxIcon').className = 'w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-3';
            document.getElementById('step1BoxStatus').textContent = 'Completed';
            document.getElementById('step1BoxStatus').className = 'text-sm font-medium text-green-400';
        }
        if (step2Box) {
            step2Box.className = 'bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-6 border border-primary-400 shadow-lg';
            document.getElementById('step2BoxIcon').className = 'w-8 h-8 bg-white rounded-full flex items-center justify-center text-primary-600 font-bold mx-auto mb-3';
            document.getElementById('step2BoxStatus').textContent = 'Current Step';
            document.getElementById('step2BoxStatus').className = 'text-sm font-medium text-white';
            document.getElementById('step2BoxDesc').className = 'text-xs text-primary-100 mt-1';
        }
    } else if (step === 3) {
        // Steps 1-2 completed, Step 3 current
        if (step1Box) {
            step1Box.className = 'bg-dark-100 rounded-xl p-6 border border-dark-200 opacity-60';
            document.getElementById('step1BoxIcon').innerHTML = '✓';
            document.getElementById('step1BoxIcon').className = 'w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-3';
            document.getElementById('step1BoxStatus').textContent = 'Completed';
            document.getElementById('step1BoxStatus').className = 'text-sm font-medium text-green-400';
        }
        if (step2Box) {
            step2Box.className = 'bg-dark-100 rounded-xl p-6 border border-dark-200 opacity-60';
            document.getElementById('step2BoxIcon').innerHTML = '✓';
            document.getElementById('step2BoxIcon').className = 'w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-3';
            document.getElementById('step2BoxStatus').textContent = 'Completed';
            document.getElementById('step2BoxStatus').className = 'text-sm font-medium text-green-400';
        }
        if (step3Box) {
            step3Box.className = 'bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-6 border border-primary-400 shadow-lg';
            document.getElementById('step3BoxIcon').className = 'w-8 h-8 bg-white rounded-full flex items-center justify-center text-primary-600 font-bold mx-auto mb-3';
            document.getElementById('step3BoxStatus').textContent = 'Current Step';
            document.getElementById('step3BoxStatus').className = 'text-sm font-medium text-white';
            document.getElementById('step3BoxDesc').className = 'text-xs text-primary-100 mt-1';
        }
    } else if (step === 4) {
        // All steps completed
        if (step1Box) {
            step1Box.className = 'bg-dark-100 rounded-xl p-6 border border-dark-200 opacity-60';
            document.getElementById('step1BoxIcon').innerHTML = '✓';
            document.getElementById('step1BoxIcon').className = 'w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-3';
            document.getElementById('step1BoxStatus').textContent = 'Completed';
            document.getElementById('step1BoxStatus').className = 'text-sm font-medium text-green-400';
        }
        if (step2Box) {
            step2Box.className = 'bg-dark-100 rounded-xl p-6 border border-dark-200 opacity-60';
            document.getElementById('step2BoxIcon').innerHTML = '✓';
            document.getElementById('step2BoxIcon').className = 'w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-3';
            document.getElementById('step2BoxStatus').textContent = 'Completed';
            document.getElementById('step2BoxStatus').className = 'text-sm font-medium text-green-400';
        }
        if (step3Box) {
            step3Box.className = 'bg-dark-100 rounded-xl p-6 border border-dark-200 opacity-60';
            document.getElementById('step3BoxIcon').innerHTML = '✓';
            document.getElementById('step3BoxIcon').className = 'w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-3';
            document.getElementById('step3BoxStatus').textContent = 'Completed';
            document.getElementById('step3BoxStatus').className = 'text-sm font-medium text-green-400';
        }
    }
}

// Utility functions
window.scrollToTop = function() {
    // If connected and navigation is visible, go to home tab
    const tabNavigation = document.getElementById('tabNavigation');
    if (tabNavigation && !tabNavigation.classList.contains('hidden')) {
        document.querySelector('[data-tab="home"]').click();
    }
    // Always scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Update step progress when inheritance is completed
window.onInheritanceComplete = function() {
    if (window.updateStepProgress) {
        updateStepProgress(4);
    }
};

// Initialize app when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new CryptoHeirApp();
    window.app = app; // Make app available globally
    window.debugInheritance = () => app.debugInheritanceDetection(); // Debug function available in console
    
    // Wallet connection listener is already handled in app.init()
});
// SPDX-License-Identifier: GPL-2.0-only
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CryptoHeir
 * @dev A single shared contract where each user manages their own independent inheritance setup
 * @notice This contract allows users to set up cryptocurrency inheritance without deploying individual contracts
 */
contract CryptoHeir is ReentrancyGuard {
    using SafeERC20 for IERC20;


    // Heir structure
    struct Heir {
        address wallet;
        uint8 percentage;
    }

    // User's inheritance configuration
    struct InheritanceConfig {
        uint256 inactivityPeriod;        // Time before inheritance becomes available
        uint256 lastActivity;            // Last activity timestamp
        bool isActive;                   // Whether inheritance is set up and active
        bool isPaused;                   // Whether inheritance is temporarily paused
        uint256 pausedAt;               // When the inheritance was paused
    }

    // User inheritance configurations
    mapping(address => InheritanceConfig) public inheritanceConfigs;

    // User heirs: user address -> array of heirs
    mapping(address => Heir[]) public userHeirs;

    // Track claimed amounts: user -> heir -> token -> amount
    mapping(address => mapping(address => mapping(address => uint256))) public claimedAmounts;

    // Track token inheritance snapshots: user -> token -> total amount when first claimed
    mapping(address => mapping(address => uint256)) public totalInheritancePool;


    // Owner's selected tokens for inheritance: user -> token addresses
    mapping(address => address[]) public userSelectedTokens;
    
    // Quick lookup for selected tokens: user -> token -> is selected
    mapping(address => mapping(address => bool)) public isTokenSelected;

    // Optimized heir lookups: user -> heir address -> heir exists
    mapping(address => mapping(address => bool)) public isUserHeir;

    // Events
    event InheritanceSetup(address indexed user, uint256 inactivityPeriod);
    event InheritanceDeactivated(address indexed user);
    event InheritancePaused(address indexed user);
    event InheritanceUnpaused(address indexed user);
    event ActivityUpdated(address indexed user, uint256 timestamp);
    event TokenInherited(address indexed user, address indexed heir, address indexed token, uint256 amount);
    event TokenClaimFailed(address indexed user, address indexed heir, address indexed token, string reason);
    event TokenSelected(address indexed user, address indexed token);
    event TokenRemoved(address indexed user, address indexed token);
    event InheritanceCompleted(address indexed user);
    event InactivityPeriodUpdated(address indexed user, uint256 newPeriod);

    // Modifiers
    modifier onlyActiveUser() {
        require(inheritanceConfigs[msg.sender].isActive, "Inheritance not set up or deactivated");
        _;
    }

    modifier onlyNotPaused() {
        require(!inheritanceConfigs[msg.sender].isPaused, "Inheritance is paused");
        _;
    }

    modifier onlyValidUser(address user) {
        require(inheritanceConfigs[user].isActive, "User inheritance not set up or deactivated");
        _;
    }

    modifier onlyUserHeir(address user) {
        require(isUserHeir[user][msg.sender], "Not an heir of this user");
        _;
    }

    /**
     * @dev Setup inheritance with heirs and shares in one transaction
     * @param _inactivityPeriod Time in seconds before inheritance becomes available
     * @param _heirs Array of heir addresses
     * @param _percentages Array of percentages corresponding to each heir
     * @param _tokens Optional array of token addresses to include in inheritance
     */
    function setupInheritance(
        uint256 _inactivityPeriod,
        address[] calldata _heirs,
        uint256[] calldata _percentages,
        address[] calldata _tokens
    ) external {
        require(_inactivityPeriod > 0, "Inactivity period must be greater than 0");
        require(!inheritanceConfigs[msg.sender].isActive, "Inheritance already active, deactivate first");
        // Allow empty heirs array for setup, heirs can be added later
        require(_heirs.length == _percentages.length, "Heirs and percentages length mismatch");

        // Validate total percentage and heir addresses
        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < _heirs.length; i++) {
            require(_heirs[i] != address(0), "Invalid heir address");
            require(_heirs[i] != msg.sender, "Cannot add yourself as heir");
            require(_percentages[i] > 0 && _percentages[i] <= 100, "Invalid percentage");
            
            // Check for duplicate heirs
            for (uint256 j = 0; j < i; j++) {
                require(_heirs[i] != _heirs[j], "Duplicate heir");
            }
            
            totalPercentage += _percentages[i];
        }
        require(totalPercentage <= 100, "Total percentage exceeds 100");

        // Setup inheritance config
        inheritanceConfigs[msg.sender] = InheritanceConfig({
            inactivityPeriod: _inactivityPeriod,
            lastActivity: block.timestamp,
            isActive: true,
            isPaused: false,
            pausedAt: 0
        });

        // Add all heirs
        for (uint256 i = 0; i < _heirs.length; i++) {
            userHeirs[msg.sender].push(Heir(_heirs[i], uint8(_percentages[i])));
            isUserHeir[msg.sender][_heirs[i]] = true;
        }

        // Add tokens if provided
        for (uint256 i = 0; i < _tokens.length; i++) {
            require(_tokens[i] != address(0), "Invalid token address");
            require(!isTokenSelected[msg.sender][_tokens[i]], "Duplicate token");
            
            userSelectedTokens[msg.sender].push(_tokens[i]);
            isTokenSelected[msg.sender][_tokens[i]] = true;
            emit TokenSelected(msg.sender, _tokens[i]);
        }

        emit InheritanceSetup(msg.sender, _inactivityPeriod);
    }

    /**
     * @dev Update activity timestamp for the calling user
     */
    function updateActivity() external onlyActiveUser onlyNotPaused {
        inheritanceConfigs[msg.sender].lastActivity = block.timestamp;
        emit ActivityUpdated(msg.sender, block.timestamp);
    }


    /**
     * @dev Add a token for inheritance
     * @param _token Address of the token to include in inheritance
     */
    function addToken(address _token) external onlyActiveUser {
        require(_token != address(0), "Invalid token address");
        require(!isTokenSelected[msg.sender][_token], "Token already selected");

        userSelectedTokens[msg.sender].push(_token);
        isTokenSelected[msg.sender][_token] = true;

        emit TokenSelected(msg.sender, _token);
    }

    /**
     * @dev Remove a token from inheritance (only if not yet claimed)
     * @param _token Address of the token to remove
     */
    function removeToken(address _token) external onlyActiveUser {
        require(isTokenSelected[msg.sender][_token], "Token not selected");
        require(totalInheritancePool[msg.sender][_token] == 0, "Token already claimed by someone");

        // Find token index and remove
        address[] storage tokens = userSelectedTokens[msg.sender];
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == _token) {
                tokens[i] = tokens[tokens.length - 1];
                tokens.pop();
                break;
            }
        }
        
        isTokenSelected[msg.sender][_token] = false;
        emit TokenRemoved(msg.sender, _token);
    }

    /**
     * @dev Get selected tokens for a user
     * @param user Address of the user
     * @return Array of selected token addresses
     */
    function getUserSelectedTokens(address user) external view returns (address[] memory) {
        return userSelectedTokens[user];
    }

    /**
     * @dev Update all heirs and percentages at once (complete replacement)
     * @param _heirs New array of heir addresses
     * @param _percentages New array of percentages
     */
    function updateAllHeirs(
        address[] calldata _heirs,
        uint256[] calldata _percentages
    ) external onlyActiveUser onlyNotPaused {
        require(_heirs.length > 0, "Must have at least one heir");
        require(_heirs.length == _percentages.length, "Length mismatch");

        // Validate new heirs and percentages
        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < _heirs.length; i++) {
            require(_heirs[i] != address(0), "Invalid heir address");
            require(_heirs[i] != msg.sender, "Cannot add yourself as heir");
            require(_percentages[i] > 0 && _percentages[i] <= 100, "Invalid percentage");
            
            // Check for duplicates
            for (uint256 j = 0; j < i; j++) {
                require(_heirs[i] != _heirs[j], "Duplicate heir");
            }
            
            totalPercentage += _percentages[i];
        }
        require(totalPercentage <= 100, "Total percentage exceeds 100");

        // Clear existing heirs
        uint256 currentLength = userHeirs[msg.sender].length;
        for (uint256 i = 0; i < currentLength; i++) {
            address heirToRemove = userHeirs[msg.sender][i].wallet;
            delete isUserHeir[msg.sender][heirToRemove];
        }
        delete userHeirs[msg.sender];

        // Add new heirs
        for (uint256 i = 0; i < _heirs.length; i++) {
            userHeirs[msg.sender].push(Heir(_heirs[i], uint8(_percentages[i])));
            isUserHeir[msg.sender][_heirs[i]] = true;
        }
    }

    /**
     * @dev Get all heirs for a user
     * @param user Address of the user
     * @return Array of heirs
     */
    function getUserHeirs(address user) external view returns (Heir[] memory) {
        return userHeirs[user];
    }

    /**
     * @dev Check if inheritance is available for a user
     * @param user Address of the user
     * @return True if inheritance is available
     */
    function isInheritanceAvailable(address user) public view returns (bool) {
        InheritanceConfig memory config = inheritanceConfigs[user];
        return config.isActive && 
               !config.isPaused && 
               block.timestamp >= config.lastActivity + config.inactivityPeriod;
    }

    /**
     * @dev Get time remaining until inheritance becomes available
     * @param user Address of the user
     * @return Time in seconds until inheritance is available (0 if already available)
     */
    function getTimeUntilInheritance(address user) external view returns (uint256) {
        InheritanceConfig memory config = inheritanceConfigs[user];
        if (!config.isActive || config.isPaused) return type(uint256).max;
        
        uint256 availableAt = config.lastActivity + config.inactivityPeriod;
        if (block.timestamp >= availableAt) return 0;
        
        return availableAt - block.timestamp;
    }

    /**
     * @dev Deactivate and clean up inheritance for the calling user (can setup again later)
     */
    function deactivateInheritance() external onlyActiveUser {
        _deleteInheritanceSetup(msg.sender);
        emit InheritanceDeactivated(msg.sender);
    }

    /**
     * @dev Pause inheritance for the calling user
     */
    function pauseInheritance() external onlyActiveUser {
        require(!inheritanceConfigs[msg.sender].isPaused, "Inheritance is already paused");
        
        inheritanceConfigs[msg.sender].isPaused = true;
        inheritanceConfigs[msg.sender].pausedAt = block.timestamp;
        
        emit InheritancePaused(msg.sender);
    }

    /**
     * @dev Unpause inheritance for the calling user (resets timer)
     */
    function unpauseInheritance() external onlyActiveUser {
        require(inheritanceConfigs[msg.sender].isPaused, "Inheritance is not paused");
        
        // Reset lastActivity to current time (full timer reset)
        inheritanceConfigs[msg.sender].lastActivity = block.timestamp;
        
        inheritanceConfigs[msg.sender].isPaused = false;
        inheritanceConfigs[msg.sender].pausedAt = 0;
        
        emit InheritanceUnpaused(msg.sender);
    }

    /**
     * @dev Update inactivity period for the calling user
     * @param _newInactivityPeriod New inactivity period in seconds
     */
    function updateInactivityPeriod(uint256 _newInactivityPeriod) external onlyActiveUser {
        require(_newInactivityPeriod > 0, "Inactivity period must be greater than 0");
        
        inheritanceConfigs[msg.sender].inactivityPeriod = _newInactivityPeriod;
        emit InactivityPeriodUpdated(msg.sender, _newInactivityPeriod);
    }


    /**
     * @dev Check if an address has claimed a specific token from a user
     * @param user Address of the user
     * @param heir Address of the heir
     * @param token Address of the token
     * @return True if the heir has claimed the token
     */
    function hasHeirClaimedToken(address user, address heir, address token) external view returns (bool) {
        return claimedAmounts[user][heir][token] > 0;
    }

    /**
     * @dev Claim inherited tokens from a user with graceful failure handling
     * @param user Address of the user whose tokens to inherit
     * @param token Address of the token to claim
     * @return success Whether the claim was successful
     * @return amount Amount claimed (0 if failed)
     */
    function claimTokens(address user, address token) external onlyValidUser(user) onlyUserHeir(user) nonReentrant returns (bool success, uint256 amount) {
        require(isInheritanceAvailable(user), "Inheritance not yet available");
        require(token != address(0), "Invalid token address");
        require(isTokenSelected[user][token], "Token not selected for inheritance");
        require(claimedAmounts[user][msg.sender][token] == 0, "Already claimed this token");

        // Find heir index and percentage
        uint256 heirPercentage = 0;
        for (uint256 i = 0; i < userHeirs[user].length; i++) {
            if (userHeirs[user][i].wallet == msg.sender) {
                heirPercentage = userHeirs[user][i].percentage;
                break;
            }
        }
        require(heirPercentage > 0, "Heir not found");

        // Attempt token claim with graceful error handling
        try this._attemptTokenClaim(user, token, msg.sender, heirPercentage) returns (uint256 claimedAmount) {
            // Success - mark as claimed
            claimedAmounts[user][msg.sender][token] = claimedAmount;
            emit TokenInherited(user, msg.sender, token, claimedAmount);
            
            // Check if all tokens claimed by all heirs - auto-delete setup
            if (_isInheritanceComplete(user)) {
                _deleteInheritanceSetup(user);
                emit InheritanceCompleted(user);
            }
            
            return (true, claimedAmount);
        } catch Error(string memory reason) {
            // Log the failure but don't revert
            emit TokenClaimFailed(user, msg.sender, token, reason);
            return (false, 0);
        } catch (bytes memory) {
            // Handle low-level failures
            emit TokenClaimFailed(user, msg.sender, token, "Unknown error");
            return (false, 0);
        }
    }

    /**
     * @dev Internal function to attempt token claiming
     * @param user Address of the user whose tokens to inherit
     * @param token Address of the token to claim
     * @param heir Address of the heir claiming
     * @param heirPercentage Percentage this heir should receive
     * @return heirAmount Amount successfully claimed
     */
    function _attemptTokenClaim(
        address user, 
        address token, 
        address heir, 
        uint256 heirPercentage
    ) external returns (uint256 heirAmount) {
        require(msg.sender == address(this), "Internal function only");
        
        IERC20 tokenContract = IERC20(token);
        
        // Create snapshot of total inheritance pool if this is the first claim for this token
        if (totalInheritancePool[user][token] == 0) {
            uint256 ownerBalance = tokenContract.balanceOf(user);
            require(ownerBalance > 0, "User has no tokens to inherit");
            totalInheritancePool[user][token] = ownerBalance;
        }
        
        // Calculate heir's fair share from the original pool
        heirAmount = (totalInheritancePool[user][token] * heirPercentage) / 100;
        require(heirAmount > 0, "No tokens to claim");
        
        // Transfer tokens from user to heir
        tokenContract.safeTransferFrom(user, heir, heirAmount);
        
        return heirAmount;
    }

    /**
     * @dev Check if inheritance is complete (all selected tokens fully distributed)
     * @param user Address of the user
     * @return True if all inheritance is complete
     */
    function _isInheritanceComplete(address user) internal view returns (bool) {
        address[] memory selectedTokens = userSelectedTokens[user];
        if (selectedTokens.length == 0) return false;
        
        // Check each selected token
        for (uint256 i = 0; i < selectedTokens.length; i++) {
            address token = selectedTokens[i];
            
            // If no snapshot exists, token hasn't been touched yet
            if (totalInheritancePool[user][token] == 0) {
                return false;
            }
            
            // Calculate total distributed amount
            uint256 totalDistributed = 0;
            for (uint256 j = 0; j < userHeirs[user].length; j++) {
                address heir = userHeirs[user][j].wallet;
                totalDistributed += claimedAmounts[user][heir][token];
            }
            
            // Check if 100% of the pool has been distributed
            if (totalDistributed < totalInheritancePool[user][token]) {
                return false;
            }
        }
        
        return true; // All tokens have been fully distributed
    }

    /**
     * @dev Delete inheritance setup (called when complete)
     * @param user Address of the user
     */
    function _deleteInheritanceSetup(address user) internal {
        // Deactivate inheritance
        inheritanceConfigs[user].isActive = false;
        
        // Clear heirs
        uint256 heirCount = userHeirs[user].length;
        for (uint256 i = 0; i < heirCount; i++) {
            address heirToRemove = userHeirs[user][i].wallet;
            delete isUserHeir[user][heirToRemove];
        }
        delete userHeirs[user];
        
        // Clear selected tokens
        address[] memory tokens = userSelectedTokens[user];
        for (uint256 i = 0; i < tokens.length; i++) {
            delete isTokenSelected[user][tokens[i]];
        }
        delete userSelectedTokens[user];
    }




    /**
     * @dev Get user's inheritance configuration
     * @param user Address of the user
     * @return The user's inheritance configuration
     */
    function getUserConfig(address user) external view returns (InheritanceConfig memory) {
        return inheritanceConfigs[user];
    }

}
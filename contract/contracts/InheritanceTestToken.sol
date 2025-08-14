// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title InheritanceTestToken
 * @dev Simple test token for testing CryptoHeir inheritance functionality
 */
contract InheritanceTestToken is ERC20 {
    constructor() ERC20("Inheritance Test Token", "ITT") {
        // Mint 1 million tokens to the deployer
        _mint(msg.sender, 1_000_000 * 10**18);
    }
    
    // Allow anyone to mint tokens for testing purposes
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
    
    // Convenient function to get tokens for testing
    function getTestTokens() external {
        _mint(msg.sender, 10_000 * 10**18); // 10,000 tokens
    }
}
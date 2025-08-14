// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title BadToken
 * @dev A test token that always fails on transfer - for testing failure handling
 */
contract BadToken is ERC20 {
    constructor() ERC20("BadToken", "BAD") {
        _mint(msg.sender, 10000 * 10**decimals());
    }

    /**
     * @dev Override transfer to always revert
     */
    function transfer(address, uint256) public pure override returns (bool) {
        revert("Transfer failed");
    }

    /**
     * @dev Override transferFrom to always revert
     */
    function transferFrom(address, address, uint256) public pure override returns (bool) {
        revert("Transfer failed");
    }

    /**
     * @dev Allow getting tokens for testing
     */
    function getTestTokens() external {
        _mint(msg.sender, 1000 * 10**decimals());
    }
}
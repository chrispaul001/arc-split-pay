// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

/// @title CoindeccSplitter
/// @notice Non-custodial batch payout: pulls USDC from the caller and sends each
/// recipient their share in one atomic transaction. Holds no funds, has no owner.
contract CoindeccSplitter {
    event SplitExecuted(address indexed payer, address indexed token, uint256 total, uint256 recipients);

    function split(address token, address[] calldata recipients, uint256[] calldata amounts) external {
        uint256 n = recipients.length;
        require(n > 0 && n == amounts.length, "bad input");
        uint256 total;
        for (uint256 i = 0; i < n; i++) {
            require(recipients[i] != address(0), "zero recipient");
            require(IERC20(token).transferFrom(msg.sender, recipients[i], amounts[i]), "transfer failed");
            total += amounts[i];
        }
        emit SplitExecuted(msg.sender, token, total, n);
    }
}

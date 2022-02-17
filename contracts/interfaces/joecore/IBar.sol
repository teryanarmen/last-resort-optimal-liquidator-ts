// SPDX-License-Identifier: MIT
pragma solidity >=0.6.12;

// JoeBar is the coolest bar in town. You come in with some Joe, and leave with more! The longer you stay, the more Joe you get.

// This contract handles swapping to and from xJoe, JoeSwap's staking token.
interface IBar {
    function joe() external view returns (address);

    function totalSupply() external view returns (uint256);

    function enter(uint256 _amount) external;

    function leave(uint256 _share) external;

    function balanceOf(address account) external view returns (uint256);
}

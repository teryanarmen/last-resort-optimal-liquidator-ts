// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import "./interfaces/joecore/IERC20.sol";
import "./interfaces/joecore/IWAVAX.sol";
import "./interfaces/joecore/IJoeRouter02.sol";

import "./interfaces/JoeLending.sol";
import "./interfaces/ERC3156FlashBorrowerInterface.sol";
import "./interfaces/ERC3156FlashLenderInterface.sol";

contract Liquidator is ERC3156FlashBorrowerInterface {
    /*
    // Event emitted by our contract.
    */

    event Swapped(
        address fromTokenAddress,
        address toTokenAddress,
        uint256 fromTokenAmount,
        uint256 toTokensAmount
    );

    event Flashloaned(address tokenAddress, uint256 amount, uint256 fee);

    event Liquidated(
        address accountAddress,
        address tokenAddress,
        uint256 amount
    );

    event Debug(
        string key,
        string stringValue,
        uint256 uintValue,
        address addressValue
    );

    address public owner;

    IJoeRouter02 public joeRouter;
    Joetroller public joeComptroller;

    constructor(address joeRouterAddress, address joeComptrollerAddress) {
        owner = msg.sender;
        joeRouter = IJoeRouter02(joeRouterAddress);
        joeComptroller = Joetroller(joeComptrollerAddress);
    }

    function swapERC20(address tokenFrom, address tokenTo)
        internal
        returns (bool)
    {
        require(
            IERC20(tokenFrom).balanceOf(address(this)) > 0,
            "Contract has no balance of tokenFrom"
        );

        uint256 amountFrom = IERC20(tokenFrom).balanceOf(address(this));

        IERC20(tokenFrom).approve(address(joeRouter), amountFrom);
        address[] memory path;

        if (
            tokenFrom != 0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7 &&
            tokenTo != 0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7
        ) {
            path = new address[](3);
            path[0] = tokenFrom;
            path[1] = 0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7;
            path[2] = tokenTo;
        } else {
            path = new address[](2);
            path[0] = tokenFrom;
            path[1] = tokenTo;
        }

        joeRouter.swapExactTokensForTokens(
            amountFrom,
            1, // XXX: Should not have 1 Wei minimum out.
            path,
            address(this),
            block.timestamp + 1 minutes
        );
        require(
            IERC20(tokenTo).balanceOf(address(this)) > 0,
            "Didn't receive token"
        );
        emit Swapped(
            tokenFrom,
            tokenTo,
            amountFrom,
            IERC20(tokenTo).balanceOf(address(this))
        );
        return true;
    }

    // function thats called from script
    function liquidateLoan(
        address borrower,
        uint256 flashloanAmount,
        address jTokenLiquidateAddress,
        address jTokenLiquidateUnderlying,
        address jTokenCollateral,
        address jTokenCollateralUnderlying,
        address jTokenFlashLoan,
        address jTokenFlashLoanUnderlying
    ) external {
        // vars needed in the function that Banker Joe calls after sending funds
        bytes memory data = abi.encode(
            borrower,
            jTokenLiquidateAddress,
            jTokenLiquidateUnderlying,
            jTokenCollateral,
            jTokenCollateralUnderlying,
            jTokenFlashLoanUnderlying
        );

        // call flash loan, this function will then call onFlashloan with data, exepecting for loan to be paid back once the function is done executing

        ERC3156FlashLenderInterface(jTokenFlashLoan).flashLoan(
            this,
            msg.sender,
            flashloanAmount,
            data
        );
    }

    // Banker Joe calls this after sending the funds, this is where we liquidate and repay loan, along with swapping twice because of the re-entrancy guard
    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external override returns (bytes32) {
        emit Flashloaned(token, amount, fee);
        require(
            joeComptroller.isMarketListed(msg.sender),
            "untrusted message sender"
        );
        (
            address borrower,
            address jTokenLiquidateAddress,
            address jTokenLiquidateUnderlying,
            address jTokenCollateral,
            address jTokenCollateralUnderlying,
            address jTokenFlashLoanUnderlying
        ) = abi.decode(
                data,
                (address, address, address, address, address, address)
            );
        // swap flashToken for repayToken
        swapERC20(jTokenFlashLoanUnderlying, jTokenLiquidateUnderlying);

        // liquidate
        liquidateBorrower(
            jTokenLiquidateUnderlying,
            jTokenLiquidateAddress,
            borrower,
            IERC20(jTokenLiquidateUnderlying).balanceOf(address(this)),
            jTokenCollateral
        );

        emit Liquidated(
            borrower,
            jTokenLiquidateAddress,
            IERC20(jTokenLiquidateUnderlying).balanceOf(address(this))
        );
        // seize seizeToken
        JToken(jTokenCollateral).redeem(
            JToken(jTokenCollateral).balanceOf(address(this))
        );

        // swap seizeToken for flashToken
        swapERC20(jTokenCollateralUnderlying, jTokenFlashLoanUnderlying);

        // approve Banker Joe to take flashToken repayment
        IERC20(token).approve(msg.sender, amount + fee);
        // repay flashToken loan
        IERC20(jTokenFlashLoanUnderlying).transfer(
            owner,
            IERC20(jTokenFlashLoanUnderlying).balanceOf(address(this)) -
                (amount + fee)
        );

        return keccak256("ERC3156FlashBorrowerInterface.onFlashLoan");
    }

    // actual liquidation
    function liquidateBorrower(
        address jTokenLiquidateUnderlying,
        address jTokenLiquidateAddress,
        address borrower,
        uint256 repayAmount,
        address jTokenCollateral
    ) internal {
        // once we call liquidate, contract pulls funds
        IERC20(jTokenLiquidateUnderlying).approve(
            jTokenLiquidateAddress,
            repayAmount
        );

        // liquidate
        JToken(jTokenLiquidateAddress).liquidateBorrow(
            borrower,
            repayAmount,
            JToken(jTokenCollateral)
        );
    }

    receive() external payable {}

    fallback() external payable {}
}

// A contract used for testing
contract TestLiquidator is Liquidator {
    address public WAVAX = 0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7;

    constructor(address joeRouterAddress, address joeComptrollerAddress)
        Liquidator(joeRouterAddress, joeComptrollerAddress)
    {}

    function _swapERC20(address tokenFrom, address tokenTo) public {
        require(swapERC20(tokenFrom, tokenTo), "swap failed");
    }

    function swapToNative(address tokenFrom) internal returns (bool) {
        require(
            IERC20(tokenFrom).balanceOf(address(this)) > 0,
            "Contract has no balance of tokenFrom"
        );

        uint256 amountFrom = IERC20(tokenFrom).balanceOf(address(this));
        address[] memory path = new address[](2);
        path[0] = tokenFrom;
        path[1] = 0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7;
        IERC20(tokenFrom).approve(address(joeRouter), amountFrom);
        joeRouter.swapExactTokensForAVAX(
            amountFrom,
            1,
            path,
            address(this),
            block.timestamp + 1 minutes
        );

        require(address(this).balance > 0, "has no native balance");
        emit Swapped(
            tokenFrom,
            0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7,
            IERC20(tokenFrom).balanceOf(address(this)),
            address(this).balance
        );
        return true;
    }

    function swapFromNative(address tokenTo) internal returns (bool) {
        require(address(this).balance > 0, "Contract has no native balance");

        uint256 amountAvax = address(this).balance;
        address[] memory path = new address[](2);
        path[0] = WAVAX;
        path[1] = tokenTo;

        joeRouter.swapExactAVAXForTokens{value: amountAvax}(
            1,
            path,
            address(this),
            block.timestamp + 1 minutes
        );

        require(
            IERC20(tokenTo).balanceOf(address(this)) > 0,
            "Didn't receive token"
        );
        emit Swapped(
            WAVAX,
            tokenTo,
            amountAvax,
            IERC20(tokenTo).balanceOf(address(this))
        );
        return true;
    }

    function _swapFromNative(address tokenTo) public {
        require(swapFromNative(tokenTo), "swap failed");
    }

    function _swapToNative(address tokenFrom) public {
        require(swapToNative(tokenFrom), "swap failed");
    }
}

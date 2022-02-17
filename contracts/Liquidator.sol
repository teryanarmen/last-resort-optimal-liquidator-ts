// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./console.sol";
import "./interfaces/joecore/IERC20.sol";
import "./interfaces/joecore/IWAVAX.sol";
import "./interfaces/joecore/IJoeRouter02.sol";
import "./interfaces/joecore/IJoeFactory.sol";
import "./interfaces/joecore/IJoePair.sol";
import "./interfaces/joecore/IBar.sol";

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
    address constant WAVAX_ADDRESS = 0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7;
    address constant JOE_ADDRESS = 0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd;
    address constant XJOE_ADDRESS = 0x57319d41F71E81F3c65F2a47CA4e001EbAFd4F33;

    IJoeRouter02 internal joeRouter;
    Joetroller private joeComptroller;
    IJoeFactory private joeFactory;

    constructor(
        address joeRouterAddress,
        address joeComptrollerAddress,
        address joeFactoryAddress
    ) {
        owner = msg.sender;
        joeRouter = IJoeRouter02(joeRouterAddress);
        joeComptroller = Joetroller(joeComptrollerAddress);
        joeFactory = IJoeFactory(joeFactoryAddress);
    }

    /* Contract flow is pretty basic: 
    -- liquidator calls liquidateLoan with liquidatee, and necessary token addresses, 
    -- liquidateLoan takes a flashloan from a jToken, 
    -- jToken calls onFlashLoan where the liquidation is executed:
        - First the flashToken is swapped to the repayToken, 
            - the swap function logic is a bit long/messy because some token pairs lack liquidity and a middleman is used, either JOE for XJOE or WAVAX for everything else. 
        - After the swap the liquidation is done, then the collateralToken seized.
        - collateralToken is then swapped for the flashToken which is used to pay back the flashloan. 
        - Profits are sent back to owner in flashToken. */

    function swapERC20(address tokenIn, address tokenOut)
        internal
        returns (bool)
    {
        uint256 initialBalance = IERC20(tokenIn).balanceOf(address(this));
        require(initialBalance > 0, "Contract has no balance of tokenIn");

        // xJoe liquidity is very low and causes large slippage, need to unstake, swap then restake if xJOE involved
        if (tokenIn == XJOE_ADDRESS) {
            IBar(tokenIn).leave(initialBalance); // unstake
            // update params
            tokenIn = JOE_ADDRESS;
            initialBalance = IERC20(tokenIn).balanceOf(address(this));
        } else if (tokenOut == XJOE_ADDRESS) {
            tokenOut = JOE_ADDRESS; // will swap to JOE and stake for xJOE at the end
        }

        address[] memory path;

        IERC20(tokenIn).approve(address(joeRouter), initialBalance);

        // if pair doesnt exist, use WAVAX as "middleman", calculate minimum output for both cases
        if (joeFactory.getPair(tokenIn, tokenOut) == address(0)) {
            path = new address[](3);

            path[0] = tokenIn;
            path[1] = WAVAX_ADDRESS;
            path[2] = tokenOut;

            // -- calculates minimum output amount for swap from tokenIn to WAVAX -- //
            // get reserves for tokenIn and WAVAX
            (uint256 reserve0, uint256 reserve1, ) = IJoePair(
                joeFactory.getPair(tokenIn, path[1])
            ).getReserves();
            // sorts reserves 0 and 1 (tokenIn and WAVAX)
            (uint256 reserveIn, uint256 reserveMid1) = path[0] < path[1]
                ? (reserve0, reserve1)
                : (reserve1, reserve0);
            // output = ((inputAmount * reserveOut) / reserveOut) * 0.995 (max 0.5% slippage)
            uint256 amountOutMid = (initialBalance * reserveMid1 * 995) /
                (reserveIn * 1000);
            console.log(amountOutMid);

            // -- calculates minimum output for swap from WAVAX to tokenOut -- //
            // get reserves for WAVAX and tokenOut
            (uint256 reserve2, uint256 reserve3, ) = IJoePair(
                joeFactory.getPair(path[1], path[2])
            ).getReserves();
            // sorts reserves 1 and 2 (WAVAX and tokenOut)
            (uint256 reserveMid2, uint256 reserveOut) = path[1] < path[2]
                ? (reserve2, reserve3)
                : (reserve3, reserve2);
            // output = ((inputAmount * reserveOut) / reserveOut) * 0.995 (max 0.5% slippage)
            uint256 amountOutMin = (amountOutMid * reserveOut * 995) /
                (reserveMid2 * 1000); // max 0.5% slippage

            joeRouter.swapExactTokensForTokens(
                initialBalance,
                amountOutMin, // total ~1% slippage
                path,
                address(this),
                block.timestamp + 1 minutes
            );
        } else {
            path = new address[](2);
            path[0] = tokenIn;
            path[1] = tokenOut;

            // -- calculates minimum output for swap from tokenIn to tokenOut -- //
            // get reserves for tokenIn and tokenOut
            (uint256 reserve0, uint256 reserve1, ) = IJoePair(
                joeFactory.getPair(path[0], path[1])
            ).getReserves();
            // sorts reserves 0 and 1 (tokenIn and tokenOut)
            (uint256 reserveIn, uint256 reserveOut) = tokenIn < tokenOut
                ? (reserve0, reserve1)
                : (reserve1, reserve0);
            // output = ((inputAmount * reserveOut) / reserveOut) * 0.99 (max 1% slippage)
            uint256 amountOutMin = (initialBalance * reserveOut * 99) /
                (reserveIn * 100); // max 1% slippage

            joeRouter.swapExactTokensForTokens(
                initialBalance,
                amountOutMin,
                path,
                address(this),
                block.timestamp + 1 minutes
            );
        }

        require(
            IERC20(tokenOut).balanceOf(address(this)) > 0,
            "Didn't receive token"
        );

        // stake back into XJOE
        if (tokenOut == JOE_ADDRESS) {
            IBar(XJOE_ADDRESS).enter(
                IERC20(JOE_ADDRESS).balanceOf(address(this))
            );
            tokenOut = XJOE_ADDRESS;
        }

        emit Swapped(
            tokenIn,
            tokenOut,
            initialBalance,
            IERC20(tokenOut).balanceOf(address(this))
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

        initiator; // shh

        require(
            joeComptroller.isMarketListed(msg.sender),
            "untrusted message sender"
        );

        require(
            IERC20(token).balanceOf(address(this)) > 0,
            "Contract did not recieve flash token"
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

        // seperated to prevent stack too deep errors
        {
            uint256 repayAmount = IERC20(jTokenLiquidateUnderlying).balanceOf(
                address(this)
            );
            require(
                repayAmount > 0,
                "Contract did not recieve liquidateToken from swap"
            );

            // extra cautious, can be removed since liquidity is checked off-chain
            (, , uint256 short) = joeComptroller.getAccountLiquidity(borrower);
            require(short > 0, "insufficient shortfall");

            // approve jToken to take funds when liquidating
            IERC20(jTokenLiquidateUnderlying).approve(
                jTokenLiquidateAddress,
                repayAmount
            );

            // liquidate, should give some jTokens
            JToken(jTokenLiquidateAddress).liquidateBorrow(
                borrower,
                repayAmount,
                JToken(jTokenCollateral)
            );

            require(
                JToken(jTokenCollateral).balanceOf(address(this)) > 0,
                "No jCollateral was seized"
            );

            emit Liquidated(borrower, jTokenLiquidateAddress, repayAmount);

            // redeem jTokens for tokens
            JToken(jTokenCollateral).redeem(
                JToken(jTokenCollateral).balanceOf(address(this))
            );

            require(
                IERC20(jTokenCollateralUnderlying).balanceOf(address(this)) > 0,
                "No collateral was redeemed"
            );
        }

        // swap seizeToken for flashToken
        swapERC20(jTokenCollateralUnderlying, jTokenFlashLoanUnderlying);

        // approve Banker Joe to take flashToken repayment
        IERC20(token).approve(msg.sender, amount + fee);
        // seperated to prevent stack too deep errors
        {
            uint256 grossProfit = IERC20(jTokenFlashLoanUnderlying).balanceOf(
                address(this)
            );

            // this happens when slippage is low, fixed now so not necessary
            require(grossProfit > amount + fee, "not profitable");

            // send profits
            IERC20(jTokenFlashLoanUnderlying).transfer(
                owner,
                grossProfit - (amount + fee)
            );
        }

        return keccak256("ERC3156FlashBorrowerInterface.onFlashLoan");
    }

    receive() external payable {}

    fallback() external payable {}
}

// A contract used for testing
contract TestLiquidator is Liquidator {
    address public WAVAX = 0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7;

    constructor(
        address joeRouterAddress,
        address joeComptrollerAddress,
        address joeFactoryAddress
    ) Liquidator(joeRouterAddress, joeComptrollerAddress, joeFactoryAddress) {}

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

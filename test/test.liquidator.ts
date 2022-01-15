import * as dotenv from "dotenv";
import { ethers, network } from "hardhat";
import { SignerWithAddress } from "hardhat-deploy-ethers/src/signers";
import { Liquidator, TestLiquidator, JToken } from "../typechain/";
import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { GraphQLClient } from 'graphql-request';
import {
    JOE_ROUTER_ADDRESS, JOE_COMPTROLLER_ADDRESS, WAVAX_ADDRESS, WETH_ADDRESS, WBTC_ADDRESS, USDC_ADDRESS, USDT_ADDRESS, DAI_ADDRESS, LINK_ADDRESS, MIM_ADDRESS, XJOE_ADDRESS, jWAVAX_ADDRESS, jWETH_ADDRESS, jWBTC_ADDRESS, jUSDC_ADDRESS, jUSDT_ADDRESS, jDAI_ADDRESS, jLINK_ADDRESS, jMIM_ADDRESS, jXJOE_ADDRESS, ORACLE_ADDRESS, JOE_TO_ERC20, UNDERWATER_ACCOUNTS_QUERY, MARKET_QUERY, JOE_TO_JERC20, TRADER_JOE_LENDING_SUBGRAPH_URL
} from "../scripts/addresses";
import { findOptimalLiquidation } from "../scripts/utils";
// import { request, gql, GraphQLClient } from 'graphql-request';
// import {setUpUnderwarerAccount} from "./scripts/helpful-scripts";
// import { dataSource } from '@graphprotocol/graph-ts';
dotenv.config();

describe("Test Liquidation Bot", () => {
    let liquidator: SignerWithAddress;
    let underwater: SignerWithAddress;
    let otherUnderwater: SignerWithAddress;
    let poor: SignerWithAddress;

    let Liquidator: Liquidator;
    let testLiquidator: TestLiquidator;

    let WAVAX: Contract;
    let USDT: Contract;
    let USDC: Contract;
    let MIM: Contract;
    let WETH: Contract;
    let WBTC: Contract;
    let LINK: Contract;
    let DAI: Contract;
    let XJOE: Contract;

    let jWAVAX: Contract;
    let jUSDT: Contract;
    let jUSDC: Contract;
    let jMIM: Contract;
    let jWETH: Contract;
    let jWBTC: Contract;
    let jLINK: Contract;
    let jDAI: Contract;
    let jXJOE: Contract;

    let router: Contract;
    let comptroller: Contract;

    let priceOracle: Contract;

    const AVALANCHE_MAINNET_URL = process.env.AVALANCHE_MAINNET_URL!;

    beforeEach(async () => {
        // reset fork
        await ethers.provider.send(
            "hardhat_reset",
            [
                {
                    forking: {
                        jsonRpcUrl: AVALANCHE_MAINNET_URL,
                        blockNumber: 9500000
                    },
                },
            ],
        );

        // @ts-ignore
        [liquidator, underwater, otherUnderwater, poor] = await ethers.getSigners();


        // deploy contracts
        const liquidatorFactory = await ethers.getContractFactory("Liquidator", liquidator);
        const testLiquidatorFactory = await ethers.getContractFactory("TestLiquidator", liquidator);
        testLiquidator = await testLiquidatorFactory.deploy(JOE_ROUTER_ADDRESS, JOE_COMPTROLLER_ADDRESS)!;
        Liquidator = await liquidatorFactory.deploy(JOE_ROUTER_ADDRESS, JOE_COMPTROLLER_ADDRESS);

        WAVAX = await ethers.getContractAt("IERC20", WAVAX_ADDRESS);
        USDT = await ethers.getContractAt("IERC20", USDT_ADDRESS);
        USDC = await ethers.getContractAt("IERC20", USDC_ADDRESS);
        MIM = await ethers.getContractAt("IERC20", MIM_ADDRESS);
        WETH = await ethers.getContractAt("IERC20", WETH_ADDRESS);
        WBTC = await ethers.getContractAt("IERC20", WBTC_ADDRESS);
        XJOE = await ethers.getContractAt("IERC20", XJOE_ADDRESS);
        DAI = await ethers.getContractAt("IERC20", DAI_ADDRESS);
        LINK = await ethers.getContractAt("IERC20", LINK_ADDRESS);

        jWAVAX = await ethers.getContractAt("JTokenNative", jWAVAX_ADDRESS);
        jUSDT = await ethers.getContractAt("JToken", jUSDT_ADDRESS);
        jUSDC = await ethers.getContractAt("JToken", jUSDC_ADDRESS);
        jMIM = await ethers.getContractAt("JToken", jMIM_ADDRESS);
        jWETH = await ethers.getContractAt("JToken", jWETH_ADDRESS);
        jWBTC = await ethers.getContractAt("JToken", jWBTC_ADDRESS);
        jXJOE = await ethers.getContractAt("JToken", jXJOE_ADDRESS);
        jDAI = await ethers.getContractAt("JToken", jDAI_ADDRESS);
        jLINK = await ethers.getContractAt("JToken", jLINK_ADDRESS);

        router = await ethers.getContractAt("IJoeRouter02", JOE_ROUTER_ADDRESS);
        comptroller = await ethers.getContractAt("Joetroller", JOE_COMPTROLLER_ADDRESS);

        priceOracle = await ethers.getContractAt("PriceOracle", ORACLE_ADDRESS);


    });

    describe.skip("Deploying", () => {
        it("Should set the right owner", async () => {
            expect(await Liquidator.owner()).to.equal(liquidator.address)
        });
    });

    describe.skip("Swapping", () => {
        it.skip("Swapping with 0 balance should fail", async () => {
            let output1 = await testLiquidator._swapFromNative(USDT_ADDRESS);
            await expect(output1.wait()).to.be.reverted;
            let output2 = await testLiquidator._swapERC20(USDT_ADDRESS, WETH_ADDRESS);
            await expect(output2.wait()).to.be.reverted;
            let output3 = await testLiquidator._swapToNative(USDT_ADDRESS);
            await expect(output3.wait()).to.be.reverted;
        });

        // AVAX -> USDT, USDT -> WETH, WETH -> AVAX, everything should work
        it.skip("Swapping with enough balance should work", async () => {
            let tx = await liquidator.sendTransaction({
                to: testLiquidator.address,
                value: ethers.utils.parseEther("1.0")
            });
            tx.wait();
            expect((await ethers.provider.getBalance(testLiquidator.address)).toString()).to.eq(ethers.utils.parseEther("1.0"));

            let output1 = await testLiquidator._swapFromNative(USDT_ADDRESS);
            await expect(output1.wait()).to.be.ok;
            expect(await USDT.balanceOf(testLiquidator.address)).gt('0');

            let output2 = await testLiquidator._swapERC20(USDT_ADDRESS, WETH_ADDRESS);
            await expect(output2.wait()).to.be.ok;

            expect(await USDT.balanceOf(testLiquidator.address)).eq('0');
            expect(await WETH.balanceOf(testLiquidator.address)).gt('0');

            let output3 = await testLiquidator._swapToNative(WETH_ADDRESS);
            await expect(output3.wait()).to.be.ok;
            expect(await WETH.balanceOf(testLiquidator.address)).eq('0');
        });

        it("Swapping tokens w/o direct path should work", async () => {
            let tx = await liquidator.sendTransaction({
                to: testLiquidator.address,
                value: ethers.utils.parseEther("1.0")
            });
            tx.wait();
            expect((await ethers.provider.getBalance(testLiquidator.address)).toString()).to.eq(ethers.utils.parseEther("1.0"));

            let output1 = await testLiquidator._swapFromNative(USDT_ADDRESS);
            await expect(output1.wait()).to.be.ok;
            expect(await USDT.balanceOf(testLiquidator.address)).gt('0');

            let output2 = await testLiquidator._swapERC20(USDT_ADDRESS, USDC_ADDRESS);
            await expect(output2.wait()).to.be.ok;

            expect(await USDT.balanceOf(testLiquidator.address)).eq('0');
            expect(await USDC.balanceOf(testLiquidator.address)).gt('0');

            let output3 = await testLiquidator._swapERC20(USDC_ADDRESS, LINK_ADDRESS);
            await expect(output3.wait()).to.be.ok;

            expect(await USDC.balanceOf(testLiquidator.address)).eq('0');
            expect(await LINK.balanceOf(testLiquidator.address)).gt('0');

            let output4 = await testLiquidator._swapToNative(LINK_ADDRESS);
            await expect(output4.wait()).to.be.ok;
            expect(await LINK.balanceOf(testLiquidator.address)).eq('0');
        })
    });

    describe.skip("Setting up underwater account and liquidating single position", async () => {

        it('deposit and accrue interest; liquidate', async () => {
            // need timestamp for timelimit input in swap function 
            let timestamp = (
                await ethers.provider.getBlock(
                    await ethers.provider.getBlockNumber()
                )
            ).timestamp;

            // swap for weth, will be depositing weth as collateral
            await router.swapExactAVAXForTokens(
                1,
                [WAVAX_ADDRESS, WETH_ADDRESS],
                underwater.address,
                timestamp + 60,
                { value: ethers.utils.parseEther("10.0") }
            );

            let WETH_balance = await WETH.balanceOf(underwater.address);

            // balance of weth > 0, weth deposited in TJ = 0
            expect(WETH_balance).gt('0');
            expect(await jWETH.balanceOf(underwater.address)).eq('0');

            // deposit all weth into TJ
            await WETH.connect(underwater).approve(jWETH_ADDRESS, WETH_balance);
            await jWETH.connect(underwater).mint(WETH_balance);

            // balance of weth = 0, deposited weth > 0
            expect(await WETH.balanceOf(underwater.address)).eq('0');
            expect(await jWETH.balanceOf(underwater.address)).gt('0');

            await comptroller.connect(underwater).enterMarkets([jWETH_ADDRESS]);

            let before = await jWETH.callStatic.balanceOfUnderlying(underwater.address);

            // accrues interest, weth has low interest, so we pass time
            await ethers.provider.send("evm_increaseTime", [60]);
            await jWETH.accrueInterest();

            let now = await jWETH.callStatic.balanceOfUnderlying(underwater.address);

            // interest accrual worked
            expect(now).gt(before);
            expect(now).gt(WETH_balance);
            expect(await comptroller.checkMembership(underwater.address, jWETH_ADDRESS)).eq(true);

            //// borrow max funds
            // get max funds
            let [err1, liquidity1, shortfall] = await comptroller.getAccountLiquidity(underwater.address);
            // no shortfall yet, no error pls
            expect(shortfall).eq('0');
            expect(err1).eq('0');

            // get price of borrow token.
            let LINKprice = await priceOracle.getUnderlyingPrice(jLINK.address);

            // calculate max borrow, need big ints else overflow
            let max_borrow_amount = BigInt(liquidity1) * BigInt(10 ** 18) / BigInt(LINKprice);

            // borrow max borrow amount
            await jLINK.connect(underwater).borrow(max_borrow_amount);

            // make sure some funds were borrowed
            expect(await LINK.balanceOf(underwater.address)).gt('0');

            // pass time
            await ethers.provider.send("evm_increaseTime", [60 * 60 * 24 * 200]);

            // update borrow balance ( apply interest )
            // maybe can use accrueInterest instead?
            // await jUSDT.borrowBalanceCurrent(underwater.address);
            await jLINK.accrueInterest();

            // "0" + is a test to see if a 0 in the front throws an error
            // repay amount is wrong, does not account for decimals
            let repayAmount = BigNumber.from(await jLINK.callStatic.borrowBalanceCurrent(underwater.address)).div(2);
            console.log(repayAmount);

            // no error pls; some shortfall tho
            let [err2, liquidity2, someShortfall] = await comptroller.getAccountLiquidity(underwater.address);
            expect(err2).eq('0');
            expect(someShortfall).gt('0');

            await Liquidator.connect(liquidator).liquidateLoan(underwater.address, repayAmount, jLINK_ADDRESS, LINK_ADDRESS, jWETH_ADDRESS, WETH_ADDRESS, jUSDC_ADDRESS, USDC_ADDRESS);

            let profit = await USDC.balanceOf(liquidator.address);
            expect(profit).gt('0');
            console.log(`profit: ${(profit / 10 ** (await USDC.decimals())).toString()}`);

        });
    });

    describe.skip("Optimal Liquidations", async () => {
        it("case 1: single deposit is optimal", async () => {
            // poor account, not enough value to liquidate
            let timestamp = (
                await ethers.provider.getBlock(
                    await ethers.provider.getBlockNumber()
                )
            ).timestamp;
            await router.swapExactAVAXForTokens(
                1,
                [WAVAX_ADDRESS, WETH_ADDRESS],
                poor.address,
                timestamp + 60,
                { value: ethers.utils.parseEther("1.0") }
            );
            let poor_WETH_balance = await WETH.balanceOf(poor.address);
            await WETH.connect(poor).approve(jWETH_ADDRESS, poor_WETH_balance);
            await jWETH.connect(poor).mint(poor_WETH_balance);
            await comptroller.connect(poor).enterMarkets([jWETH_ADDRESS]);

            // 1 deosit, 1 borrow acct
            await router.swapExactAVAXForTokens(
                1,
                [WAVAX_ADDRESS, WETH_ADDRESS],
                underwater.address,
                timestamp + 60,
                { value: ethers.utils.parseEther("150.0") }
            );
            let underwater_WETH_balance = await WETH.balanceOf(underwater.address);
            await WETH.connect(underwater).approve(jWETH_ADDRESS, underwater_WETH_balance);
            await jWETH.connect(underwater).mint(underwater_WETH_balance);
            await comptroller.connect(underwater).enterMarkets([jWETH_ADDRESS]);

            await router.swapExactAVAXForTokens(
                1,
                [WAVAX_ADDRESS, WETH_ADDRESS],
                otherUnderwater.address,
                timestamp + 60,
                { value: ethers.utils.parseEther("50.0") }
            );
            let other_WETH_balance = await WETH.balanceOf(otherUnderwater.address);
            await router.swapExactAVAXForTokens(
                1,
                [WAVAX_ADDRESS, WBTC_ADDRESS],
                otherUnderwater.address,
                timestamp + 60,
                { value: ethers.utils.parseEther("50.0") }
            );
            let other_WBTC_balance = await WBTC.balanceOf(otherUnderwater.address);
            let other_WAVAX_balance = await ethers.utils.parseEther("50.0");
            // deposit all into TJ
            await WETH.connect(otherUnderwater).approve(jWETH_ADDRESS, other_WETH_balance);
            await WBTC.connect(otherUnderwater).approve(jWBTC_ADDRESS, other_WBTC_balance);
            await WAVAX.connect(otherUnderwater).approve(jWAVAX_ADDRESS, other_WAVAX_balance);
            await jWETH.connect(otherUnderwater).mint(other_WETH_balance);
            await jWBTC.connect(otherUnderwater).mint(other_WBTC_balance);
            await jWAVAX.connect(otherUnderwater).mint(other_WAVAX_balance);

            await comptroller.connect(otherUnderwater).enterMarkets([jWETH_ADDRESS, jWBTC_ADDRESS, jWAVAX_ADDRESS]);

            //// borrow max funds
            // get max funds
            let [, liquidity1, ,] = await comptroller.getAccountLiquidity(underwater.address);
            let [, liquidity2, ,] = await comptroller.getAccountLiquidity(otherUnderwater.address);
            let [, liquidity3, ,] = await comptroller.getAccountLiquidity(poor.address);

            // get price of borrow token.
            let USDTprice = await priceOracle.getUnderlyingPrice(jUSDT.address);

            // calculate max borrow, need big ints else overflow
            let max_borrow_amount_underwater = BigInt(liquidity1) * BigInt(10 ** 18) / BigInt(USDTprice);
            let max_borrow_amount_other = BigInt(liquidity2) * BigInt(10 ** 18) / BigInt(USDTprice);
            let max_borrow_amount_poor = BigInt(liquidity3) * BigInt(10 ** 18) / BigInt(USDTprice);

            // borrow max borrow amount
            await jUSDT.connect(underwater).borrow(max_borrow_amount_underwater);
            await jUSDT.connect(otherUnderwater).borrow(max_borrow_amount_other);
            await jUSDT.connect(poor).borrow(max_borrow_amount_poor);

            // pass time
            await ethers.provider.send("evm_increaseTime", [60 * 60 * 24 * 100]);

            // update borrow balance ( apply interest )
            // maybe can use accrueInterest instead? yes.
            await jUSDT.accrueInterest();

            // some shortfall tho
            let [, , someShortfall1] = await comptroller.getAccountLiquidity(underwater.address);
            let [, , someShortfall2] = await comptroller.getAccountLiquidity(otherUnderwater.address);
            let [, , someShortfall3] = await comptroller.getAccountLiquidity(poor.address);

            // things worked
            expect(someShortfall1).gt('0');
            expect(someShortfall2).gt('0');
            expect(someShortfall3).gt('0');

            // determine which account to liquidate, and which position? max profit
            // sort borrowed
            // sort collateral
            // 0.5*biggest borrow >= biggest collat?
            // close biggest borrow, take biggest collat
            // else: close biggest collat amount of biggest borrow, closing same amount of biggest collat
            // profit = 2.5% of repay amount
            // calculate profit for all positions, liquidation position with max profit might be kind of a tall order/time consuming

            // did not test if liquidation is optimal here, findOptimalLiquidation takes graphql data as input and I have not set up a local node to query my set up underwater accounts
            // TODO
        })

        it("case 2: multiple deposit is optimal", async () => {

        });

        it("case 3: no profitable liquidations", async () => {

        });

        it("case 4: randomized testing (pick random tokens to deposit and borrow, TODO", async () => {

        });
    });

    describe("Liquidate real positions", () => {
        it("0x343ba440db35997170cc6402692a0803c360c48c", async () => {
            await network.provider.request({
                method: "hardhat_impersonateAccount",
                params: ["0x609c81644a2A85751F6F69C2f98F64f6D715b016"],
            });
            const signer = await ethers.getSigner("0x609c81644a2A85751F6F69C2f98F64f6D715b016");
            expect((await ethers.provider.getBalance(signer.address))).to.be.gt("0");

            const client = new GraphQLClient(TRADER_JOE_LENDING_SUBGRAPH_URL);
            let underwaterAccountsData = await client.request(UNDERWATER_ACCOUNTS_QUERY);
            let marketData = await client.request(MARKET_QUERY);

            if (underwaterAccountsData["accounts"].length > 0) {
                let [liquidationToken, seizeToken, flashToken, amountToFlashloan, liquidatee] = findOptimalLiquidation(underwaterAccountsData, marketData);
                // token not used so far as seize or repay, prefer some tokens over others as theyre more liquid so take first in list also don't have to deal with issue of no direct paths with wavax, usdc, usdt

                let balanceBefore = await USDC.balanceOf(liquidator.address);

                // get addresses using name
                let liquidationTokenAddress = JOE_TO_JERC20[liquidationToken];
                let seizeTokenAddress = JOE_TO_JERC20[seizeToken];
                let flashTokenAddress = JOE_TO_JERC20[flashToken];
                let liquidationTokenUnderlyingAddress = JOE_TO_ERC20[liquidationToken];
                let seizeTokenUnderlyingAddress = JOE_TO_ERC20[seizeToken];
                let flashTokenUnderlyingAddress = JOE_TO_ERC20[flashToken];
                console.log(liquidationToken, seizeToken, flashToken, amountToFlashloan, liquidatee);
                await Liquidator.connect(signer).liquidateLoan(liquidatee, amountToFlashloan, liquidationTokenAddress, liquidationTokenUnderlyingAddress, seizeTokenAddress, seizeTokenUnderlyingAddress, flashTokenAddress, flashTokenUnderlyingAddress, { gasLimit: 1375015 })

                let profit = (await USDC.balanceOf(liquidator.address)) - balanceBefore;


                console.log(profit);




            }
        });
    });




});
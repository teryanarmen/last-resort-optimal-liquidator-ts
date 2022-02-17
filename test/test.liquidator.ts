import * as dotenv from "dotenv";
import { ethers } from "hardhat";
import { SignerWithAddress } from "hardhat-deploy-ethers/src/signers";
import { Liquidator, TestLiquidator } from "../typechain";
import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { GraphQLClient } from 'graphql-request';
import {
    JOE_FACTORY_ADDRESS, JOE_ROUTER_ADDRESS, JOE_COMPTROLLER_ADDRESS, WAVAX_ADDRESS, WETH_ADDRESS, WBTC_ADDRESS, USDC_ADDRESS, USDT_ADDRESS, DAI_ADDRESS, LINK_ADDRESS, MIM_ADDRESS, XJOE_ADDRESS, jWAVAX_ADDRESS, jWETH_ADDRESS, jWBTC_ADDRESS, jUSDC_ADDRESS, jUSDT_ADDRESS, jDAI_ADDRESS, jLINK_ADDRESS, jMIM_ADDRESS, jXJOE_ADDRESS, ORACLE_ADDRESS, JOE_TO_ERC20, UNDERWATER_ACCOUNTS_QUERY, MARKET_QUERY, JOE_TO_JERC20, TRADER_JOE_LENDING_SUBGRAPH_URL
} from "../scripts/constants";
import { findOptimalLiquidation } from "../scripts/utils";

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
    let factory: Contract;

    let priceOracle: Contract;

    const AVALANCHE_MAINNET_URL = process.env.AVALANCHE_MAINNET_URL!;

    beforeEach(async () => {
        // resets fork before each describe block
        await ethers.provider.send(
            "hardhat_reset",
            [
                {
                    forking: {
                        jsonRpcUrl: AVALANCHE_MAINNET_URL,
                        // blockNumber: 10420000

                    },
                },
            ],
        );

        // get all the accounts we will use for testing
        // @ts-ignore
        [liquidator, underwater, otherUnderwater, poor] = await ethers.getSigners();


        // deploy contracts
        const liquidatorFactory = await ethers.getContractFactory("Liquidator", liquidator);
        const testLiquidatorFactory = await ethers.getContractFactory("TestLiquidator", liquidator);
        testLiquidator = await testLiquidatorFactory.deploy(JOE_ROUTER_ADDRESS, JOE_COMPTROLLER_ADDRESS, JOE_FACTORY_ADDRESS)!;
        Liquidator = await liquidatorFactory.deploy(JOE_ROUTER_ADDRESS, JOE_COMPTROLLER_ADDRESS, JOE_FACTORY_ADDRESS);

        // get contracts that are already deployed
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
        factory = await ethers.getContractAt("IJoeFactory", JOE_FACTORY_ADDRESS);

        priceOracle = await ethers.getContractAt("PriceOracle", ORACLE_ADDRESS);


    });

    describe.skip("Deploying", () => {
        // simply check that the right owner is set
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
            // give contract some avax
            let tx = await liquidator.sendTransaction({
                to: testLiquidator.address,
                value: ethers.utils.parseEther("1.0")
            });
            tx.wait();
            // eth balance == amount of avax we just gave
            expect((await ethers.provider.getBalance(testLiquidator.address)).toString()).to.eq(ethers.utils.parseEther("1.0"));

            // tests swap from native to token, swap token to token, and swap token to native, 
            // we only need token to token though
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

    describe.skip("Liquidate real positions", () => {
        it("index.ts", async () => {
            const signer = liquidator; // change name, unnecessary
            expect((await ethers.provider.getBalance(signer.address))).to.be.gt("0");

            // get graphql client, then request underwater account data and market data
            const client = new GraphQLClient(TRADER_JOE_LENDING_SUBGRAPH_URL);
            let underwaterAccountsData = await client.request(UNDERWATER_ACCOUNTS_QUERY);
            let marketData = await client.request(MARKET_QUERY);
            // all underwater account that match query
            let underwaterAccounts = underwaterAccountsData["accounts"];

            // if underwater accounts exist
            if (underwaterAccountsData["accounts"].length > 0) {
                do {
                    // get optimal liquidation
                    var [liquidationToken, seizeToken, flashToken, amountToFlashloan, liquidatee, account] = findOptimalLiquidation(underwaterAccounts, marketData);

                    // check whether account is actually underwater, some data on the subgraph is inaccurate
                    if ((await comptroller.getAccountLiquidity(liquidatee))[2] == 0) {
                        // if not actually underwater, remove from array and check again
                        underwaterAccounts = underwaterAccounts.filter((x: any) => ![account].includes(x));
                        continue;
                    }
                    // once found, move on
                    break;
                }
                while (underwaterAccounts.length > 0); // go until no accounts left

                let balanceBefore = await USDC.balanceOf(liquidator.address);

                // get addresses using name in object, names come up as j"Token" and depending on the object will either give jToken address or just token address
                let liquidationTokenAddress = JOE_TO_JERC20[liquidationToken];
                let seizeTokenAddress = JOE_TO_JERC20[seizeToken];
                let flashTokenAddress = JOE_TO_JERC20[flashToken];
                let liquidationTokenUnderlyingAddress = JOE_TO_ERC20[liquidationToken];
                let seizeTokenUnderlyingAddress = JOE_TO_ERC20[seizeToken];
                let flashTokenUnderlyingAddress = JOE_TO_ERC20[flashToken];

                console.log(liquidationToken, seizeToken, flashToken, amountToFlashloan, liquidatee);

                // liquidate!
                await Liquidator.connect(signer).liquidateLoan(liquidatee, amountToFlashloan, liquidationTokenAddress, liquidationTokenUnderlyingAddress, seizeTokenAddress, seizeTokenUnderlyingAddress, flashTokenAddress, flashTokenUnderlyingAddress, { gasLimit: 1375015 });

                // $$$
                let profit = (await USDC.balanceOf(liquidator.address)) - balanceBefore;

                console.log(profit);
            }
        });
    });

});
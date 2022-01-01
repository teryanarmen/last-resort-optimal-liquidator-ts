import * as dotenv from 'dotenv';
import { ethers } from "hardhat";
import { Wallet, BigNumber } from "ethers";
import {
    LIQUIDATOR_ADDRESS, JOE_TO_ERC20, JOE_TO_JERC20
} from "./addresses";
import { findOptimalLiquidation } from "./utils";
import { gql, GraphQLClient } from 'graphql-request';
dotenv.config();


// const AVALANCHE_MAINNET_URL = process.env.AVA ANCHE_MAINNET_URL!;

const TRADER_JOE_LENDING_SUBGRAPH_URL = (
    "https://api.thegraph.com/subgraphs/name/traderjoe-xyz/lending");

async function getMinBalance() {
    return BigNumber.from(ethers.utils.formatUnits(await ethers.provider.getGasPrice(), "gwei")).mul(5);
}
const min_balance_borrowed = getMinBalance();

const tokenNames = ["jAVAX", "jWETH", "jUSDT", "jWBTC", "jUSDC", "jMIM", "jDAI", "jLINK", "jXJOE"];

const UNDERWATER_ACCOUNTS_QUERY = gql`
{
    accounts(where: {health_gt: 0, health_lt: 1, totalBorrowValueInUSD_gt: ${min_balance_borrowed}}, orderBy: totalBorrowValueInUSD, orderDirection: desc) {
        id
        health
        totalBorrowValueInUSD
        totalCollateralValueInUSD
        tokens {
            id
            symbol
            market {
                underlyingPriceUSD
            }
            supplyBalanceUnderlying
            borrowBalanceUnderlying
            enteredMarket
        }
    }
}
`;

const PRIVATE_KEY = process.env.PRIVATE_KEY!;
const deployer = new Wallet(PRIVATE_KEY);

async function main() {
    const liquidator = await ethers.getContractAt("Liquidator", LIQUIDATOR_ADDRESS);
    liquidator.connect(deployer);
    const client = new GraphQLClient(TRADER_JOE_LENDING_SUBGRAPH_URL);

    while (true) {
        let data = await client.request(UNDERWATER_ACCOUNTS_QUERY);
        if (data["accounts"].length > 0) {
            let [repayToken, seizeToken, amountToLiquidate, liquidatee] = findOptimalLiquidation(data);
            let flashToken = tokenNames.filter(x => ![repayToken.substring(1), seizeToken.substring(1)].includes(x))[0];

            let repayTokenAddress = JOE_TO_ERC20[repayToken];
            let seizeTokenAddress = JOE_TO_ERC20[seizeToken];
            let flashTokenAddress = JOE_TO_ERC20[flashToken];
            let repayTokenUnderlyingAddress = JOE_TO_JERC20[repayTokenAddress];
            let seizeTokenUnderlyingAddress = JOE_TO_JERC20[seizeTokenAddress];
            let flashTokenUnderlyingAddress = JOE_TO_JERC20[flashTokenAddress];

            liquidator.liquidateLoan(liquidatee, amountToLiquidate, repayTokenAddress, repayTokenUnderlyingAddress, seizeTokenAddress, seizeTokenUnderlyingAddress, flashTokenAddress, flashTokenUnderlyingAddress);
        }
    }
}

main();
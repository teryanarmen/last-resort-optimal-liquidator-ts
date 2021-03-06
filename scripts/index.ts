import * as dotenv from 'dotenv';
import { ethers } from "hardhat";
import { Wallet, BigNumber } from "ethers";
import {
    TRADER_JOE_LENDING_SUBGRAPH_URL, TRADER_JOE_EXCHANGE_SUBGRAPH_URL, LIQUIDATOR_ADDRESS, JOE_TO_ERC20, JOE_TO_JERC20, AVALANCHE_MAINNET_URL, UNDERWATER_ACCOUNTS_QUERY, MARKET_QUERY
} from "./constants";
import { findOptimalLiquidation } from "./utils";
import { GraphQLClient } from 'graphql-request';
dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY!;

async function main() {
    // set up provider, deployer from private key, liquidator contract and a client to query Trader Joe Lending subgraph
    const provider = await ethers.getDefaultProvider(AVALANCHE_MAINNET_URL);
    const deployer = new Wallet(PRIVATE_KEY, provider);
    const liquidator = await ethers.getContractAt("Liquidator", LIQUIDATOR_ADDRESS);
    const client = new GraphQLClient(TRADER_JOE_LENDING_SUBGRAPH_URL);

    let i = 0;

    while (i >= 0) { // CHANGE 1 TO DIFF NUMBER IF YOU WANT TO RUN CONTINUOUSLY
        i++;
        // data for accounts and prices, accounts needed to make liquidation, prices needed to account for decimals
        let underwaterAccountsData = await client.request(UNDERWATER_ACCOUNTS_QUERY);
        let marketData = await client.request(MARKET_QUERY);

        // length > 0 only if if there are any underwater that match our query
        if (underwaterAccountsData["accounts"].length > 0) {

            let [liquidationToken, seizeToken, flashToken, amountToFlashloan, liquidatee] = findOptimalLiquidation(underwaterAccountsData, marketData);
            // token not used so far as seize or repay, prefer some tokens over others as theyre more liquid so take first in list also don't have to deal with issue of no direct paths with wavax, usdc, usdt

            // get addresses using name
            let liquidationTokenAddress = JOE_TO_JERC20[liquidationToken];
            let seizeTokenAddress = JOE_TO_JERC20[seizeToken];
            let flashTokenAddress = JOE_TO_JERC20[flashToken];
            let liquidationTokenUnderlyingAddress = JOE_TO_ERC20[liquidationToken];
            let seizeTokenUnderlyingAddress = JOE_TO_ERC20[seizeToken];
            let flashTokenUnderlyingAddress = JOE_TO_ERC20[flashToken];

            // make money
            await liquidator.connect(deployer).liquidateLoan(liquidatee, amountToFlashloan, liquidationTokenAddress, liquidationTokenUnderlyingAddress, seizeTokenAddress, seizeTokenUnderlyingAddress, flashTokenAddress, flashTokenUnderlyingAddress, { gasLimit: 1375015 });

            console.log("got one?");
        }
    }
}

main();
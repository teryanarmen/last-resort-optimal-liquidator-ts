import { ethers } from "hardhat";
import {
    LIQUIDATOR_ADDRESS, AVALANCHE_MAINNET_URL, USDT_ADDRESS
} from "./addresses";



async function main() {
    const provider = await ethers.getDefaultProvider(AVALANCHE_MAINNET_URL);
    const liquidator = await ethers.getContractAt("Liquidator", LIQUIDATOR_ADDRESS);
    const USDT = await ethers.getContractAt("IERC20", USDT_ADDRESS);
    await liquidator.on("Swapped", (fromTokenAddress, toTokenAddress, fromTokenAmount, toTokensAmount) => {
        console.log("liquidator");
        console.log({
            fromTokenAddress: fromTokenAddress,
            toTokenAddress: toTokenAddress,
            fromTokenAmount: fromTokenAmount,
            toTokensAmoun: toTokensAmount
        });
    });

}

main();


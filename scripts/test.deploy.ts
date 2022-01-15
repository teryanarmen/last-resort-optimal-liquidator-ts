import * as dotenv from 'dotenv';
import { ethers } from "hardhat";
import { Wallet } from "ethers";
import { JOE_ROUTER_ADDRESS, JOE_COMPTROLLER_ADDRESS } from "./addresses";
dotenv.config();

const main = async (): Promise<any> => {
    const PRIVATE_KEY = process.env.TEST_KEY!;
    const deployer = new Wallet(PRIVATE_KEY, await ethers.getDefaultProvider('https://api.avax-test.network/ext/bc/C/rpc'));
    const liquidator = await (await ethers.getContractFactory("Liquidator", deployer)).deploy(JOE_ROUTER_ADDRESS, JOE_COMPTROLLER_ADDRESS);
    // @ts-ignore
    await liquidator.deployed();
    console.log("Liquidator deployed to:", liquidator.address);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    });
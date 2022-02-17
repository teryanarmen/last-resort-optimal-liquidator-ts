import * as dotenv from 'dotenv';
import { ethers } from "hardhat";
import { Wallet } from "ethers";
import { JOE_ROUTER_ADDRESS, JOE_COMPTROLLER_ADDRESS, JOE_FACTORY_ADDRESS } from "./constants";
dotenv.config();

const main = async (): Promise<any> => {
    const PRIVATE_KEY = process.env.PRIVATE_KEY!;
    const deployer = new Wallet(PRIVATE_KEY, await ethers.getDefaultProvider('https://api.avax.network/ext/bc/C/rpc'));
    const liquidator = await (await ethers.getContractFactory("Liquidator", deployer)).deploy(JOE_FACTORY_ADDRESS, JOE_ROUTER_ADDRESS, JOE_COMPTROLLER_ADDRESS);
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
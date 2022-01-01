import * as dotenv from 'dotenv';
import { ethers } from "hardhat";
import { Wallet } from "ethers";
dotenv.config();

const main = async (): Promise<any> => {
    const PRIVATE_KEY = process.env.PRIVATE_KEY!;
    const deployer = new Wallet(PRIVATE_KEY);
    const Liquidator = await ethers.getContractFactory("Liquidator", deployer);
    // @ts-ignore
    const liquidator = await Liquidator.deploy();
    await liquidator.deployed();
    console.log("Liquidator deployed to:", liquidator.address);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    });
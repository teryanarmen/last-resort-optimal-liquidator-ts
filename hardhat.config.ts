import { task } from "hardhat/config";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import "@nomiclabs/hardhat-ethers";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-waffle";
import { HardhatUserConfig } from "hardhat/types";
import * as dotenv from "dotenv";
dotenv.config();

// When using the hardhat network, you may choose to fork Fuji or Avalanche Mainnet
// This will allow you to debug contracts using the hardhat network while keeping the current network state
// To enable forking, turn one of these booleans on, and then run your tasks/scripts using ``--network hardhat``
// For more information go to the hardhat guide
// https://hardhat.org/hardhat-network/
// https://hardhat.org/guides/mainnet-forking.html

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  solidity: {
    compilers: [
      {
        version: "0.5.16"
      },
      {
        version: "0.6.2"
      },
      {
        version: "0.6.4"
      },
      {
        version: "0.7.0"
      },
      {
        version: "0.8.0"
      }
    ]
  },
  networks: {
    hardhat: {
      gasPrice: 23015607032,
      chainId: 43114, //Only specify a chainId if we are not forking
      throwOnTransactionFailures: false,
      loggingEnabled: true,
      forking: {
        url: 'https://api.avax.network/ext/bc/C/rpc',
        enabled: true,
        blockNumber: 8000000
      }
    },
    fuji: {
      url: 'https://api.avax-test.network/ext/bc/C/rpc',
      gasPrice: 225000000000,
      gasMultiplier: 1.1,
      minGasPrice: 50000000000,
      blockGasLimit: 12500000,
      chainId: 43113,
      accounts: []
    },
    mainnet: {
      url: 'https://api.avax.network/ext/bc/C/rpc',
      gasPrice: 'auto',
      chainId: 43114,
      accounts: []
    }
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v5"
  }
}

export default config;
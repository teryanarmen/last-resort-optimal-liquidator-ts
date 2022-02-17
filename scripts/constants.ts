import { gql } from 'graphql-request';

export const LIQUIDATOR_ADDRESS = "0x0000000000000000000000000000000000000000"; // DEPLOY AND CHANGE ADDRESS
export const TEST_LIQUIDATOR_ADDRESS = "0x0000000000000000000000000000000000000000";

export const AVALANCHE_MAINNET_URL = "https://api.avax.network/ext/bc/C/rpc";
export const AVALANCHE_FUJI_URL = "https://api.avax-test.network/ext/bc/C/rpc";

export const TRADER_JOE_LENDING_SUBGRAPH_URL = "https://api.thegraph.com/subgraphs/name/traderjoe-xyz/lending";
export const TRADER_JOE_EXCHANGE_SUBGRAPH_URL = "https://api.thegraph.com/subgraphs/name/traderjoe-xyz/exchange";

export const JOE_ROUTER_ADDRESS = "0x60aE616a2155Ee3d9A68541Ba4544862310933d4";
export const JOE_COMPTROLLER_ADDRESS = "0xdc13687554205E5b89Ac783db14bb5bba4A1eDaC";
export const JOE_FACTORY_ADDRESS = "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10";

export const WAVAX_ADDRESS = "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7";
export const WETH_ADDRESS = "0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab";
export const WBTC_ADDRESS = "0x50b7545627a5162f82a992c33b87adc75187b218";
export const USDC_ADDRESS = "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664";
export const USDT_ADDRESS = "0xc7198437980c041c805a1edcba50c1ce5db95118";
export const DAI_ADDRESS = "0xd586e7f844cea2f87f50152665bcbc2c279d8d70";
export const LINK_ADDRESS = "0x5947bb275c521040051d82396192181b413227a3";
export const MIM_ADDRESS = "0x130966628846bfd36ff31a822705796e8cb8c18d";
export const XJOE_ADDRESS = "0x57319d41f71e81f3c65f2a47ca4e001ebafd4f33";

export const jWAVAX_ADDRESS = "0xC22F01ddc8010Ee05574028528614634684EC29e";
export const jWETH_ADDRESS = "0x929f5caB61DFEc79a5431a7734a68D714C4633fa";
export const jWBTC_ADDRESS = "0x3fE38b7b610C0ACD10296fEf69d9b18eB7a9eB1F";
export const jUSDC_ADDRESS = "0xEd6AaF91a2B084bd594DBd1245be3691F9f637aC";
export const jUSDT_ADDRESS = "0x8b650e26404AC6837539ca96812f0123601E4448";
export const jDAI_ADDRESS = "0xc988c170d0E38197DC634A45bF00169C7Aa7CA19";
export const jLINK_ADDRESS = "0x585E7bC75089eD111b656faA7aeb1104F5b96c15";
export const jMIM_ADDRESS = "0xcE095A9657A02025081E0607c8D8b081c76A75ea";
export const jXJOE_ADDRESS = "0xC146783a59807154F92084f9243eb139D58Da696";

export const ORACLE_ADDRESS = "0xe34309613B061545d42c4160ec4d64240b114482";

export const JOE_TO_ERC20: any = {
    "jAVAX": WAVAX_ADDRESS,
    "jWETH": WETH_ADDRESS,
    "jWBTC": WBTC_ADDRESS,
    "jUSDC": USDC_ADDRESS,
    "jUSDT": USDT_ADDRESS,
    "jDAI": DAI_ADDRESS,
    "jLINK": LINK_ADDRESS,
    "jMIM": MIM_ADDRESS,
    "jXJOE": XJOE_ADDRESS,
};

export const JOE_TO_JERC20: any = {
    "jAVAX": jWAVAX_ADDRESS,
    "jWETH": jWETH_ADDRESS,
    "jWBTC": jWBTC_ADDRESS,
    "jUSDC": jUSDC_ADDRESS,
    "jUSDT": jUSDT_ADDRESS,
    "jDAI": jDAI_ADDRESS,
    "jLINK": jLINK_ADDRESS,
    "jMIM": jMIM_ADDRESS,
    "jXJOE": jXJOE_ADDRESS,
};

export const DECIMALS_ERC20: any = {
    "jAVAX": 18,
    "jWETH": 18,
    "jWBTC": 8,
    "jUSDC": 6,
    "jUSDT": 6,
    "jDAI": 18,
    "jLINK": 18,
    "jMIM": 18,
    "jXJOE": 18,
}

// some error with the subgraph gives a bunch of accounts that borrow nothing with tons of collateral a health score very near 0, so to exclude those min health score of 0.1 is taken. This should not limit liquidations.
export const UNDERWATER_ACCOUNTS_QUERY = gql`
{
    accounts(where: {health_gt: 0.1, health_lt: 1, totalCollateralValueInUSD_gt: 0}, orderBy: totalCollateralValueInUSD, orderDirection: asc, first: 8) {
        id
        health
        totalBorrowValueInUSD
        totalCollateralValueInUSD
        tokens {
            symbol
            market {
                underlyingPriceUSD
            }
            supplyBalanceUnderlying
            borrowBalanceUnderlying
            enteredMarket
        }
    }

}`;

export const MARKET_QUERY = gql`
{
    markets {
      id
      symbol
      underlyingPriceUSD
      underlyingDecimals
    }
}
`
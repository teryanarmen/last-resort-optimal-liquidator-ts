import { findOptimalLiquidation } from "../scripts/utils";
import { JOE_TO_ERC20, JOE_TO_JERC20 } from "../scripts/addresses";

// used to test the findOptimalLiquidation
let data = {
    "accounts": [
        {
            "health": "0.400682219189110251",
            "id": "0x3b425b9d32e1d12bf02b70ad14ff7164533b4208",
            "tokens": [
                {
                    "borrowBalanceUnderlying": "0",
                    "enteredMarket": true,
                    "id": "0xc22f01ddc8010ee05574028528614634684ec29e-0x3b425b9d32e1d12bf02b70ad14ff7164533b4208",
                    "market": {
                        "underlyingPriceUSD": "107.08204832"
                    },
                    "supplyBalanceUnderlying": "0.0012538809990965263489804",
                    "symbol": "jAVAX"
                },
                {
                    "borrowBalanceUnderlying": "0.211417034125250635",
                    "enteredMarket": true,
                    "id": "0xce095a9657a02025081e0607c8d8b081c76a75ea-0x3b425b9d32e1d12bf02b70ad14ff7164533b4208",
                    "market": {
                        "underlyingPriceUSD": "0.99995905"
                    },
                    "supplyBalanceUnderlying": "0",
                    "symbol": "jMIM"
                }
            ],
            "totalBorrowValueInUSD": "0.211129373766108795",
            "totalCollateralValueInUSD": "0.084595786016611588"
        },
        {
            "health": "0.599348846455020656",
            "id": "0x6394309017350a569d8e1120d5aab024513e7188",
            "tokens": [
                {
                    "borrowBalanceUnderlying": "0",
                    "enteredMarket": true,
                    "id": "0x585e7bc75089ed111b656faa7aeb1104f5b96c15-0x6394309017350a569d8e1120d5aab024513e7188",
                    "market": {
                        "underlyingPriceUSD": "20.20205801"
                    },
                    "supplyBalanceUnderlying": "2.06889237165517616531769552",
                    "symbol": "jLINK"
                },
                {
                    "borrowBalanceUnderlying": "24.70497247068673021538504322965002",
                    "enteredMarket": true,
                    "id": "0x8b650e26404ac6837539ca96812f0123601e4448-0x6394309017350a569d8e1120d5aab024513e7188",
                    "market": {
                        "underlyingPriceUSD": "1.000202"
                    },
                    "supplyBalanceUnderlying": "0",
                    "symbol": "jUSDT"
                },
                {
                    "borrowBalanceUnderlying": "0",
                    "enteredMarket": true,
                    "id": "0xc146783a59807154f92084f9243eb139d58da696-0x6394309017350a569d8e1120d5aab024513e7188",
                    "market": {
                        "underlyingPriceUSD": "2.535814008726019238"
                    },
                    "supplyBalanceUnderlying": "0",
                    "symbol": "jXJOE"
                },
                {
                    "borrowBalanceUnderlying": "0",
                    "enteredMarket": true,
                    "id": "0xc22f01ddc8010ee05574028528614634684ec29e-0x6394309017350a569d8e1120d5aab024513e7188",
                    "market": {
                        "underlyingPriceUSD": "107.08204832"
                    },
                    "supplyBalanceUnderlying": "0.3301977212486216743063851",
                    "symbol": "jAVAX"
                },
                {
                    "borrowBalanceUnderlying": "45.1676479578595283257303600255103",
                    "enteredMarket": true,
                    "id": "0xce095a9657a02025081e0607c8d8b081c76a75ea-0x6394309017350a569d8e1120d5aab024513e7188",
                    "market": {
                        "underlyingPriceUSD": "0.99995905"
                    },
                    "supplyBalanceUnderlying": "0",
                    "symbol": "jMIM"
                }
            ],
            "totalBorrowValueInUSD": "69.667754104333081264",
            "totalCollateralValueInUSD": "41.755288057544063057"
        },
        {
            "health": "0.675855743136323871",
            "id": "0x89410f8ae51dd2b64d2288dab711e872a186f30a",
            "tokens": [
                {
                    "borrowBalanceUnderlying": "0",
                    "enteredMarket": true,
                    "id": "0x3fe38b7b610c0acd10296fef69d9b18eb7a9eb1f-0x89410f8ae51dd2b64d2288dab711e872a186f30a",
                    "market": {
                        "underlyingPriceUSD": "47053.47224187"
                    },
                    "supplyBalanceUnderlying": "0",
                    "symbol": "jWBTC"
                },
                {
                    "borrowBalanceUnderlying": "0",
                    "enteredMarket": true,
                    "id": "0xc146783a59807154f92084f9243eb139d58da696-0x89410f8ae51dd2b64d2288dab711e872a186f30a",
                    "market": {
                        "underlyingPriceUSD": "2.535814008726019238"
                    },
                    "supplyBalanceUnderlying": "0",
                    "symbol": "jXJOE"
                },
                {
                    "borrowBalanceUnderlying": "0",
                    "enteredMarket": true,
                    "id": "0xc22f01ddc8010ee05574028528614634684ec29e-0x89410f8ae51dd2b64d2288dab711e872a186f30a",
                    "market": {
                        "underlyingPriceUSD": "107.08204832"
                    },
                    "supplyBalanceUnderlying": "0.00653597319210397124300815",
                    "symbol": "jAVAX"
                },
                {
                    "borrowBalanceUnderlying": "0.5793297957816055896153712773725751",
                    "enteredMarket": true,
                    "id": "0xce095a9657a02025081e0607c8d8b081c76a75ea-0x89410f8ae51dd2b64d2288dab711e872a186f30a",
                    "market": {
                        "underlyingPriceUSD": "0.99995905"
                    },
                    "supplyBalanceUnderlying": "0",
                    "symbol": "jMIM"
                },
                {
                    "borrowBalanceUnderlying": "0",
                    "enteredMarket": true,
                    "id": "0xed6aaf91a2b084bd594dbd1245be3691f9f637ac-0x89410f8ae51dd2b64d2288dab711e872a186f30a",
                    "market": {
                        "underlyingPriceUSD": "0.999974"
                    },
                    "supplyBalanceUnderlying": "0",
                    "symbol": "jUSDC"
                }
            ],
            "totalBorrowValueInUSD": "0.57516083839293916",
            "totalCollateralValueInUSD": "0.388725755854970974"
        }
    ]
};
const tokenNames = ["jAVAX", "jWETH", "jUSDT", "jWBTC", "jUSDC", "jMIM", "jDAI", "jLINK", "jXJOE"];

let [repayToken, seizeToken, amountToLiquidate, liquidatee] = findOptimalLiquidation(data);
let flashToken = tokenNames.filter(x => ![repayToken.substring(1), seizeToken.substring(1)].includes(x))[0];

let repayTokenAddress = JOE_TO_ERC20[repayToken];
let seizeTokenAddress = JOE_TO_ERC20[seizeToken];
let flashTokenAddress = JOE_TO_ERC20[flashToken];
let repayTokenUnderlyingAddress = JOE_TO_JERC20[repayToken];
let seizeTokenUnderlyingAddress = JOE_TO_JERC20[seizeToken];
let flashTokenUnderlyingAddress = JOE_TO_JERC20[flashToken];

console.log(amountToLiquidate);
console.log(repayTokenAddress);
console.log(repayTokenUnderlyingAddress);
# Banker Joe Liquidation Bot Using Flash Loans
This is a liquidation bot for Banker Joe using flash loans from Banker Joe. This started off as a fork of [jummy123's liquidation bot](https://github.com/jummy123/last-resort-liquidator) that would make the optimal liquidation but I think it has very few similarities left. This code is not optimized for speed.

I took jummy's code and used typescript and ethers to do deployment + testing + optimization (in terms of liquidation, not time). I also fixed some edge case issues such as swapping tokens that dont have a direct pair or dealing with xJOE liquidity issues when swapping. I learned a lot making this bot and most interestingly when I thught I was ready to launch on mainnet, I was about 25% ready. I would reccomend anyone who wants to learn web3 to work on this or a similar project.

# Overview

The flow of the bot is similar to jummy's but with a few differences:
- profit maximized liquidation
- more detailed graphql query
- off chain compute of flashloan and repay amounts
- guarenteed token swap success
- all token swaps have low slippage (currently 1%, can be changed)

The general flow is as follows:
1. query the graph
2. get optimal pair (borrowed tokens and posted collateral) and amount
3. flashloan amount of different token to get around re-entrancy guard
4. swap flashloaned token to borrowed token
5. repay loan, seize collateral
6. swap collateral token to flashloaned token
7. repay flashloan
8. send out profit

# Breakdown of important files

/contracts/
- Liquidator.sol: main contract for taking out flashloan and liquidating

/scripts/
- constants.ts: contains all addresses used in the bot along with some mappings from name to address and graphql queries
- deploy.ts: deploys the Liquidator contract and console logs the address
- index.ts: infinitely loops, querying the The Graph endpoint for Banker Joe lending and when an underwater account pops up, calls the findOptimalLiquidation function to get the most profitable pair and amount to liquidate and liquidates the account
- utils.ts: contains the function for finding optimal liquidations

/test/

- test.liquidator.ts: tests deployment of contract, internal swapping, liquidating real position on mainnet fork

# Testing the bot
You should test first with `hh test`
Currently does not test the optimal pair finding algorithm. I tested this by running on the subgraph data and seeing if optimal
pairs were picked. To test internally multiple accounts with lots of random amounts of tokens need to be set up, which would just be simulating the data we can get from the subgraph already so I chose to leave it for later.
Because of this, liquidating positions with tokens that have different decimals also leads to problems are decimals are dealt within the optimal pair finding function, which again I tested by just running on mainnet data and making sure it works for every account thats underwater.


# Deploying and running bot
git clone "github link"
npm i (assuming u have npm installed)
hh typechain, compiles and makes typescript files which are imported in


Set up the .env file with a private key then run: 

`hh run /scripts/deploy.ts --network avax`
then take the liquidator contract address and add it to the constants.ts file, replacing the 0 address set there currently, and finally run the main script:
`hh run /scripts/index.ts --network avax`
this is not an infinite loop, it only iterates once, to make it run infinite just change the while condition on the loop to `true`

# What I learned
* using ethers.js to deploy and interact with smart contracts on EVM compatible chains
* how to use The Graph to query on chain data
* The flow of Trader Joe and Banker Joe and got familiar with the compound and uniswapv2 codebases
* Hardhat mainnet forking

# ToDo
- full testing of all parts of project
- rewrite findOptimalLiquidation (can probably use some prewritten sort functions to optimize)
- speed optimizations (golang?)
- run own node with AWS, store state of accounts locally to get data faster; update database on each new block

# Update
- Mainnet liquidations: 
https://snowtrace.io/tx/0xb02afc8da2978cf9651888790bea1981d08bef2626a1482be889bf7064803060
https://snowtrace.io/tx/0x9ad8712bea9b6596e34c7ecd803edc2dd7dfd961652f2e5c98a22dbf43952ce4
https://snowtrace.io/tx/0x69ec1d72a203f7e1d43ff7ef37d258f8cb7dfa60b00ec272f3b62318cbbd14ec
https://snowtrace.io/tx/0xf03378550e7287435c529b22b89a6e62a73ff7bfccbff289dfcc671959d50614


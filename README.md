# Banker Joe Liquidation Bot Using Flash Loans
This is an attempt at making a liquidation bot for Banker Joe using flash loans from Banker Joe. This is a fork of [jummy123's liquidation bot](https://github.com/jummy123/last-resort-liquidator) that attempts to make the optimal liquidation. I imagine it is not competative as it is my first semi-solo coding project. 

I took jummy's code and used typescript and ethers to do deployment + testing + optimization (in terms of liquidation, not time). The main contract is the same but I did cut some parts out and changed a few functions slightly. I used [this codebase](https://github.com/Sanghren/avalanche-hardhat-fork-tutorial) along with the ethers documenetation and a lot of googling to write the deployment and interaction scripts. 

# Overview

The flow of the bot is similar to jummy's but with a few differences:
- profit maximized liquidation
- more detailed graphql query
- computing flashloan amount and repay amount off chain using extra info from said query

The general flow is as follows:
1. query the graph
2. get optimal pair (borrowed tokens and posted collateral) and amount
3. flashloan amount of different token to get around re-entrancy guard
4. swap flashloaned token to borrowed token
5. repay loan, seize collateral
6. swap borrowed token to flashloaned token
7. repay flashloan
8. send out profit

# Deploying and running bot

To run this you need hardhat, ethers, typechain, and graphql-request installed along with any dependencies. I don't know what all the dependencies are but usually if something is missing you'll get some red lines telling you what to do. Once everything is set up you just need to set up the .env file with Infura/Alchemy info and a private key. I would suggest making a seperate address to deploy the contract from, maybe look into how to make it untraceable/hard to trace back to your main account also. Once this is all set up, add avax to hardhat networks and then run: 

`hh run /scripts/deploy.ts --network avax`
then take the contract address and add it to the addresses.ts file, replacing the 0 address set there currently, and finally run the main script:
`hh run /scripts/index.ts --network avax`
this is an infinite loop so there might be some weird stuff happening

You should test first with `hh test` or more specifically `hh test /test/test.liquidate.ts`, the other file is just console logging things to make sure the optimization and formatting script works properly.

# Breakdown of important files

/contracts/
- Liquidator.sol: main contract for taking out flashloan and liquidating

/scripts/
- addresses.ts: contains all addresses used in the bot along with some mappings from name to address and some other needed variables
- deploy.ts: deploys the Liquidator contract
- index.ts: infinitely loops, querying the The Graph endpoint for Banker Joe lending and when an underwater account pops up, calls the findOptimalLiquidation function and liquidates
- utils.ts: contains the function for finding optimal liquidations, plan to add other functions like setting up underwater accounts in testing

/test/
- test.format.ts: checks to make sure finding optimal liquidation works and that the formating used in index.ts is working properly
- test.liquidator.ts: tests deployment of contract, internal swapping, setting up underwater account and liquidating, unfinished tests for getting optimal liquidation

# What I learned
* everything I know about ethers
* you can get output of a state changing function by using constract.callStatic.function()
* timestamp is not very readily available in ethers, might be better to query the graph for it
* how to query The Graph
* The flow of Trader Joe and Banker Joe and got familiar with the codebase

# ToDo
- testing optimization function
- speed optimizations
- run own node with AWS, get data faster
- swapping pairs with no direct path fails, but less likely to happen
- set up local graph node to test optimizations more thoroughly/realistically

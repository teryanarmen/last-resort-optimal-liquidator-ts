const tokenNames = ["jUSDC", "jAVAX", "jUSDT", "jWETH", "jWBTC", "jMIM", "jDAI", "jLINK", "jXJOE"];

//@ts-ignore
export function findOptimalLiquidation(data, marketData) {
    // set up variables with lengths, idk if optimal
    let accounts = data["accounts"];
    let liquidationTokens: string[];
    (liquidationTokens = []).length = accounts.length;
    let liquidationTokenValue: number[];
    (liquidationTokenValue = []).length = accounts.length;
    liquidationTokenValue.fill(0);
    let liquidationTokenAmount: number[];
    (liquidationTokenAmount = []).length = accounts.length;
    liquidationTokenAmount.fill(0);

    let seizeTokens: string[];
    (seizeTokens = []).length = accounts.length;
    let seizeTokenValue: number[];
    (seizeTokenValue = []).length = accounts.length;
    seizeTokenValue.fill(0);

    let valueOfPair: number[];
    (valueOfPair = []).length = accounts.length;

    let seizeAllCollateral: boolean[];
    (seizeAllCollateral = []).length = accounts.length;
    seizeAllCollateral.fill(false);

    let i = 0;
    for (let account of accounts) {
        for (let token of account["tokens"]) {
            // gets most valuable pair of seizeToken and liquidationToken, USDvalue to liquidate and tokenAmount to liquidate
            if (token["market"]["underlyingPriceUSD"] * token["supplyBalanceUnderlying"] > seizeTokenValue[i]) {
                seizeTokens[i] = token["symbol"];
                seizeTokenValue[i] = token["market"]["underlyingPriceUSD"] * token["supplyBalanceUnderlying"];
            }

            if (token["market"]["underlyingPriceUSD"] * token["borrowBalanceUnderlying"] > liquidationTokenValue[i]) {
                liquidationTokens[i] = token["symbol"];
                liquidationTokenValue[i] = token["market"]["underlyingPriceUSD"] * token["borrowBalanceUnderlying"];
                liquidationTokenAmount[i] = token["borrowBalanceUnderlying"];
            }
        }
        // max liquidatable amount based on if collateral in any single token >= max closefactor
        if (0.5 * liquidationTokenValue[i] >= seizeTokenValue[i]) {
            valueOfPair[i] = seizeTokenValue[i];
            seizeAllCollateral[i] = true;
        } else {
            valueOfPair[i] = 0.5 * liquidationTokenValue[i];
        }
        i++;
    }


    let maxProfitIndex = valueOfPair.indexOf(Math.max(...valueOfPair));
    let liquidatee = accounts[maxProfitIndex]["id"];
    let seizeToken = seizeTokens[maxProfitIndex];
    let liquidationToken = liquidationTokens[maxProfitIndex];
    let flashToken = tokenNames.filter(x => ![liquidationToken, seizeToken].includes(x))[0];

    // @ts-ignore
    let flashMarket = marketData["markets"].find(o => o.symbol == flashToken);
    let flashTokenPrice = flashMarket["underlyingPriceUSD"];
    let flashTokenDecimals = flashMarket["underlyingDecimals"];

    // let flashLoanTokenPrice = marketData["markets"][]

    // not exactly sure if this is right, the number of values should have to do with the decimals of the token so just taking out the decimal will make things work? no. dont assume its easy.

    let valueToFlashloan = seizeAllCollateral[maxProfitIndex] ?
        (seizeTokenValue[maxProfitIndex]) :
        (0.5 * liquidationTokenValue[maxProfitIndex]);

    // figuring out amount to flashloan w.r.t decimals
    let amountToFlashloanWrongDecimals = (valueToFlashloan / flashTokenPrice);
    let amountToFlashloanWrongDecimalsArray = amountToFlashloanWrongDecimals.toString().split(".");

    let multiplier = flashTokenDecimals - amountToFlashloanWrongDecimalsArray[1].length;
    let amountToFlashloan = (parseInt(amountToFlashloanWrongDecimalsArray[0]) * 10 ** amountToFlashloanWrongDecimalsArray[1].length + parseInt(amountToFlashloanWrongDecimalsArray[1])) * (10 ** multiplier);

    /*
    let amountToFlashloan = seizeAllCollateral[maxProfitIndex] ?
        seizeTokenAmount[maxProfitIndex] :
        (0.5 * repayTokenAmount[maxProfitIndex]);
    let liquidatee = accounts[maxProfitIndex]["id"];
    */

    return [liquidationToken, seizeToken, flashToken, Math.floor(amountToFlashloan), liquidatee]
}


// did not finish setting up this function as i did not finalize testing
// used to set up underwater accounts so testing code isnt so repetative
/*
export async function setUpUnderwaterAccount(router, comptroller, underwater, depositAmount, waitTimeInSeconds, depositToken, borrowToken, jDepositToken, jBorrowToken) {
    let priceOracle = await ethers.getContractAt("PriceOracle", ORACLE_ADDRESS);
    // need timestamp for timelimit input in swap function 
    let timestamp = (
        await ethers.provider.getBlock(
            await ethers.provider.getBlockNumber()
        )
    ).timestamp;

    // swap for borrowToken, will be depositing borrowToken as collateral
    await router.swapExactAVAXForTokens(
        1,
        [WAVAX_ADDRESS, depositToken.address],
        underwater.address,
        timestamp + 60,
        { valueOfPair: ethers.utils.parseEther(depositAmount) }
    );

    let deposit_token_balance = await depositToken.balanceOf(underwater.address);

    // balance of borrowToken > 0, borrowToken deposited in TJ = 0
    expect(deposit_token_balance).gt('0');
    expect(await jDepositToken.balanceOf(underwater.address)).eq('0');

    // deposit all borrowToken into TJ
    await depositToken.connect(underwater).approve(jDepositToken.address, deposit_token_balance);
    await jDepositToken.connect(underwater).mint(deposit_token_balance);

    // balance of borrowToken = 0, deposited borrowToken > 0
    expect(await depositToken.balanceOf(underwater.address)).eq('0');
    expect(await jDepositToken.balanceOf(underwater.address)).gt('0');

    await comptroller.connect(underwater).enterMarkets([jDepositToken]);

    let before = await jDepositToken.callStatic.balanceOfUnderlying(underwater.address);

    // accrues interest, borrowToken has low interest, so we pass time
    await ethers.provider.send("evm_increaseTime", [60]);
    await jDepositToken.accrueInterest();

    let now = await jDepositToken.callStatic.balanceOfUnderlying(underwater.address);

    // interest accrual worked
    expect(now).gt(before);
    expect(now).gt(deposit_token_balance);
    expect(await comptroller.checkMembership(underwater.address, jDepositToken)).eq(true);

    //// borrow max funds
    // get max funds
    let [err1, liquidity1, shortfall] = await comptroller.getAccountLiquidity(underwater.address);
    // no shortfall yet, no error pls
    expect(shortfall).eq('0');
    expect(err1).eq('0');

    // get price of borrow token.
    let borrowTokenPrice = await priceOracle.getUnderlyingPrice(jBorrowToken.address);

    // calculate max borrow, need big ints else overflow
    let max_borrow_amount = BigInt(liquidity1) * BigInt(10 ** 18) / BigInt(borrowTokenPrice);

    // borrow max borrow amount
    await jBorrowToken.connect(underwater).borrow(max_borrow_amount);

    // make sure some funds were borrowed
    expect(await borrowToken.balanceOf(underwater.address)).gt('0');

    // pass time
    await ethers.provider.send("evm_increaseTime", [waitTimeInSeconds]);

    // update borrow balance ( apply interest )
    // maybe can use accrueInterest instead?
    await jBorrowToken.borrowBalanceCurrent(underwater.address);

    // no error pls; some shortfall tho
    let [err2, liquidity2, someShortfall] = await comptroller.getAccountLiquidity(underwater.address);
    expect(err2).eq('0');
    expect(someShortfall).gt('0');

    // return state
    // are pointers being passed in or copies?
    // depends on const vs let maybe? ,,later
}
*/
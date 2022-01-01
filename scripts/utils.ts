//@ts-ignore
export function findOptimalLiquidation(data) {
    let accounts = data["accounts"];
    let repayTokens: string[];
    (repayTokens = []).length = accounts.length;
    let repayTokenValue: number[];
    (repayTokenValue = []).length = accounts.length;
    repayTokenValue.fill(0);
    let repayTokenAmount: number[];
    (repayTokenAmount = []).length = accounts.length;
    repayTokenAmount.fill(0);

    let seizeTokens: string[];
    (seizeTokens = []).length = accounts.length;
    let seizeTokenValue: number[];
    (seizeTokenValue = []).length = accounts.length;
    seizeTokenValue.fill(0);
    let seizeTokenAmount: number[];
    (seizeTokenAmount = []).length = accounts.length;
    seizeTokenAmount.fill(0);

    let valueOfPair: number[];
    (valueOfPair = []).length = accounts.length;

    let seizeAllCollateral: boolean[];
    (seizeAllCollateral = []).length = accounts.length;
    seizeAllCollateral.fill(false);
    // optimal liquidation if collateral isnt too spread out or the borrow isnt too spread out
    let i = 0;
    for (let account of accounts) {
        for (let token of account["tokens"]) {
            if (token["market"]["underlyingPriceUSD"] * token["supplyBalanceUnderlying"] > seizeTokenValue[i]) {
                seizeTokens[i] = token["symbol"];
                seizeTokenValue[i] = token["market"]["underlyingPriceUSD"] * token["supplyBalanceUnderlying"];
                seizeTokenAmount[i] = token["supplyBalanceUnderlying"];
            }
            if (token["market"]["underlyingPriceUSD"] * token["borrowBalanceUnderlying"] > repayTokenValue[i]) {
                repayTokens[i] = token["symbol"];
                repayTokenValue[i] = token["market"]["underlyingPriceUSD"] * token["borrowBalanceUnderlying"];
                repayTokenAmount[i] = token["borrowBalanceUnderlying"];
            }
        }
        if (0.5 * repayTokenValue[i] >= seizeTokenValue[i]) {
            valueOfPair[i] = seizeTokenValue[i];
            seizeAllCollateral[i] = true;
        } else {
            valueOfPair[i] = 0.5 * repayTokenValue[i];
        }
        i++;
    }
    let maxProfitIndex = valueOfPair.indexOf(Math.max(...valueOfPair));
    let seizeToken = seizeTokens[maxProfitIndex];
    let repayToken = repayTokens[maxProfitIndex];
    let amountToLiquidate = seizeAllCollateral[maxProfitIndex] ?
        (seizeTokenAmount[maxProfitIndex]).toString().replace(".", "") :
        (0.5 * repayTokenAmount[maxProfitIndex]).toString().replace(".", "");
    let liquidatee = accounts[maxProfitIndex]["id"];
    return [repayToken, seizeToken, amountToLiquidate, liquidatee]
}

// did not finish setting up this function as i did not finalize testing
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
// array of tokens, decreasing ordered based on amount of liquidity
const tokenNames = ["jUSDC", "jAVAX", "jUSDT", "jWETH", "jWBTC", "jMIM", "jDAI", "jLINK", "jXJOE"];

export function findOptimalLiquidation(accounts: string | any[], marketData: { [x: string]: any[]; }) {


    /* --------- set up array variable, fill number arrays with zeros --------- */


    let repayTokens: string[]; // tokens that can be repaid
    (repayTokens = []).length = accounts.length;

    let repayTokenAmount: number[]; // amount of repaybale tokens, need amount here to know how much to flashloan
    (repayTokenAmount = []).length = accounts.length;
    repayTokenAmount.fill(0);

    let repayTokenValue: number[]; // value of repayable tokens (price * amount)
    (repayTokenValue = []).length = accounts.length;
    repayTokenValue.fill(0);

    let collateralTokens: string[]; // tokens that can be seized
    (collateralTokens = []).length = accounts.length;

    // amount of collateral seized is dependent on amount repaid, so we dont need to track it
    let collateralTokenValue: number[]; // value of repayable tokens (price * amount), 
    (collateralTokenValue = []).length = accounts.length;
    collateralTokenValue.fill(0);

    let valueOfPair: number[]; // maximum liquidatable value for each (collateral, repay) pair
    (valueOfPair = []).length = accounts.length;

    let seizeAllCollateral: boolean[]; // limited by collateral or borrow position?
    (seizeAllCollateral = []).length = accounts.length;
    seizeAllCollateral.fill(false); // dont have to change if limited by borrow position


    /* --------- find optimal pair of collateralToken and repayToken for each account --------- */


    // the optimal pair is the maximum pair, so find the maximum collateral token and maximum borrowed token.
    // the optimal liquidation will involve liquidating some amount of the borrowed token to seize a equally valuable amount (plus liquidation fee) of collateral token. We will find the amount later, for now, the tokens.

    let i = 0; // counter, each i value corresponds to a different account
    for (let account of accounts) {

        // basic max finding loop with a check to make sure tokens are used as collateral
        for (let token of account["tokens"]) { // for each token in each account...
            // ...if the value of the deposit is more than the value we have stored currently and the token is deposited as
            // collateral, replace the stored value with the new value.
            if (token["market"]["underlyingPriceUSD"] * token["supplyBalanceUnderlying"] > collateralTokenValue[i] && token["enteredMarket"]) {
                collateralTokens[i] = token["symbol"]; // replaces token
                // replaces value
                collateralTokenValue[i] = token["market"]["underlyingPriceUSD"] * token["supplyBalanceUnderlying"];
            }

            // similarly, if the value of borrowed token is greater than our stored value, replace it
            if (token["market"]["underlyingPriceUSD"] * token["borrowBalanceUnderlying"] > repayTokenValue[i]) {
                repayTokens[i] = token["symbol"];
                repayTokenValue[i] = token["market"]["underlyingPriceUSD"] * token["borrowBalanceUnderlying"];
                repayTokenAmount[i] = token["borrowBalanceUnderlying"];
            }
        }
        // max liquidatable value based on if collateral in any single token >= max closefactor * borrowed value
        if (0.5 * repayTokenValue[i] >= collateralTokenValue[i]) { // if not enough collateral, we liquidate max collateral
            valueOfPair[i] = collateralTokenValue[i];
            seizeAllCollateral[i] = true;
        } else { // if not, half of borrowed tokens
            valueOfPair[i] = 0.5 * repayTokenValue[i];
        }
        i++;
    }



    // finalizing token choice based on maximum value 
    let maxProfitIndex = valueOfPair.indexOf(Math.max(...valueOfPair)); // location of optimal account to liquidate
    let liquidatee = accounts[maxProfitIndex]["id"];
    let collateralToken = collateralTokens[maxProfitIndex];
    let repayToken = repayTokens[maxProfitIndex];
    // flashtoken is the first token in our array that is not the repayToken or the collateralToken
    let flashToken = tokenNames.filter(x => ![repayToken, collateralToken].includes(x))[0];


    /* --------- find max amount of collateralToken and repayToken --------- */

    // pick market data that corresponds to the token we will be flashloaning
    let flashMarket = marketData["markets"].find((o: { symbol: string; }) => o.symbol == flashToken);
    let flashTokenPrice = flashMarket["underlyingPriceUSD"]; // get price
    let flashTokenDecimals = flashMarket["underlyingDecimals"]; // get decimals

    // value to flashloan, already calculated
    let valueToFlashloan = valueOfPair[maxProfitIndex];
    // amount = value/price * 10^decimals
    let amountToFlashloan = (valueToFlashloan / flashTokenPrice) * 10 ** flashTokenDecimals;

    return [repayToken, collateralToken, flashToken, Math.floor(.99 * amountToFlashloan), liquidatee, accounts[maxProfitIndex]]
}
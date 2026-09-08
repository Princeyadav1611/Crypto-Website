// 1. Navbar Cash Balance
const userCashBal = document.getElementById('userCashBal');

// 2. Top Overview Cards
const totalNetWorthEl = document.getElementById('totalNetWorth');
const totalPnlAmountEl = document.getElementById('totalPnlAmount');
const totalPnlPercentEl = document.getElementById('totalPnlPercent');
const availableCashEl = document.getElementById('availableCash');

// 3. Holdings Table Body
const portfolioList = document.getElementById('portfolioList');

const STARTING_CAPITAL = 10000;

async function initPortfolio() {
    // 1. User Cash Balance Load & Display
    const bal = JSON.parse(localStorage.getItem("userCashBalance")) ?? STARTING_CAPITAL;
    const formattedBal = `$${bal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    if (userCashBal) userCashBal.innerText = formattedBal;
    if (availableCashEl) availableCashEl.innerText = formattedBal;

    // 2. User Holdings Filter (Only qty > 0)
    const holdings = JSON.parse(localStorage.getItem("portfolioHoldings")) || {};
    const holdingCoinIds = Object.keys(holdings).filter(e => holdings[e] > 0);

    // 3. Empty State Check
    if (holdingCoinIds.length === 0) {
        portfolioList.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; color: #64748b; padding: 25px;">
                    No crypto holdings yet. <a href="trade.html" style="color: #3b82f6; text-decoration: none;">Trade</a> now
                </td>
            </tr>
        `;
        totalNetWorthEl.innerText = formattedBal;
        totalPnlAmountEl.innerText = `+$0.00`;
        totalPnlPercentEl.innerText = `+0.00%`;
        return;
    }

    // 4. Live Coin Prices (SessionStorage / API)
    let marketCoins = JSON.parse(sessionStorage.getItem('cachedCoins')) || [];
    if (marketCoins.length === 0) {
        try {
            const res = await fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false");
            marketCoins = await res.json();
            sessionStorage.setItem("cachedCoins", JSON.stringify(marketCoins));
        } catch (err) {
            console.error("API error:", err);
        }
    }

    // 5. Trade History for Average Buy Price
    const tradeHistory = JSON.parse(localStorage.getItem("tradeHistory")) || [];
    let totalCryptoValue = 0;

    // 6. Generate Rows for Table
    const rowsHtml = holdingCoinIds.map(coinId => {
        const qty = holdings[coinId];
        const coinData = marketCoins.find(c => c.id === coinId) || {};

        const currentPrice = coinData.current_price || 0;
        const symbol = (coinData.symbol || coinId).toUpperCase();
        const name = coinData.name || coinId;

        const coinTotalValue = qty * currentPrice;
        totalCryptoValue += coinTotalValue;

        // Calculate Avg Buy Price
        const buyTrades = tradeHistory.filter(t => t.coinId === coinId && t.type === 'BUY');
        let totalCost = 0;
        let totalBuyQty = 0;

        buyTrades.forEach(t => {
            totalCost += (t.price * t.amount);
            totalBuyQty += t.amount;
        });

        const avgBuyPrice = totalBuyQty > 0 ? (totalCost / totalBuyQty) : currentPrice;

        // Calculate Individual Coin P&L
        const investedAmount = qty * avgBuyPrice;
        const coinPnl = coinTotalValue - investedAmount;
        const coinPnlPercent = investedAmount > 0 ? ((coinPnl / investedAmount) * 100) : 0;
        const isProfit = coinPnl >= 0;

        return `
            <tr>
                <td><strong>${name}</strong> <span style="color: #64748b; font-size: 11px;">${symbol}</span></td>
                <td>${qty.toFixed(4)} ${symbol}</td>
                <td>$${avgBuyPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td>$${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td>$${coinTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td style="color: ${isProfit ? '#10b981' : '#ef4444'}; font-weight: 500;">
                    ${isProfit ? '+' : ''}$${coinPnl.toFixed(2)} (${isProfit ? '+' : ''}${coinPnlPercent.toFixed(2)}%)
                </td>
                <td>
                    <button class="trade-action-btn" onclick="window.location.href='trade.html?coin=${coinId}'">Trade</button>
                </td>
            </tr>
        `;
    }).join('');

    portfolioList.innerHTML = rowsHtml;

    // 7. Update Net Worth & Overall P&L
    const netWorth = bal + totalCryptoValue;
    totalNetWorthEl.innerText = `$${netWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const totalPnl = netWorth - STARTING_CAPITAL;
    const totalPnlPercent = (totalPnl / STARTING_CAPITAL) * 100;
    const isOverallProfit = totalPnl >= 0;

    totalPnlAmountEl.innerText = `${isOverallProfit ? '+' : ''}$${totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    totalPnlAmountEl.style.color = isOverallProfit ? '#10b981' : '#ef4444';

    totalPnlPercentEl.innerText = `${isOverallProfit ? '+' : ''}${totalPnlPercent.toFixed(2)}%`;
    totalPnlPercentEl.style.color = isOverallProfit ? '#10b981' : '#ef4444';
}

// Run when page loads
initPortfolio();

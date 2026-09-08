// ==========================================
// 1. URL & PARAMETERS SETUP
// ==========================================
const urlParams = new URLSearchParams(window.location.search);
const selectedCoinId = urlParams.get('coin') || 'bitcoin';

// ==========================================
// 2. DOM ELEMENTS SELECTORS
// ==========================================
const coinTitle = document.getElementById('coinTitle');
const currentPriceDisplay = document.getElementById('currentPriceDisplay');
const priceChangeBadge = document.getElementById('priceChangeBadge');
const high24Display = document.getElementById('high24Display');
const low24Display = document.getElementById('low24Display');
const orderPriceInput = document.getElementById('orderPrice');
const submitBtn = document.getElementById('submitBtn');

const btnBuy = document.getElementById('btnBuy');
const btnSell = document.getElementById('btnSell');
const orderQty = document.getElementById('orderQty');
const costVal = document.getElementById('costVal');
const cashVal = document.getElementById('cashVal');
const userCashBal = document.getElementById('userCashBal');
const rowSelector = document.querySelector("#tradeHistoryRows");
const orderForm = document.getElementById('orderForm');

// ==========================================
// 3. STATE & CACHE VARIABLES
// ==========================================
let currentCoinPrice = 0;
let currentSymbol = 'BTC';
let currentMode = 'buy';
let chartInstance = null;
const chartCache = {};
let isFetchingChart = false;

// ==========================================
// 4. UI HELPERS & BALANCE MANAGERS
// ==========================================
function updateSubmitButton() {
    if (currentMode === 'buy') {
        submitBtn.innerText = `Buy ${currentSymbol}`;
        submitBtn.classList.remove('sell-mode');
    } else {
        submitBtn.innerText = `Sell ${currentSymbol}`;
        submitBtn.classList.add('sell-mode');
    }
}

function calculateTotal() {
    const qty = parseFloat(orderQty.value) || 0;
    const total = qty * currentCoinPrice;
    costVal.innerText = `$${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function updateBalanceDisplays() {
    const currentBal = JSON.parse(localStorage.getItem("userCashBalance")) ?? 10000;
    const formatted = `$${currentBal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (userCashBal) userCashBal.innerText = formatted;
    if (cashVal) cashVal.innerText = formatted;
}

function updateUI(coin) {
    currentCoinPrice = coin.current_price || 0;
    currentSymbol = coin.symbol.toUpperCase();

    const isProfit = (coin.price_change_percentage_24h || 0) >= 0;

    coinTitle.innerText = `${coin.name} ${currentSymbol}`;
    currentPriceDisplay.innerText = `$${currentCoinPrice.toLocaleString()}`;

    const changeVal = coin.price_change_percentage_24h ? coin.price_change_percentage_24h.toFixed(2) : '0.00';
    priceChangeBadge.innerText = `${isProfit ? '+' : ''}${changeVal}%`;
    priceChangeBadge.className = isProfit ? 'tag green' : 'tag red';

    high24Display.innerText = `$${coin.high_24h ? coin.high_24h.toLocaleString() : 'N/A'}`;
    low24Display.innerText = `$${coin.low_24h ? coin.low_24h.toLocaleString() : 'N/A'}`;

    orderPriceInput.value = `$${currentCoinPrice.toLocaleString()}`;
    updateSubmitButton();
    calculateTotal();
}

// ==========================================
// 5. CHART RENDERER & DATA FETCHER
// ==========================================
function renderChart(timestamps, prices) {
    const canvas = document.getElementById('priceCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    if (chartInstance) {
        chartInstance.destroy();
    }

    const isUp = prices[prices.length - 1] >= prices[0];
    const lineColor = isUp ? '#10b981' : '#ef4444';
    const bgGradient = isUp ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)';

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timestamps,
            datasets: [{
                data: prices,
                borderColor: lineColor,
                backgroundColor: bgGradient,
                fill: true,
                tension: 0.25,
                borderWidth: 2,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => `$${context.parsed.y.toLocaleString()}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#64748b', maxTicksLimit: 6 }
                },
                y: {
                    grid: { color: '#1e293b' },
                    ticks: {
                        color: '#64748b',
                        callback: (value) => `$${value.toLocaleString()}`
                    }
                }
            }
        }
    });
}

async function fetchChartData(days = '1') {
    const cacheKey = `${selectedCoinId}_${days}`;

    if (chartCache[cacheKey]) {
        renderChart(chartCache[cacheKey].timestamps, chartCache[cacheKey].prices);
        return;
    }

    if (isFetchingChart) return;
    isFetchingChart = true;

    try {
        const res = await fetch(`https://api.coingecko.com/api/v3/coins/${selectedCoinId}/market_chart?vs_currency=usd&days=${days}`);

        if (!res.ok) {
            if (res.status === 429) {
                alert("CoinGecko API limit reach ho gayi hai! Kripya 30-60 seconds ruk kar click karein.");
            }
            throw new Error(`API Error: ${res.status}`);
        }

        const data = await res.json();
        if (!data || !data.prices) return;

        const timestamps = data.prices.map(item => {
            const date = new Date(item[0]);
            return days === '1'
                ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        });

        const prices = data.prices.map(item => item[1]);
        chartCache[cacheKey] = { timestamps, prices };
        renderChart(timestamps, prices);
    } catch (err) {
        console.error('Error fetching chart data:', err);
    } finally {
        isFetchingChart = false;
    }
}

// ==========================================
// 6. ORDER HISTORY TABLE RENDERER
// ==========================================
function renderTradeHistory() {
    const allTrades = JSON.parse(localStorage.getItem("tradeHistory")) || [];
    const currentCoinTrades = allTrades.filter(trade => trade.coinId === selectedCoinId);

    if (currentCoinTrades.length === 0) {
        rowSelector.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; color: #64748b; padding: 24px;">
                    No Order History
                </td>
            </tr>`;
        return;
    }

    rowSelector.innerHTML = currentCoinTrades.map(trade => `
        <tr>
            <td>${trade.time}</td>
            <td class="${trade.type === 'BUY' ? 'tag-buy' : 'tag-sell'}">${trade.type}</td>
            <td>$${Number(trade.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td>${trade.amount} ${trade.symbol}</td>
        </tr>
    `).join('');
}

// ==========================================
// 7. ORDER SUBMIT HANDLER (BUY / SELL LOGIC)
// ==========================================
const handleOrder = (e) => {
    e.preventDefault();

    const qty = parseFloat(orderQty.value);
    if (!qty || qty <= 0) {
        alert("Valid quantity daal bhai!");
        return;
    }

    const totalCost = qty * currentCoinPrice;
    let balance = JSON.parse(localStorage.getItem("userCashBalance")) ?? 10000;
    const holdings = JSON.parse(localStorage.getItem("portfolioHoldings")) || {};
    const myCoinQty = holdings[selectedCoinId] || 0;

    if (currentMode === "buy") {
        if (totalCost > balance) {
            alert("Insufficient Balance!");
            return;
        }
        balance -= totalCost;
        holdings[selectedCoinId] = myCoinQty + qty;
    } else if (currentMode === "sell") {
        if (qty > myCoinQty) {
            alert(`Tere paas sirf ${myCoinQty} ${currentSymbol} hain! Usse zyada nahi bech sakta.`);
            return;
        }
        balance += totalCost;
        holdings[selectedCoinId] = myCoinQty - qty;
    }

    // Save to LocalStorage
    localStorage.setItem("userCashBalance", JSON.stringify(balance));
    localStorage.setItem("portfolioHoldings", JSON.stringify(holdings));

    // Save trade to history
    const newTrade = {
        coinId: selectedCoinId,
        symbol: currentSymbol,
        type: currentMode.toUpperCase(),
        price: currentCoinPrice,
        amount: qty,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    const allTrades = JSON.parse(localStorage.getItem('tradeHistory')) || [];
    allTrades.unshift(newTrade);
    localStorage.setItem('tradeHistory', JSON.stringify(allTrades));

    // Reset UI
    updateBalanceDisplays();
    orderQty.value = '';
    calculateTotal();
    renderTradeHistory();

    alert(`Order Successful! ${newTrade.type} ${qty} ${newTrade.symbol}`);
};

// ==========================================
// 8. EVENT LISTENERS & INITIAL CALLS
// ==========================================
const timeBtns = document.querySelectorAll('.time-btns button');
timeBtns.forEach((btn, index) => {
    const dayMap = ['1', '7', '30', '365'];
    const days = btn.getAttribute('data-days') || dayMap[index];

    btn.addEventListener('click', (e) => {
        if (isFetchingChart) return;
        timeBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        fetchChartData(days);
    });
});

btnBuy.addEventListener('click', () => {
    currentMode = 'buy';
    btnBuy.classList.add('active');
    btnSell.classList.remove('active');
    updateSubmitButton();
});

btnSell.addEventListener('click', () => {
    currentMode = 'sell';
    btnSell.classList.add('active');
    btnBuy.classList.remove('active');
    updateSubmitButton();
});

orderQty.addEventListener('input', calculateTotal);

if (orderForm) {
    orderForm.addEventListener('submit', handleOrder);
}

// Initial Data Load
const cachedData = sessionStorage.getItem('cachedCoins');
if (cachedData) {
    const coinsList = JSON.parse(cachedData);
    const matchedCoin = coinsList.find(c => c.id === selectedCoinId);
    if (matchedCoin) {
        updateUI(matchedCoin);
    }
}

updateBalanceDisplays();
renderTradeHistory();
fetchChartData('1');

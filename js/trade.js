// 1. URL bar se 'coin' ka id nikaala (fallback 'bitcoin')
const urlParams = new URLSearchParams(window.location.search);
const selectedCoinId = urlParams.get('coin') || 'bitcoin';

// 2. DOM Elements
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

// 3. State Variables
let currentCoinPrice = 0;
let currentSymbol = 'BTC';
let currentMode = 'buy';

// 4. Helper: Submit Button Mode & Text updater
function updateSubmitButton() {
    if (currentMode === 'buy') {
        submitBtn.innerText = `Buy ${currentSymbol}`;
        submitBtn.classList.remove('sell-mode');
    } else {
        submitBtn.innerText = `Sell ${currentSymbol}`;
        submitBtn.classList.add('sell-mode');
    }
}

// 5. Helper: Live Total Cost Calculation
function calculateTotal() {
    const qty = parseFloat(orderQty.value) || 0;
    const total = qty * currentCoinPrice;
    costVal.innerText = `$${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// 6. UI Update (Screen Painter)
function updateUI(coin) {
    currentCoinPrice = coin.current_price || 0;
    currentSymbol = coin.symbol.toUpperCase();

    const isProfit = (coin.price_change_percentage_24h || 0) >= 0;

    // Header updates
    coinTitle.innerText = `${coin.name} ${currentSymbol}`;
    currentPriceDisplay.innerText = `$${currentCoinPrice.toLocaleString()}`;

    // Badge styling & value
    const changeVal = coin.price_change_percentage_24h ? coin.price_change_percentage_24h.toFixed(2) : '0.00';
    priceChangeBadge.innerText = `${isProfit ? '+' : ''}${changeVal}%`;
    priceChangeBadge.className = isProfit ? 'tag green' : 'tag red';

    // 24h High & Low
    high24Display.innerText = `$${coin.high_24h ? coin.high_24h.toLocaleString() : 'N/A'}`;
    low24Display.innerText = `$${coin.low_24h ? coin.low_24h.toLocaleString() : 'N/A'}`;

    // Order form inputs
    orderPriceInput.value = `$${currentCoinPrice.toLocaleString()}`;
    updateSubmitButton();
    calculateTotal();
}

// 7. Event Listeners: Buy / Sell Switch
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

// 8. Event Listener: Real-time Quantity calculation
orderQty.addEventListener('input', calculateTotal);

// 9. sessionStorage se data load karna
const cachedData = sessionStorage.getItem('cachedCoins');
if (cachedData) {
    const coinsList = JSON.parse(cachedData);
    const matchedCoin = coinsList.find(c => c.id === selectedCoinId);

    if (matchedCoin) {
        updateUI(matchedCoin);
    }
}
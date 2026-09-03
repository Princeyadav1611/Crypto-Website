let allCoins = [];

function renderTable(coinsToDisplay) {
    const tableBody = document.getElementById('coinsList');
    let rowsHTML = '';

    coinsToDisplay.forEach((coin, index) => {
        const isProfit = coin.price_change_percentage_24h >= 0;
        const color = isProfit ? '#10b981' : '#ef4444';

        const price = coin.current_price ? coin.current_price.toLocaleString() : 'N/A';
        const change = coin.price_change_percentage_24h !== null ? coin.price_change_percentage_24h.toFixed(2) : '0.00';
        const low = coin.low_24h ? coin.low_24h.toLocaleString() : 'N/A';
        const high = coin.high_24h ? coin.high_24h.toLocaleString() : 'N/A';
        const cap = coin.market_cap ? coin.market_cap.toLocaleString() : 'N/A';

        rowsHTML += `
            <tr>
                <td style="color: #64748b; font-weight: 600;">${index + 1}</td>
                <td>
                    <img src="${coin.image}" width="20" height="20" style="vertical-align: middle; margin-right: 8px;">
                    <strong>${coin.name}</strong> 
                    <span style="color: #64748b; text-transform: uppercase;">${coin.symbol}</span>
                </td>
                <td>$${price}</td>
                <td style="color: ${color}; font-weight: 600;">
                    ${isProfit ? '+' : ''}${change}%
                </td>
                <td style="color: #94a3b8; font-size: 12px;">$${low} - $${high}</td>
                <td>$${cap}</td>
                <td>
                    <a href="trade.html?coin=${coin.id}" style="color: #3b82f6; text-decoration: none; font-weight: 600;">Trade</a>
                </td>
            </tr>
        `;
    });

    tableBody.innerHTML = rowsHTML;
}




function updateOverviewCards(coins) {
    if (!coins || coins.length === 0) return;

    let totalCap = 0;
    let topGainer = coins[0];
    let topLoser = coins[0];

    coins.forEach(coin => {
        totalCap += (coin.market_cap || 0);

        if (coin.price_change_percentage_24h > topGainer.price_change_percentage_24h) {
            topGainer = coin;
        }
        if (coin.price_change_percentage_24h < topLoser.price_change_percentage_24h) {
            topLoser = coin;
        }
    });

    const capInTrillion = (totalCap / 1e12).toFixed(2);
    document.getElementById('totalMcap').innerText = `$${capInTrillion}T`;
    document.getElementById('mcapPct').innerText = `+${topGainer.price_change_percentage_24h.toFixed(1)}%`;

    document.getElementById('gainerName').innerText = topGainer.name;
    document.getElementById('gainerPct').innerText = `+${topGainer.price_change_percentage_24h.toFixed(2)}%`;
    document.getElementById('gainerPrice').innerText = `$${topGainer.current_price.toLocaleString()}`;

    document.getElementById('loserName').innerText = topLoser.name;
    document.getElementById('loserPct').innerText = `${topLoser.price_change_percentage_24h.toFixed(2)}%`;
    document.getElementById('loserPrice').innerText = `$${topLoser.current_price.toLocaleString()}`;
}

function setupFilterButtons() {
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn =>{
        btn.addEventListener("click", () =>{
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filterType = btn.dataset.filter;
            if(filterType === "all"){
                renderTable(allCoins);
            }
            else if(filterType === "top10"){
                const top10 = allCoins.slice(0, 10);
                renderTable(top10);
            }
            else if(filterType ==="gainers"){
                const gainers = [...allCoins].sort((a, b) => {
                    return (b.price_change_percentage_24h || 0)-(a.price_change_percentage_24h || 0) 
                });
                renderTable(gainers);
            }
            else if(filterType === "losers"){
                const losers = [...allCoins].sort((a, b) => {
                    return (a.price_change_percentage_24h || 0)-(b.price_change_percentage_24h || 0)
                });
                renderTable(losers);
            }
        });
    });
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const filteredCoins = allCoins.filter(coin => {
            const nameMatch = coin.name.toLowerCase().includes(query);
            const symbolMatch = coin.symbol.toLowerCase().includes(query);
            
            return nameMatch || symbolMatch;
        });
        renderTable(filteredCoins);
    });
}




async function getData() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        allCoins = await response.json();
        updateOverviewCards(allCoins);
        renderTable(allCoins);
        setupFilterButtons();
        setupSearch();

    } catch (error) {
        console.error("Data load nahi hua:", error);
    }
}


getData();

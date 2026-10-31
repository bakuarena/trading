// --- State & Config ---
const ASSETS = [
    { symbol: 'BTC/USD', name: 'Bitcoin', price: 67420.50, volatility: 0.002, decimals: 2 },
    { symbol: 'ETH/USD', name: 'Ethereum', price: 3450.12, volatility: 0.003, decimals: 2 },
    { symbol: 'AAPL', name: 'Apple Inc.', price: 190.45, volatility: 0.001, decimals: 2 },
    { symbol: 'TSLA', name: 'Tesla Inc.', price: 245.80, volatility: 0.005, decimals: 2 },
    { symbol: 'NVDA', name: 'NVIDIA', price: 118.33, volatility: 0.004, decimals: 2 }
];

let state = {
    cash: 10000,
    holdings: {}, // { symbol: { qty, avgCost } }
    activeAsset: ASSETS[0],
    tradeMode: 'BUY',
    chartData: {} // { symbol: [candle] }
};

// --- DOM Elements ---
const els = {
    ticker: document.getElementById('tickerContent'),
    watchlist: document.getElementById('watchlist'),
    chartContainer: document.getElementById('mainChart'),
    activeName: document.getElementById('activeAssetName'),
    activePrice: document.getElementById('activeAssetPrice'),
    activeChange: document.getElementById('activeAssetChange'),
    cashBalance: document.getElementById('cashBalance'),
    portfolioValue: document.getElementById('portfolioValue'),
    buyTab: document.getElementById('buyTab'),
    sellTab: document.getElementById('sellTab'),
    tradeAmount: document.getElementById('tradeAmount'),
    tradePrice: document.getElementById('tradePrice'),
    estQty: document.getElementById('estQty'),
    estFees: document.getElementById('estFees'),
    executeTrade: document.getElementById('executeTrade'),
    positionsList: document.getElementById('positionsList'),
    toast: document.getElementById('toast')
};

// --- Chart Setup ---
let chart;
let candleSeries;

function initChart() {
    chart = LightweightCharts.createChart(els.chartContainer, {
        width: els.chartContainer.clientWidth,
        height: els.chartContainer.clientHeight,
        layout: { background: { color: '#0f111a' }, textColor: '#e2e8f0' },
        grid: { vertLines: { color: '#1e2130' }, horzLines: { color: '#1e2130' } },
        timeScale: { timeVisible: true, secondsVisible: false, borderColor: '#2a2d3d' },
        rightPriceScale: { borderColor: '#2a2d3d' }
    });

    candleSeries = chart.addCandlestickSeries({
        upColor: '#10b981',
        downColor: '#ef4444',
        borderVisible: false,
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444'
    });

    window.addEventListener('resize', () => {
        chart.applyOptions({ width: els.chartContainer.clientWidth, height: els.chartContainer.clientHeight });
    });
}

// --- Data Simulation ---
function generateHistory(asset) {
    const data = [];
    let currentPrice = asset.price;
    const now = new Date();
    for (let i = 0; i < 100; i++) {
        const time = new Date(now.getTime() - (100 - i) * 60000); // 1 min candles
        const change = (Math.random() - 0.5) * asset.volatility * currentPrice;
        const open = currentPrice;
        const close = currentPrice + change;
        const high = Math.max(open, close) + Math.random() * asset.volatility * currentPrice;
        const low = Math.min(open, close) - Math.random() * asset.volatility * currentPrice;
        
        data.push({ time: time.getTime() / 1000, open, high, low, close });
        currentPrice = close;
    }
    return data;
}

function setChartAsset(asset) {
    state.activeAsset = asset;
    els.activeName.textContent = asset.symbol;
    
    // Update active state in watchlist
    document.querySelectorAll('.watchlist-item').forEach(el => {
        el.classList.toggle('active', el.dataset.symbol === asset.symbol);
    });

    if (!state.chartData[asset.symbol]) {
        state.chartData[asset.symbol] = generateHistory(asset);
    }
    candleSeries.setData(state.chartData[asset.symbol]);
}

// --- UI Updates ---
function updateUI() {
    // 1. Ticker
    els.ticker.innerHTML = ASSETS.map(a => 
        `<span class="ticker-item ${a.change >= 0 ? 'ticker-up' : 'ticker-down'}">${a.symbol} $${a.price.toFixed(a.decimals)} (${a.change >= 0 ? '+' : ''}${a.change.toFixed(2)}%)</span>`
    ).join('');

    // 2. Watchlist
    if (document.querySelectorAll('.watchlist-item').length === 0) {
        els.watchlist.innerHTML = ASSETS.map(a => `
            <div class="watchlist-item" data-symbol="${a.symbol}">
                <div>
                    <div class="wl-symbol">${a.symbol}</div>
                    <div class="wl-name" style="font-size:0.7rem; color:var(--text-muted)">${a.name}</div>
                </div>
                <div class="wl-price">
                    <div class="wl-current">$${a.price.toFixed(a.decimals)}</div>
                    <div class="wl-change ${a.change >= 0 ? 'ticker-up' : 'ticker-down'}">${a.change >= 0 ? '+' : ''}${a.change.toFixed(2)}%</div>
                </div>
            </div>
        `).join('');
        
        els.watchlist.querySelectorAll('.watchlist-item').forEach(item => {
            item.addEventListener('click', () => {
                const asset = ASSETS.find(a => a.symbol === item.dataset.symbol);
                setChartAsset(asset);
            });
        });
    } else {
        els.watchlist.querySelectorAll('.watchlist-item').forEach(item => {
            const asset = ASSETS.find(a => a.symbol === item.dataset.symbol);
            item.querySelector('.wl-current').textContent = `$${asset.price.toFixed(asset.decimals)}`;
            const changeEl = item.querySelector('.wl-change');
            changeEl.textContent = `${asset.change >= 0 ? '+' : ''}${asset.change.toFixed(2)}%`;
            changeEl.className = `wl-change ${asset.change >= 0
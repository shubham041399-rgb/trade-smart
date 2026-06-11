// netlify/functions/indices.js
// Fetches Nifty 50, Sensex, Bank Nifty from Yahoo Finance server-side (no CORS)
// Deploy to: netlify/functions/indices.js in your GitHub repo

const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 8000
    };
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject).on('timeout', () => reject(new Error('timeout')));
  });
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    // Fetch indices: Nifty50, Sensex, BankNifty
    const url = 'https://query1.finance.yahoo.com/v7/finance/quote?symbols=%5ENSEI,%5EBSESN,%5ENSEBANK&fields=regularMarketPrice,regularMarketChangePercent,regularMarketPreviousClose';
    const raw = await fetchUrl(url);
    const data = JSON.parse(raw);
    const results = data?.quoteResponse?.result || [];

    if (!results.length) throw new Error('No data');

    const indices = {};
    results.forEach(q => {
      const key = q.symbol; // ^NSEI, ^BSESN, ^NSEBANK
      indices[key] = {
        price: q.regularMarketPrice,
        change: q.regularMarketChangePercent,
        prevClose: q.regularMarketPreviousClose
      };
    });

    // Also fetch NSE top stocks
    const stockSyms = 'RELIANCE.NS,TCS.NS,HDFCBANK.NS,INFY.NS,ICICIBANK.NS,BAJFINANCE.NS,SBIN.NS,WIPRO.NS,TATAMOTORS.NS,AXISBANK.NS,MARUTI.NS,LT.NS';
    const stockUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${stockSyms}&fields=regularMarketPrice,regularMarketChangePercent`;
    const stockRaw = await fetchUrl(stockUrl);
    const stockData = JSON.parse(stockRaw);
    const stocks = (stockData?.quoteResponse?.result || []).map(q => ({
      symbol: q.symbol.replace('.NS', ''),
      price: q.regularMarketPrice,
      change: q.regularMarketChangePercent
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, indices, stocks, ts: Date.now() })
    };

  } catch (e) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: false, error: e.message })
    };
  }
};

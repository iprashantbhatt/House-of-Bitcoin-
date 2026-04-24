require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cron = require('node-cron');
const RSSParser = require('rss-parser');

const app = express();
const PORT = 3003;
const parser = new RSSParser();

app.use(cors());
app.use(express.json());

let cache = { btc: null, news: [], top100: [], lastUpdated: null };

const RSS_FEEDS = [
  { url: 'https://feeds.feedburner.com/CoinDesk', source: 'CoinDesk' },
  { url: 'https://cointelegraph.com/rss', source: 'CoinTelegraph' },
  { url: 'https://decrypt.co/feed', source: 'Decrypt' },
  { url: 'https://www.theblock.co/rss.xml', source: 'The Block' },
];

async function fetchNews() {
  try {
    let allNews = [];
    for (let feed of RSS_FEEDS) {
      try {
        const parsed = await parser.parseURL(feed.url);
        const items = parsed.items.slice(0, 8).map(function(item) {
          return { title: item.title||'', summary: item.contentSnippet||'', source: feed.source, time: item.pubDate?new Date(item.pubDate).toLocaleString():'', link: item.link||'', category: 'Markets' };
        });
        allNews = allNews.concat(items);
      } catch(e) { console.log('Feed error:', feed.source, e.message); }
    }
    if (allNews.length > 0) { cache.news = allNews; console.log('News fetched:', allNews.length); }
  } catch(e) { console.log('fetchNews error:', e.message); }
}

async function fetchBTC() {
  try {
    const [priceRes, globalRes, blockRes, hrRes, fgRes] = await Promise.allSettled([
      axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,solana,tether&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true', { timeout: 10000 }),
      axios.get('https://api.coingecko.com/api/v3/global', { timeout: 10000 }),
      axios.get('https://mempool.space/api/blocks/tip/height', { timeout: 8000 }),
      axios.get('https://mempool.space/api/v1/mining/hashrate/3d', { timeout: 8000 }),
      axios.get('https://api.alternative.me/fng/?limit=1', { timeout: 8000 }),
    ]);
    let price=null,change24h=null,mcap=null,volume=null,ethPrice=null,ethChange=null,bnbPrice=null,bnbChange=null,solPrice=null,solChange=null;
    if (priceRes.status==='fulfilled') {
      const d=priceRes.value.data;
      price=d.bitcoin?.usd||null; change24h=d.bitcoin?.usd_24h_change||null;
      mcap=d.bitcoin?.usd_market_cap||null; volume=d.bitcoin?.usd_24h_vol||null;
      ethPrice=d.ethereum?.usd||null; ethChange=d.ethereum?.usd_24h_change||null;
      bnbPrice=d.binancecoin?.usd||null; bnbChange=d.binancecoin?.usd_24h_change||null;
      solPrice=d.solana?.usd||null; solChange=d.solana?.usd_24h_change||null;
    }
    let dominance=null;
    if (globalRes.status==='fulfilled') dominance=parseFloat(globalRes.value.data.data.market_cap_percentage.btc.toFixed(2));
    let blockHeight=null;
    if (blockRes.status==='fulfilled') blockHeight=blockRes.value.data;
    let hashrate=null;
    if (hrRes.status==='fulfilled'&&hrRes.value.data.currentHashrate) hashrate=parseFloat((hrRes.value.data.currentHashrate/1e18).toFixed(1));
    let fearGreed=null;
    if (fgRes.status==='fulfilled') fearGreed=parseInt(fgRes.value.data.data[0].value);
    cache.btc = { price,change24h,mcap,volume, high24h:price?price*1.02:null, low24h:price?price*0.98:null, dominance,blockHeight,hashrate,fearGreed, circulatingSupply:19750000, ethPrice,ethChange,bnbPrice,bnbChange,solPrice,solChange, mempoolSize:18.45,txCount:362591,difficulty:86.87,activeAddresses:1020000 };
    cache.lastUpdated=new Date().toISOString();
    console.log('BTC updated. Price: $'+price+' Block: '+blockHeight);
  } catch(e) { console.log('fetchBTC error:', e.message); }
}

async function fetchTop100() {
  try {
    const res = await axios.get('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false', { timeout: 12000 });
    cache.top100 = res.data.map(function(c) {
      return {
        rank: c.market_cap_rank,
        name: c.name,
        symbol: c.symbol.toUpperCase(),
        image: c.image,
        price: c.current_price,
        change24h: c.price_change_percentage_24h,
        mcap: c.market_cap,
        volume: c.total_volume,
        high24h: c.high_24h,
        low24h: c.low_24h,
        circulatingSupply: c.circulating_supply,
      };
    });
    console.log('Top 100 fetched:', cache.top100.length, 'coins');
  } catch(e) { console.log('Top100 error:', e.message); }
}

app.get('/api/btc', function(req, res) {
  if (!cache.btc) return res.status(503).json({ error: 'Loading...' });
  res.json(cache.btc);
});

app.get('/api/news', function(req, res) { res.json(cache.news); });

app.get('/api/top100', function(req, res) { res.json(cache.top100); });

app.get('/api/health', function(req, res) {
  res.json({ status:'ok', lastUpdated:cache.lastUpdated, newsCount:cache.news.length, top100Count:cache.top100.length });
});

cron.schedule('*/5 * * * *', fetchBTC);
cron.schedule('*/10 * * * *', fetchTop100);
cron.schedule('*/30 * * * *', fetchNews);

fetchBTC();
fetchTop100();
fetchNews();

app.listen(PORT, function() { console.log('HOB Backend running on port '+PORT); });

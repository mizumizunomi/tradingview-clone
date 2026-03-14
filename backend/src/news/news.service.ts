import { Injectable } from '@nestjs/common';
import axios from 'axios';

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  category: string;
  url: string;
  publishedAt: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  relatedSymbols: string[];
}

const MOCK_NEWS: NewsItem[] = [
  {
    id: '1',
    title: 'Bitcoin Surges Past $70,000 as Institutional Demand Accelerates',
    summary: 'Bitcoin reached a new monthly high as major institutions continued to accumulate BTC through spot ETFs. BlackRock\'s iShares Bitcoin Trust recorded its highest single-day inflow.',
    source: 'CryptoDesk',
    category: 'CRYPTO',
    url: '#',
    publishedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    sentiment: 'bullish',
    relatedSymbols: ['BTCUSD', 'ETHUSD'],
  },
  {
    id: '2',
    title: 'Federal Reserve Signals Potential Rate Cuts in Q3 2026',
    summary: 'Fed Chair Jerome Powell indicated that the central bank is monitoring inflation data closely and may consider rate reductions later this year if economic conditions warrant.',
    source: 'Reuters',
    category: 'ECONOMY',
    url: '#',
    publishedAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    sentiment: 'bullish',
    relatedSymbols: ['SPX500', 'DJI', 'NAS100', 'EURUSD'],
  },
  {
    id: '3',
    title: 'Gold Hits Record High Amid Geopolitical Tensions',
    summary: 'Spot gold prices climbed to record territory as investors sought safe-haven assets. Analysts cite ongoing Middle East uncertainty and dollar weakness as key drivers.',
    source: 'Bloomberg',
    category: 'COMMODITIES',
    url: '#',
    publishedAt: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
    sentiment: 'bullish',
    relatedSymbols: ['XAUUSD', 'XAGUSD'],
  },
  {
    id: '4',
    title: 'NVIDIA Reports Record Q4 Earnings, Stock Jumps 8%',
    summary: 'NVIDIA beat analyst expectations for the fourth consecutive quarter, driven by explosive demand for AI chips. Revenue from data center division rose 400% year-over-year.',
    source: 'CNBC',
    category: 'STOCKS',
    url: '#',
    publishedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    sentiment: 'bullish',
    relatedSymbols: ['NVDA', 'MSFT', 'GOOGL'],
  },
  {
    id: '5',
    title: 'EUR/USD Falls Below 1.08 as ECB Holds Rates Steady',
    summary: 'The euro weakened against the dollar after the European Central Bank kept benchmark rates unchanged, diverging from market expectations of a cut at this meeting.',
    source: 'FX Street',
    category: 'FOREX',
    url: '#',
    publishedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    sentiment: 'bearish',
    relatedSymbols: ['EURUSD', 'EURGBP', 'EURJPY'],
  },
  {
    id: '6',
    title: 'Ethereum Upgrade "Prague" Scheduled for April — Devs',
    summary: 'Ethereum core developers confirmed the Prague/Electra hard fork is on track for April. The upgrade will introduce new EIP improvements and validator changes.',
    source: 'The Block',
    category: 'CRYPTO',
    url: '#',
    publishedAt: new Date(Date.now() - 1000 * 60 * 210).toISOString(),
    sentiment: 'bullish',
    relatedSymbols: ['ETHUSD'],
  },
  {
    id: '7',
    title: 'Oil Prices Slide on Weak Chinese Demand Outlook',
    summary: 'WTI crude fell nearly 2% as new data suggested slower-than-expected industrial activity in China, the world\'s largest crude importer. OPEC+ meeting scheduled for next week.',
    source: 'Oil Price',
    category: 'COMMODITIES',
    url: '#',
    publishedAt: new Date(Date.now() - 1000 * 60 * 260).toISOString(),
    sentiment: 'bearish',
    relatedSymbols: ['USOIL', 'UKOIL'],
  },
  {
    id: '8',
    title: 'S&P 500 Nears All-Time High as Tech Rally Continues',
    summary: 'The S&P 500 index approached record territory driven by gains in technology and communication services sectors. Market breadth improved with advancing stocks outnumbering decliners.',
    source: 'MarketWatch',
    category: 'INDICES',
    url: '#',
    publishedAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    sentiment: 'bullish',
    relatedSymbols: ['SPX500', 'NAS100'],
  },
  {
    id: '9',
    title: 'Tesla Deliveries Miss Estimates as Competition Intensifies',
    summary: 'Tesla reported Q1 deliveries below analyst consensus for the second straight quarter. CEO Elon Musk cited production ramp challenges and increased competition from Chinese EV makers.',
    source: 'Reuters',
    category: 'STOCKS',
    url: '#',
    publishedAt: new Date(Date.now() - 1000 * 60 * 380).toISOString(),
    sentiment: 'bearish',
    relatedSymbols: ['TSLA'],
  },
  {
    id: '10',
    title: 'GBP/USD Climbs After UK Inflation Beats Expectations',
    summary: 'The British pound gained against the dollar after UK CPI data came in above consensus, reducing expectations for near-term Bank of England rate cuts.',
    source: 'FX Street',
    category: 'FOREX',
    url: '#',
    publishedAt: new Date(Date.now() - 1000 * 60 * 420).toISOString(),
    sentiment: 'bullish',
    relatedSymbols: ['GBPUSD', 'GBPJPY', 'EURGBP'],
  },
  {
    id: '11',
    title: 'Solana TVL Reaches New ATH as DeFi Activity Surges',
    summary: 'Total value locked in Solana DeFi protocols hit an all-time high, driven by new lending platforms and DEX volume growth. SOL token outperformed the broader crypto market.',
    source: 'DeFi Pulse',
    category: 'CRYPTO',
    url: '#',
    publishedAt: new Date(Date.now() - 1000 * 60 * 500).toISOString(),
    sentiment: 'bullish',
    relatedSymbols: ['SOLUSD'],
  },
  {
    id: '12',
    title: 'Apple Announces $110B Share Buyback Program',
    summary: 'Apple unveiled its largest-ever share buyback authorization alongside quarterly earnings that beat estimates on both revenue and EPS. Services segment grew 14% year-over-year.',
    source: 'CNBC',
    category: 'STOCKS',
    url: '#',
    publishedAt: new Date(Date.now() - 1000 * 60 * 600).toISOString(),
    sentiment: 'bullish',
    relatedSymbols: ['AAPL'],
  },
  {
    id: '13',
    title: 'DAX Retreats as German Factory Orders Disappoint',
    summary: 'Germany\'s benchmark index fell after factory orders declined more than expected in February, raising fresh concerns about the health of Europe\'s largest economy.',
    source: 'Bloomberg',
    category: 'INDICES',
    url: '#',
    publishedAt: new Date(Date.now() - 1000 * 60 * 660).toISOString(),
    sentiment: 'bearish',
    relatedSymbols: ['GER40', 'EURUSD'],
  },
  {
    id: '14',
    title: 'XRP Wins Another Legal Battle, Price Surges 12%',
    summary: 'A U.S. court dismissed additional SEC claims against Ripple Labs in the ongoing XRP securities case, sending the token sharply higher on renewed legal clarity.',
    source: 'CoinDesk',
    category: 'CRYPTO',
    url: '#',
    publishedAt: new Date(Date.now() - 1000 * 60 * 720).toISOString(),
    sentiment: 'bullish',
    relatedSymbols: ['XRPUSD'],
  },
  {
    id: '15',
    title: 'USD/JPY Breaks 150 as BOJ Keeps Ultra-Loose Policy',
    summary: 'The dollar hit 150 yen for the first time this year after the Bank of Japan held its yield curve control policy unchanged, defying analyst expectations for an adjustment.',
    source: 'Reuters',
    category: 'FOREX',
    url: '#',
    publishedAt: new Date(Date.now() - 1000 * 60 * 800).toISOString(),
    sentiment: 'neutral',
    relatedSymbols: ['USDJPY', 'EURJPY', 'GBPJPY'],
  },
];

@Injectable()
export class NewsService {
  async getNews(category?: string): Promise<NewsItem[]> {
    let news = [...MOCK_NEWS];

    if (category && category !== 'ALL') {
      news = news.filter((n) => n.category === category);
    }

    // Shuffle slightly so it feels live
    return news.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }

  async getNewsBySymbol(symbol: string): Promise<NewsItem[]> {
    return MOCK_NEWS.filter((n) => n.relatedSymbols.includes(symbol));
  }
}

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios from 'axios';
import { BinanceFeed } from './providers/binance.feed';
import { YahooProvider } from './providers/yahoo.provider';

export interface PriceData {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  change: number;
  changePercent: number;
  timestamp: number;
}

@Injectable()
export class MarketDataService implements OnModuleInit {
  private readonly logger = new Logger(MarketDataService.name);
  private prices: Map<string, PriceData> = new Map();
  private prevPrices: Map<string, number> = new Map();
  /** Prior-day close per symbol — the baseline daily change% is measured against. */
  private dayBaseline: Map<string, number> = new Map();
  private subscribers: Map<string, Set<(data: PriceData) => void>> = new Map();

  private readonly binance = new BinanceFeed();
  private readonly yahoo = new YahooProvider();
  /** Symbols with a real feed (Binance or Yahoo); everything else uses mock ticks. */
  private readonly realSymbols = new Set<string>();

  private readonly KEY = process.env.TWELVE_DATA_API_KEY;

  // All symbols: our internal symbol → Twelve Data symbol
  private readonly TD_MAP: Record<string, string> = {
    // Crypto
    BTCUSD:  'BTC/USD',  ETHUSD:   'ETH/USD',  BNBUSD:   'BNB/USD',
    SOLUSD:  'SOL/USD',  XRPUSD:   'XRP/USD',  ADAUSD:   'ADA/USD',
    DOGEUSD: 'DOGE/USD', AVAXUSD:  'AVAX/USD', DOTUSD:   'DOT/USD',
    LINKUSD: 'LINK/USD', UNIUSD:   'UNI/USD',  LTCUSD:   'LTC/USD',
    BCHUSD:  'BCH/USD',  ATOMUSD:  'ATOM/USD',
    // Forex
    EURUSD:  'EUR/USD',  GBPUSD:   'GBP/USD',  USDJPY:   'USD/JPY',
    USDCHF:  'USD/CHF',  AUDUSD:   'AUD/USD',  USDCAD:   'USD/CAD',
    NZDUSD:  'NZD/USD',  EURGBP:   'EUR/GBP',  EURJPY:   'EUR/JPY',
    GBPJPY:  'GBP/JPY',
    // Commodities
    XAUUSD:  'XAU/USD',  XAGUSD:   'XAG/USD',
    USOIL:   'WTI/USD',  UKOIL:    'BRENT/USD',
    // Stocks
    AAPL:    'AAPL',     GOOGL:    'GOOGL',     MSFT:     'MSFT',
    AMZN:    'AMZN',     TSLA:     'TSLA',      NVDA:     'NVDA',
    META:    'META',     NFLX:     'NFLX',
    // Indices
    SPX500:  'SPX',      NAS100:   'NDX',       DJI:      'DJI',
    GER40:   'DAX',      UK100:    'FTSE',      JPN225:   'N225',
  };

  // Seed prices used as fallback baseline
  private readonly SEED: Record<string, number> = {
    BTCUSD: 83000, ETHUSD: 1900, BNBUSD: 580, SOLUSD: 130, XRPUSD: 0.52,
    ADAUSD: 0.38, DOGEUSD: 0.16, AVAXUSD: 22, DOTUSD: 5.2, LINKUSD: 13,
    UNIUSD: 6.5, LTCUSD: 87, BCHUSD: 330, ATOMUSD: 4.8,
    EURUSD: 1.0854, GBPUSD: 1.2711, USDJPY: 149.82, USDCHF: 0.8912,
    AUDUSD: 0.6482, USDCAD: 1.3654, NZDUSD: 0.5982, EURGBP: 0.8541,
    EURJPY: 162.54, GBPJPY: 190.23,
    XAUUSD: 2930, XAGUSD: 32.5, USOIL: 67, UKOIL: 71,
    AAPL: 213, GOOGL: 168, MSFT: 388, AMZN: 196, TSLA: 238,
    NVDA: 115, META: 578, NFLX: 980,
    SPX500: 5580, NAS100: 19500, DJI: 41800,
    GER40: 22800, UK100: 8650, JPN225: 37200,
  };

  onModuleInit() {
    this.initPrices();

    // Crypto → Binance (real-time, keyless). Snapshot then live WS.
    this.binance
      .fetchSnapshot()
      .then((snap) => {
        for (const [symbol, { price, changePercent }] of Object.entries(snap)) {
          this.realSymbols.add(symbol);
          // Derive prior-day close from the 24h change%: baseline = price / (1 + pct/100).
          if (changePercent !== 0) this.dayBaseline.set(symbol, price / (1 + changePercent / 100));
          this.setPrice(symbol, price, 0, 0);
        }
        this.logger.log(`Binance snapshot: ${Object.keys(snap).length} crypto symbols`);
        this.binance.connect((symbol, price) => {
          this.realSymbols.add(symbol);
          this.setPrice(symbol, price, 0, 0);
        });
      })
      .catch((err) => this.logger.warn('Binance snapshot failed: ' + err.message));

    // Stocks / forex / indices / commodities → Yahoo (real-time, keyless, no credit cap).
    // Polled: Yahoo has no streaming WS, and this avoids the Twelve Data 8-credit/min limit.
    this.refreshYahoo();
    setInterval(() => this.refreshYahoo(), 15_000);

    // Anything with no real feed keeps a gentle mock walk so the UI is never static.
    this.startMockUpdates();
  }

  /** Poll Yahoo for all non-crypto symbols and update prices. */
  private async refreshYahoo() {
    try {
      const quotes = await this.yahoo.fetchAll();
      let updated = 0;
      for (const [symbol, { price, prevClose }] of Object.entries(quotes)) {
        this.realSymbols.add(symbol);
        if (prevClose > 0) this.dayBaseline.set(symbol, prevClose);
        this.setPrice(symbol, price, 0, 0);
        updated++;
      }
      if (updated) this.logger.debug?.(`Yahoo refresh: ${updated} symbols`);
    } catch (err) {
      this.logger.warn('Yahoo refresh failed: ' + (err as Error).message);
    }
  }

  // ── Init prices from seed values ────────────────────────────────────────────
  private initPrices() {
    for (const [symbol, price] of Object.entries(this.SEED)) {
      this.setPrice(symbol, price, 0, 0);
    }
  }

  private setPrice(symbol: string, price: number, change: number, changePercent: number) {
    // Daily change is measured against the prior-day close (dayBaseline), not the last tick,
    // so change% reflects the real market day rather than tick-to-tick noise. Falls back to
    // the last price / seed until a baseline is known.
    const baseline =
      this.dayBaseline.get(symbol) ?? this.prevPrices.get(symbol) ?? this.SEED[symbol] ?? price;
    const computedChange = price - baseline;
    const computedChangePercent = baseline !== 0 ? (computedChange / baseline) * 100 : 0;

    // Store current price as previous for the next tick
    this.prevPrices.set(symbol, price);

    const spread = price * 0.0001;
    const data: PriceData = {
      symbol, price,
      bid: price - spread / 2,
      ask: price + spread / 2,
      change: computedChange,
      changePercent: computedChangePercent,
      timestamp: Date.now(),
    };
    this.prices.set(symbol, data);
    this.notifySubscribers(symbol, data);
  }

  // ── Mock fallback — only for symbols with no real feed ──────────────────────
  private startMockUpdates() {
    setInterval(() => {
      for (const [symbol, data] of this.prices.entries()) {
        if (this.realSymbols.has(symbol)) continue; // don't clobber real Binance/Yahoo prices
        const delta = (Math.random() - 0.5) * data.price * 0.0003;
        const price = Math.max(data.price + delta, 0.0001);
        this.setPrice(symbol, price, 0, 0);
      }
    }, 2000);
  }

  // ── Candle data ─────────────────────────────────────────────────────────────
  async getCandles(symbol: string, timeframe: string): Promise<any[]> {
    // Crypto → Binance klines, so the chart matches the live Binance price feed.
    if (this.binance.handles(symbol)) {
      try {
        const candles = await this.binance.getCandles(symbol, timeframe);
        if (candles.length) return candles;
      } catch (err) {
        this.logger.warn(`Binance candles failed for ${symbol}: ${(err as Error).message}`);
      }
    }

    const tdSymbol = this.TD_MAP[symbol];
    if (this.KEY && tdSymbol) {
      try {
        const intervalMap: Record<string, string> = {
          '1m': '1min', '5m': '5min', '15m': '15min', '30m': '30min',
          '1h': '1h', '4h': '4h', '1D': '1day', '1W': '1week',
        };
        const res = await axios.get(
          `https://api.twelvedata.com/time_series` +
          `?symbol=${encodeURIComponent(tdSymbol)}` +
          `&interval=${intervalMap[timeframe] || '1h'}` +
          `&outputsize=500` +
          `&apikey=${this.KEY}`
        );
        if (res.data.status === 'error' || !res.data.values?.length) {
          throw new Error(res.data.message || 'No data');
        }
        interface TdCandle { datetime: string; open: string; high: string; low: string; close: string; volume?: string; }
        return res.data.values.reverse().map((c: TdCandle) => ({
          time: Math.floor(new Date(c.datetime).getTime() / 1000),
          open: parseFloat(c.open),   high: parseFloat(c.high),
          low:  parseFloat(c.low),    close: parseFloat(c.close),
          volume: parseFloat(c.volume ?? '0'),
        }));
      } catch (err) {
        this.logger.warn(`Candles failed for ${symbol}: ${err.message}`);
      }
    }
    return this.generateMockCandles(symbol, timeframe);
  }

  private generateMockCandles(symbol: string, timeframe: string): object[] {
    const intervalSeconds: Record<string, number> = {
      '1m': 60, '5m': 300, '15m': 900, '30m': 1800,
      '1h': 3600, '4h': 14400, '1D': 86400, '1W': 604800,
    };
    const seconds = intervalSeconds[timeframe] || 3600;
    const now = Math.floor(Date.now() / 1000);
    const candles: object[] = [];
    let price = this.SEED[symbol] || 100;

    for (let i = 500; i >= 0; i--) {
      const open = price;
      const vol = price * 0.002;
      const close = Math.max(open + (Math.random() - 0.48) * vol, 0.0001);
      const high = Math.max(open, close) + Math.random() * vol * 0.5;
      const low  = Math.max(Math.min(open, close) - Math.random() * vol * 0.5, 0.0001);
      candles.push({ time: now - i * seconds, open, high, low, close, volume: Math.random() * 1000 + 100 });
      price = close;
    }
    return candles;
  }

  // ── Pub/Sub ──────────────────────────────────────────────────────────────────
  private notifySubscribers(symbol: string, data: PriceData) {
    this.subscribers.get(symbol)?.forEach(cb => cb(data));
    this.subscribers.get('ALL')?.forEach(cb => cb(data));
  }

  subscribe(symbol: string, callback: (data: PriceData) => void): () => void {
    if (!this.subscribers.has(symbol)) this.subscribers.set(symbol, new Set());
    this.subscribers.get(symbol)!.add(callback);
    return () => this.subscribers.get(symbol)?.delete(callback);
  }

  getPrice(symbol: string): PriceData | undefined { return this.prices.get(symbol); }
  getAllPrices(): PriceData[] { return Array.from(this.prices.values()); }
}

import { Logger } from '@nestjs/common';
import axios from 'axios';

/**
 * Real-time crypto price feed via Binance (public, keyless, no rate cap).
 *
 * Provides a REST snapshot (24h ticker) for initial load and a combined WebSocket stream for
 * live updates. Only handles crypto; stocks/forex/indices come from Yahoo. Separate from the
 * trading-bot's BinanceProvider (which is candle/orderbook focused) to keep the price-feed
 * concern self-contained.
 */
export class BinanceFeed {
  private readonly logger = new Logger(BinanceFeed.name);
  private ws: { on: (...a: unknown[]) => void; close?: () => void } | null = null;

  /** Our internal symbol → Binance trading pair. */
  static readonly BINANCE_MAP: Record<string, string> = {
    BTCUSD: 'BTCUSDT', ETHUSD: 'ETHUSDT', BNBUSD: 'BNBUSDT',
    SOLUSD: 'SOLUSDT', XRPUSD: 'XRPUSDT', ADAUSD: 'ADAUSDT',
    DOGEUSD: 'DOGEUSDT', AVAXUSD: 'AVAXUSDT', DOTUSD: 'DOTUSDT',
    LINKUSD: 'LINKUSDT', UNIUSD: 'UNIUSDT', LTCUSD: 'LTCUSDT',
    BCHUSD: 'BCHUSDT', ATOMUSD: 'ATOMUSDT',
  };

  private readonly REVERSE: Record<string, string> = Object.fromEntries(
    Object.entries(BinanceFeed.BINANCE_MAP).map(([k, v]) => [v.toLowerCase(), k]),
  );

  handles(symbol: string): boolean {
    return symbol in BinanceFeed.BINANCE_MAP;
  }

  private static readonly INTERVAL_MAP: Record<string, string> = {
    '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m',
    '1h': '1h', '4h': '4h', '1D': '1d', '1W': '1w', '1M': '1M',
  };

  /** Real klines for a crypto symbol, so the chart matches the live price feed. */
  async getCandles(
    symbol: string,
    timeframe: string,
    limit = 500,
  ): Promise<{ time: number; open: number; high: number; low: number; close: number; volume: number }[]> {
    const pair = BinanceFeed.BINANCE_MAP[symbol];
    if (!pair) return [];
    const interval = BinanceFeed.INTERVAL_MAP[timeframe] ?? '1h';
    const res = await axios.get('https://api.binance.com/api/v3/klines', {
      params: { symbol: pair, interval, limit },
      timeout: 10_000,
    });
    return (res.data as unknown[][]).map((k) => ({
      time: Math.floor((k[0] as number) / 1000),
      open: parseFloat(k[1] as string),
      high: parseFloat(k[2] as string),
      low: parseFloat(k[3] as string),
      close: parseFloat(k[4] as string),
      volume: parseFloat(k[5] as string),
    }));
  }

  /** REST snapshot: current price + 24h change% for all crypto symbols in one call. */
  async fetchSnapshot(): Promise<Record<string, { price: number; changePercent: number }>> {
    const pairs = Object.values(BinanceFeed.BINANCE_MAP);
    const url =
      `https://api.binance.com/api/v3/ticker/24hr` +
      `?symbols=${encodeURIComponent(JSON.stringify(pairs))}`;
    const res = await axios.get(url, { timeout: 10_000 });
    const out: Record<string, { price: number; changePercent: number }> = {};
    for (const t of res.data as { symbol: string; lastPrice: string; priceChangePercent: string }[]) {
      const ourSymbol = this.REVERSE[t.symbol.toLowerCase()];
      if (!ourSymbol) continue;
      const price = parseFloat(t.lastPrice);
      if (!isNaN(price) && price > 0) {
        out[ourSymbol] = { price, changePercent: parseFloat(t.priceChangePercent) || 0 };
      }
    }
    return out;
  }

  /**
   * Open the combined ticker WebSocket. onTick fires for every price update with the internal
   * symbol and latest price. Auto-reconnects on close.
   */
  connect(onTick: (symbol: string, price: number) => void): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const WebSocket = require('ws');
      const streams = Object.values(BinanceFeed.BINANCE_MAP)
        .map((p) => `${p.toLowerCase()}@ticker`)
        .join('/');
      const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
      this.ws = ws;

      ws.on('open', () => this.logger.log(`Binance WS connected — ${Object.keys(BinanceFeed.BINANCE_MAP).length} crypto symbols`));
      ws.on('message', (raw: Buffer) => {
        try {
          const msg = JSON.parse(raw.toString());
          const data = msg.data;
          if (!data?.s || !data?.c) return;
          const ourSymbol = this.REVERSE[String(data.s).toLowerCase()];
          if (!ourSymbol) return;
          const price = parseFloat(data.c);
          if (!isNaN(price) && price > 0) onTick(ourSymbol, price);
        } catch {
          /* ignore malformed frame */
        }
      });
      ws.on('error', (err: Error) => this.logger.warn('Binance WS error: ' + err.message));
      ws.on('close', () => {
        this.logger.warn('Binance WS closed, reconnecting in 5s...');
        setTimeout(() => this.connect(onTick), 5000);
      });
    } catch (err) {
      this.logger.warn('Binance WS unavailable: ' + (err as Error).message);
    }
  }
}

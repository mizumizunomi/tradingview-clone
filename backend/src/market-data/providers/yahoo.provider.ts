import { Logger } from '@nestjs/common';
import axios from 'axios';

/**
 * Yahoo Finance price provider for NON-crypto symbols (stocks, forex, indices, commodities).
 *
 * Chosen because it is public, keyless, and has no per-minute credit cap — unlike the Twelve
 * Data free tier (8 credits/min) which cannot feed a whole platform's worth of symbols. Crypto
 * is handled separately by Binance; this provider deliberately does not cover crypto.
 *
 * Uses the batch "spark" endpoint to fetch many symbols in a single request, polled on an
 * interval by MarketDataService.
 */
export class YahooProvider {
  private readonly logger = new Logger(YahooProvider.name);
  private readonly UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';

  /** Our internal symbol → Yahoo Finance ticker. Crypto intentionally excluded. */
  static readonly YAHOO_MAP: Record<string, string> = {
    // Forex (Yahoo uses <PAIR>=X)
    EURUSD: 'EURUSD=X', GBPUSD: 'GBPUSD=X', USDJPY: 'USDJPY=X',
    USDCHF: 'USDCHF=X', AUDUSD: 'AUDUSD=X', USDCAD: 'USDCAD=X',
    NZDUSD: 'NZDUSD=X', EURGBP: 'EURGBP=X', EURJPY: 'EURJPY=X',
    GBPJPY: 'GBPJPY=X',
    // Commodities (futures)
    XAUUSD: 'GC=F', XAGUSD: 'SI=F', USOIL: 'CL=F', UKOIL: 'BZ=F',
    // Stocks
    AAPL: 'AAPL', GOOGL: 'GOOGL', MSFT: 'MSFT', AMZN: 'AMZN',
    TSLA: 'TSLA', NVDA: 'NVDA', META: 'META', NFLX: 'NFLX',
    // Indices
    SPX500: '^GSPC', NAS100: '^NDX', DJI: '^DJI',
    GER40: '^GDAXI', UK100: '^FTSE', JPN225: '^N225',
  };

  private readonly YAHOO_REVERSE: Record<string, string> = Object.fromEntries(
    Object.entries(YahooProvider.YAHOO_MAP).map(([k, v]) => [v, k]),
  );

  /**
   * Fetch current prices for all mapped non-crypto symbols in one batch request.
   * Returns internal-symbol → { price, prevClose } for symbols that resolved.
   */
  async fetchAll(): Promise<Record<string, { price: number; prevClose: number }>> {
    const yahooSymbols = Object.values(YahooProvider.YAHOO_MAP);
    const out: Record<string, { price: number; prevClose: number }> = {};

    // Yahoo's spark endpoint rejects large symbol batches (~28 → 400). Chunk to stay well under.
    // No credit limit here, so a few extra requests per cycle is fine.
    const CHUNK = 15;
    for (let i = 0; i < yahooSymbols.length; i += CHUNK) {
      const chunk = yahooSymbols.slice(i, i + CHUNK);
      // Let axios serialize params once — pre-encoding in the URL double-encodes and 400s.
      const res = await axios.get('https://query1.finance.yahoo.com/v7/finance/spark', {
        params: { symbols: chunk.join(','), interval: '1d', range: '1d' },
        headers: { 'User-Agent': this.UA },
        timeout: 10_000,
      });
      const results = res.data?.spark?.result;
      if (!Array.isArray(results)) continue;
      for (const item of results) {
        const ourSymbol = this.YAHOO_REVERSE[item.symbol as string];
        if (!ourSymbol) continue;
        const meta = item.response?.[0]?.meta;
        const price = meta?.regularMarketPrice;
        const prevClose = meta?.chartPreviousClose ?? meta?.previousClose ?? price;
        if (typeof price === 'number' && price > 0) {
          out[ourSymbol] = { price, prevClose: typeof prevClose === 'number' ? prevClose : price };
        }
      }
    }
    return out;
  }

  /** True if this provider handles the given internal symbol. */
  handles(symbol: string): boolean {
    return symbol in YahooProvider.YAHOO_MAP;
  }
}

import { AssetClass } from '../interfaces/signal.interface';

/**
 * Fundamental analysis weight overlays.
 * Defines how much fundamental data should influence the composite signal score
 * for each asset class and special news conditions.
 */

export interface FundamentalOverlay {
  assetClass: AssetClass;
  baseWeight: number;          // default FA weight for this asset class
  highSentimentBoost: number;  // additional weight when sentiment > 0.5
  catalystBoost: number;       // additional weight per strong catalyst event
  maxFAWeight: number;         // cap on FA influence
  minFAWeight: number;         // floor on FA influence (even during low-news periods)
}

export const FUNDAMENTAL_OVERLAYS: Record<AssetClass, FundamentalOverlay> = {
  CRYPTO: {
    assetClass: 'CRYPTO',
    baseWeight: 0.40,
    highSentimentBoost: 0.10,   // crypto highly sentiment-driven
    catalystBoost: 0.05,
    maxFAWeight: 0.60,
    minFAWeight: 0.20,
  },
  FOREX: {
    assetClass: 'FOREX',
    baseWeight: 0.35,
    highSentimentBoost: 0.08,   // macro news (NFP, CPI, rate decisions)
    catalystBoost: 0.08,        // rate decisions have outsized effect
    maxFAWeight: 0.55,
    minFAWeight: 0.15,
  },
  STOCK: {
    assetClass: 'STOCK',
    baseWeight: 0.40,
    highSentimentBoost: 0.08,   // earnings + macro
    catalystBoost: 0.10,        // earnings beats can dominate
    maxFAWeight: 0.60,
    minFAWeight: 0.15,
  },
  COMMODITY: {
    assetClass: 'COMMODITY',
    baseWeight: 0.20,
    highSentimentBoost: 0.05,
    catalystBoost: 0.08,        // supply shocks, geopolitical
    maxFAWeight: 0.40,
    minFAWeight: 0.10,
  },
};

/**
 * News catalyst keywords mapped to sentiment multipliers.
 * Strong catalysts amplify the FA score.
 */
export const CATALYST_KEYWORDS: { keyword: string; multiplier: number; direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL' }[] = [
  // Bullish catalysts
  { keyword: 'rate cut', multiplier: 1.5, direction: 'BULLISH' },
  { keyword: 'etf approval', multiplier: 1.8, direction: 'BULLISH' },
  { keyword: 'earnings beat', multiplier: 1.4, direction: 'BULLISH' },
  { keyword: 'institutional buying', multiplier: 1.6, direction: 'BULLISH' },
  { keyword: 'halving', multiplier: 1.7, direction: 'BULLISH' },
  { keyword: 'breakout', multiplier: 1.3, direction: 'BULLISH' },
  { keyword: 'upgrade', multiplier: 1.2, direction: 'BULLISH' },
  { keyword: 'accumulation', multiplier: 1.4, direction: 'BULLISH' },
  { keyword: 'partnership', multiplier: 1.2, direction: 'BULLISH' },
  { keyword: 'all-time high', multiplier: 1.3, direction: 'BULLISH' },
  // Bearish catalysts
  { keyword: 'rate hike', multiplier: 1.5, direction: 'BEARISH' },
  { keyword: 'ban', multiplier: 1.8, direction: 'BEARISH' },
  { keyword: 'hack', multiplier: 2.0, direction: 'BEARISH' },
  { keyword: 'earnings miss', multiplier: 1.4, direction: 'BEARISH' },
  { keyword: 'sec investigation', multiplier: 1.7, direction: 'BEARISH' },
  { keyword: 'lawsuit', multiplier: 1.3, direction: 'BEARISH' },
  { keyword: 'downgrade', multiplier: 1.2, direction: 'BEARISH' },
  { keyword: 'liquidation', multiplier: 1.5, direction: 'BEARISH' },
  { keyword: 'recession', multiplier: 1.4, direction: 'BEARISH' },
  { keyword: 'collapse', multiplier: 2.0, direction: 'BEARISH' },
  // Neutral/Volatility
  { keyword: 'fomc', multiplier: 1.3, direction: 'NEUTRAL' },
  { keyword: 'cpi', multiplier: 1.2, direction: 'NEUTRAL' },
  { keyword: 'jobs report', multiplier: 1.2, direction: 'NEUTRAL' },
];

/**
 * Computes the adjusted FA weight for a given signal context.
 */
export function computeFAWeight(
  assetClass: AssetClass,
  sentimentScore: number,
  catalystCount: number,
  strategyFundamentalWeight?: number,
): number {
  if (strategyFundamentalWeight !== undefined) {
    return Math.max(0, Math.min(1, strategyFundamentalWeight));
  }

  const overlay = FUNDAMENTAL_OVERLAYS[assetClass];
  let weight = overlay.baseWeight;

  // Boost for strong sentiment
  if (Math.abs(sentimentScore) > 0.5) {
    weight += overlay.highSentimentBoost;
  }

  // Boost per catalyst
  weight += Math.min(catalystCount, 3) * overlay.catalystBoost;

  // Clamp
  return Math.max(overlay.minFAWeight, Math.min(overlay.maxFAWeight, weight));
}

/**
 * Scans headlines for known catalyst keywords and returns the strongest matches.
 */
export function extractCatalysts(headlines: string[]): string[] {
  const found: string[] = [];
  const lowerHeadlines = headlines.map((h) => h.toLowerCase());

  for (const { keyword, direction } of CATALYST_KEYWORDS) {
    for (const headline of lowerHeadlines) {
      if (headline.includes(keyword)) {
        found.push(`${direction === 'BULLISH' ? '📈' : direction === 'BEARISH' ? '📉' : '📊'} ${keyword}`);
        break;
      }
    }
  }

  return [...new Set(found)].slice(0, 5);
}

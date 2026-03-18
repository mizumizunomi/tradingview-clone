import { ChartDrawingSet } from './chart-drawing.interface';

export interface AnalysisResponse {
  asset: string;
  timeframe: string;
  timestamp: string;

  verdict: {
    action: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;      // 0-100
    strength: 'weak' | 'moderate' | 'strong';
    summary: string;
  };

  levels: {
    entry: number;
    stopLoss: number;
    takeProfit1: number;
    takeProfit2: number;
    riskRewardRatio: number;
  };

  technicals: {
    trend: 'bullish' | 'bearish' | 'neutral';
    compositeScore: number;
    indicators: {
      name: string;
      value: number | string;
      signal: 'bullish' | 'bearish' | 'neutral';
      detail: string;
    }[];
    patterns: {
      name: string;
      status: 'forming' | 'confirmed';
      direction: 'bullish' | 'bearish';
      detail: string;
    }[];
    supportResistance: {
      supports: { price: number; strength: number; touches: number }[];
      resistances: { price: number; strength: number; touches: number }[];
    };
  };

  multiTimeframe: {
    timeframe: string;
    signal: 'bullish' | 'bearish' | 'neutral';
    confidence: number;
  }[];
  confluenceScore: number;

  fundamentals: {
    newsSentiment: {
      score: number;
      label: string;
      headlines: { title: string; sentiment: number; source: string }[];
    };
    marketData?: {
      volume24h?: number;
      volumeChange?: number;
      marketCap?: number;
      fearGreedIndex?: number;
      fundingRate?: number;
      openInterest?: number;
    };
  };

  // Chart drawings to render on the frontend
  drawings: ChartDrawingSet;
}

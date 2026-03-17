export type AssetClass = 'CRYPTO' | 'FOREX' | 'STOCK' | 'COMMODITY';
export type SignalAction = 'BUY' | 'SELL' | 'HOLD';
export type SignalStatus = 'PENDING' | 'EXECUTED' | 'EXPIRED' | 'CANCELLED';
export type RiskLevel = 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';

export interface IndicatorSnapshot {
  name: string;
  value: number | number[] | null;
  signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  score: number; // -1 to +1
}

export interface TechnicalAnalysisResult {
  asset: string;
  timeframe: string;
  compositeScore: number; // -1.0 to +1.0
  indicators: IndicatorSnapshot[];
  supportLevels: number[];
  resistanceLevels: number[];
  trend: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS';
  patterns: string[];
  atr: number;
  timestamp: Date;
}

export interface FundamentalAnalysisResult {
  asset: string;
  compositeScore: number; // -1.0 to +1.0
  sentimentScore: number;
  newsItems: Array<{
    headline: string;
    sentiment: number;
    source: string;
    publishedAt: Date;
  }>;
  marketMetrics?: Record<string, unknown>;
  catalysts: string[];
  timestamp: Date;
}

export interface SignalResult {
  asset: string;
  assetClass: AssetClass;
  action: SignalAction;
  confidence: number; // 0.0 to 1.0
  strategy: string;
  reasoning: string;
  technicalData: TechnicalAnalysisResult;
  fundamentalData?: FundamentalAnalysisResult;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  timeframe: string;
  expiresAt?: Date;
}

export interface BacktestResult {
  totalReturn: number;
  totalReturnPercent: number;
  winRate: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  sharpeRatio: number;
  tradeCount: number;
  winCount: number;
  lossCount: number;
  avgWin: number;
  avgLoss: number;
  equityCurve: Array<{ date: Date; equity: number }>;
  trades: Array<{
    date: Date;
    action: SignalAction;
    price: number;
    pnl: number;
    reason: string;
  }>;
}

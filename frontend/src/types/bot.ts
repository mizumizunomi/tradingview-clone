export type AssetClass = "CRYPTO" | "FOREX" | "STOCK" | "COMMODITY";
export type SignalAction = "BUY" | "SELL" | "HOLD";
export type SignalStatus = "PENDING" | "EXECUTED" | "EXPIRED" | "CANCELLED";
export type RiskLevel = "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE";

export interface IndicatorSnapshot {
  name: string;
  value: number | number[] | null;
  signal: "BULLISH" | "BEARISH" | "NEUTRAL";
  score: number;
}

export interface TechnicalAnalysis {
  asset: string;
  timeframe: string;
  compositeScore: number;
  indicators: IndicatorSnapshot[];
  supportLevels: number[];
  resistanceLevels: number[];
  trend: "UPTREND" | "DOWNTREND" | "SIDEWAYS";
  patterns: string[];
  atr: number;
  timestamp: string;
}

export interface FundamentalAnalysis {
  asset: string;
  compositeScore: number;
  sentimentScore: number;
  newsItems: Array<{
    headline: string;
    sentiment: number;
    source: string;
    publishedAt: string;
  }>;
  marketMetrics?: Record<string, unknown>;
  catalysts: string[];
  timestamp: string;
}

export interface TradingSignal {
  id: string;
  userId: string;
  asset: string;
  assetClass: AssetClass;
  action: SignalAction;
  confidence: number;
  strategy: string;
  reasoning: string;
  technicalData: TechnicalAnalysis;
  fundamentalData?: FundamentalAnalysis;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  timeframe: string;
  status: SignalStatus;
  autoExecuted: boolean;
  createdAt: string;
  expiresAt?: string;
}

export interface BotStrategy {
  id: string;
  userId: string;
  name: string;
  assetClass: AssetClass;
  indicators: Record<string, unknown>;
  rules: Record<string, unknown>;
  riskParams: {
    stopLossPercent?: number;
    takeProfitPercent?: number;
    maxPositionSize?: number;
  };
  isActive: boolean;
  backtestResults?: BacktestResult;
  createdAt: string;
  updatedAt: string;
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
  equityCurve: Array<{ date: string; equity: number }>;
  trades: Array<{
    date: string;
    action: SignalAction;
    price: number;
    pnl: number;
    reason: string;
  }>;
}

export interface BotSettings {
  id: string;
  userId: string;
  autoTradeEnabled: boolean;
  riskLevel: RiskLevel;
  maxDailyTrades: number;
  maxDrawdownPercent: number;
  enabledAssetClasses: AssetClass[];
  notifyOnSignal: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderStatus {
  name: string;
  available: boolean;
  lastChecked: string;
  errorMessage?: string;
}

export interface BotDashboardData {
  totalSignals: number;
  executedCount: number;
  pendingCount: number;
  byAction: { BUY: number; SELL: number; HOLD: number };
  avgConfidence: number;
  recentSignals: TradingSignal[];
  settings: BotSettings;
  providerStatuses: ProviderStatus[];
  schedulerStatus: { running: boolean; intervalMs: number };
}

export interface ResearchReport {
  asset: string;
  assetClass: string;
  generatedAt: string;
  priceActionSummary: {
    asset: string;
    timeframes: Record<string, {
      trend: string;
      compositeScore: number;
      keyLevels: { support: number[]; resistance: number[] };
    }>;
  };
  technicalSummary: string;
  fundamentalSummary: string;
  correlations: {
    asset: string;
    correlatedAssets: Array<{ symbol: string; correlation: number; period: string }>;
  };
  overallVerdict: string;
  confidence: number;
  suggestedEntry?: number;
  suggestedStopLoss?: number;
  suggestedTakeProfit?: number;
  riskRewardRatio?: number;
  dataSources: string[];
  unavailableSources: string[];
}

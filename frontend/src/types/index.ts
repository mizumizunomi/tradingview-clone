export interface Asset {
  id: string;
  symbol: string;
  name: string;
  category: AssetCategory;
  broker: string;
  baseAsset?: string;
  quoteAsset?: string;
  minOrderSize: number;
  maxLeverage: number;
  spread: number;
  commission: number;
  isFeatured: boolean;
  currentPrice?: number;
  priceChange?: number;
  priceChangePercent?: number;
}

export type AssetCategory =
  | "CRYPTO" | "FOREX" | "STOCKS" | "FUTURES"
  | "INDICES" | "COMMODITIES" | "FUNDS" | "BONDS"
  | "ECONOMY" | "OPTIONS";

export type Timeframe = "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1D" | "1W" | "1M";

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface Order {
  id: string;
  assetId?: string;
  symbol: string;
  assetName?: string;
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT" | "STOP_LOSS" | "TAKE_PROFIT";
  quantity: number;
  leverage: number;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  limitPrice?: number;
  margin?: number;
  commission?: number;
  status: "PENDING" | "FILLED" | "CANCELLED" | "REJECTED";
  createdAt: string;
}

export interface Position {
  id: string;
  symbol: string;
  assetName: string;
  side: "BUY" | "SELL";
  quantity: number;
  leverage: number;
  entryPrice: number;
  currentPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  unrealizedPnL: number;
  realizedPnL: number;
  margin: number;
  commission: number;
  spread: number;
  swap: number;
  isOpen: boolean;
  openedAt: string;
  closedAt?: string;
}

export interface Wallet {
  id: string;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
}

export type PlanTier = "NONE" | "DEFAULT" | "SILVER" | "GOLD" | "PLATINUM";

export interface UserSubscription {
  id: string;
  tier: PlanTier;
  totalDeposited: number;
  monthlyFee: number;
  isActive: boolean;
  activatedAt?: string;
  nextBillingDate?: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  plan?: string; // raw string from DB ("none" | "default" | "silver" | "gold" | "platinum")
  avatar?: string;
  bio?: string;
  wallet?: Wallet;
  subscription?: UserSubscription;
}

export interface PriceUpdate {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  change: number;
  changePercent: number;
  timestamp: number;
}

export interface TradeRequest {
  assetId: string;
  symbol: string;
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT";
  quantity: number;
  leverage: number;
  stopLoss?: number;
  takeProfit?: number;
  limitPrice?: number;
}

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
  duration?: number;
}

export interface PriceAlert {
  id: string;
  symbol: string;
  price: number;
  condition: "above" | "below";
  message?: string;
  triggered: boolean;
  createdAt: number;
}

export interface OrderBookEntry {
  price: number;
  size: number;
  total: number;
}

export type ChartLayout = "1x1" | "2x1" | "2x2" | "3x1";

export interface ChartPanelConfig {
  id: string;
  symbol: string;
  timeframe: Timeframe;
}

export interface CalendarEvent {
  id: string;
  date: string;
  time: string;
  country: string;
  flag: string;
  event: string;
  impact: "high" | "medium" | "low";
  forecast?: string;
  previous?: string;
  actual?: string;
}

export interface ChartSettings {
  bgColor: string;
  gridColor: string;
  upColor: string;
  downColor: string;
  wickUpColor: string;
  wickDownColor: string;
  logScale: boolean;
  percentScale: boolean;
}

// ── AI Bot Types ────────────────────────────────────────────────────────────

export type BotDrawingType = 'horizontal_line' | 'trend_line' | 'arrow' | 'zone' | 'fibonacci' | 'annotation';

export interface BotHorizontalLine {
  type: 'horizontal_line';
  id: string;
  price: number;
  label: string;
  style: 'solid' | 'dashed' | 'dotted';
  color: string;
  thickness: number;
  category: 'support' | 'resistance' | 'stop_loss' | 'take_profit' | 'entry' | 'fibonacci';
  annotation?: string;
}

export interface BotTrendLine {
  type: 'trend_line';
  id: string;
  startTime: number;
  startPrice: number;
  endTime: number;
  endPrice: number;
  label?: string;
  style: 'solid' | 'dashed';
  color: string;
  category: 'pattern' | 'trend' | 'channel';
  annotation?: string;
}

export interface BotArrow {
  type: 'arrow';
  id: string;
  time: number;
  price: number;
  direction: 'up' | 'down';
  label: string;
  color: string;
  size: 'small' | 'medium' | 'large';
  annotation?: string;
}

export interface BotZone {
  type: 'zone';
  id: string;
  fromPrice: number;
  toPrice: number;
  color: string;
  label?: string;
  category: 'supply' | 'demand' | 'overbought' | 'oversold' | 'consolidation';
  annotation?: string;
}

export interface BotFibonacci {
  type: 'fibonacci';
  id: string;
  highPrice: number;
  highTime: number;
  lowPrice: number;
  lowTime: number;
  levels: { ratio: number; price: number; label: string }[];
  color: string;
  annotation?: string;
}

export interface BotAnnotation {
  type: 'annotation';
  id: string;
  time: number;
  price: number;
  icon: 'info' | 'warning' | 'signal' | 'pattern' | 'news';
  text: string;
  detailedText: string;
}

export type BotDrawing = BotHorizontalLine | BotTrendLine | BotArrow | BotZone | BotFibonacci | BotAnnotation;

export interface BotChartDrawingSet {
  asset: string;
  timeframe: string;
  generatedAt: string;
  drawings: BotDrawing[];
}

export interface BotAnalysisVerdict {
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  strength: 'weak' | 'moderate' | 'strong';
  summary: string;
}

export interface BotAnalysisLevels {
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  riskRewardRatio: number;
}

export interface BotIndicatorResult {
  name: string;
  value: number | string;
  signal: 'bullish' | 'bearish' | 'neutral';
  detail: string;
}

export interface BotAnalysisResponse {
  asset: string;
  timeframe: string;
  timestamp: string;
  verdict: BotAnalysisVerdict;
  levels: BotAnalysisLevels;
  technicals: {
    trend: 'bullish' | 'bearish' | 'neutral';
    compositeScore: number;
    indicators: BotIndicatorResult[];
    patterns: { name: string; status: string; direction: string; detail: string }[];
    supportResistance: {
      supports: { price: number; strength: number; touches: number }[];
      resistances: { price: number; strength: number; touches: number }[];
    };
  };
  multiTimeframe: { timeframe: string; signal: 'bullish' | 'bearish' | 'neutral'; confidence: number }[];
  confluenceScore: number;
  fundamentals: {
    newsSentiment: { score: number; label: string; headlines: { title: string; sentiment: number; source: string }[] };
    marketData?: { volume24h?: number; volumeChange?: number; marketCap?: number; fearGreedIndex?: number; fundingRate?: number };
  };
  drawings: BotChartDrawingSet;
}

export interface BotSignal {
  id: string;
  asset: string;
  assetClass: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  timeframe: string;
  reasoning: string;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  status: 'PENDING' | 'EXECUTED' | 'EXPIRED' | 'CANCELLED';
  autoExecuted: boolean;
  createdAt: string;
  expiresAt?: string;
}

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

export interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  wallet?: Wallet;
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

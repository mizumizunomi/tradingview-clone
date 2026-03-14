import { create } from "zustand";
import { Asset, Position, Wallet, PriceUpdate, Timeframe, CandleData, User } from "@/types";

export type DrawingTool =
  | "cursor" | "crosshair"
  | "trendline" | "ray" | "extended" | "infoline"
  | "hline" | "vline" | "rectangle" | "circle"
  | "fibonacci" | "fibchannel" | "fibwedge" | "fibarc" | "fibspiral" | "fibspeed" | "fibtime"
  | "pitchfork" | "schiffpitchfork"
  | "triangle" | "wedge" | "channel" | "parallelchannel"
  | "brush" | "highlighter" | "arrow" | "text" | "callout" | "note" | "anchored_note"
  | "longposition" | "shortposition" | "forecast"
  | "measure" | "zoom" | "magnet" | "eraser";

export type ChartType = "candlestick" | "bar" | "line" | "area" | "baseline" | "heikin-ashi";

export interface Indicator {
  id: string;
  type: string;
  label: string;
  params: Record<string, number | string>;
  visible: boolean;
  color?: string;
  pane: "main" | "rsi" | "macd" | "stoch" | "wr" | "atr" | "vol";
}

export interface Drawing {
  id: string;
  tool: DrawingTool;
  points: { time: number; price: number }[];
  color: string;
  lineWidth: number;
  text?: string;
  style?: "solid" | "dashed" | "dotted";
  fillColor?: string;
}

interface TradingState {
  // Auth
  user: User | null;
  token: string | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;

  // Selected asset & chart
  selectedAsset: Asset | null;
  timeframe: Timeframe;
  candles: CandleData[];
  setSelectedAsset: (asset: Asset) => void;
  setTimeframe: (tf: Timeframe) => void;
  setCandles: (candles: CandleData[]) => void;

  // Live prices
  prices: Record<string, PriceUpdate>;
  updatePrice: (update: PriceUpdate) => void;

  // Assets list
  assets: Asset[];
  setAssets: (assets: Asset[]) => void;

  // Positions & wallet
  positions: Position[];
  wallet: Wallet | null;
  setPositions: (positions: Position[]) => void;
  setWallet: (wallet: Wallet) => void;
  updatePosition: (position: Position) => void;
  removePosition: (id: string) => void;

  // UI state
  orderSide: "BUY" | "SELL";
  orderType: "MARKET" | "LIMIT";
  quantity: number;
  leverage: number;
  stopLoss: string;
  takeProfit: string;
  limitPrice: string;
  setOrderSide: (side: "BUY" | "SELL") => void;
  setOrderType: (type: "MARKET" | "LIMIT") => void;
  setQuantity: (qty: number) => void;
  setLeverage: (lev: number) => void;
  setStopLoss: (sl: string) => void;
  setTakeProfit: (tp: string) => void;
  setLimitPrice: (lp: string) => void;

  // Tabs
  activeBottomTab: "positions" | "orders" | "history";
  setActiveBottomTab: (tab: "positions" | "orders" | "history") => void;

  // Theme
  theme: "dark" | "light";
  setTheme: (theme: "dark" | "light") => void;
  toggleTheme: () => void;

  // Chart type
  chartType: ChartType;
  setChartType: (type: ChartType) => void;

  // Drawing tools
  activeTool: DrawingTool;
  setActiveTool: (tool: DrawingTool) => void;
  drawings: Drawing[];
  addDrawing: (drawing: Drawing) => void;
  updateDrawing: (id: string, drawing: Partial<Drawing>) => void;
  removeDrawing: (id: string) => void;
  clearDrawings: () => void;
  selectedDrawingId: string | null;
  setSelectedDrawingId: (id: string | null) => void;

  // Indicators
  indicators: Indicator[];
  addIndicator: (indicator: Indicator) => void;
  removeIndicator: (id: string) => void;
  updateIndicator: (id: string, patch: Partial<Indicator>) => void;
  toggleIndicator: (id: string) => void;
  showIndicatorsModal: boolean;
  setShowIndicatorsModal: (show: boolean) => void;
}

export const useTradingStore = create<TradingState>((set) => ({
  user: null,
  token: typeof window !== "undefined" ? localStorage.getItem("token") : null,
  setUser: (user) => set({ user }),
  setToken: (token) => {
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
    set({ token });
  },

  selectedAsset: null,
  timeframe: "1h",
  candles: [],
  setSelectedAsset: (asset) => set({ selectedAsset: asset }),
  setTimeframe: (timeframe) => set({ timeframe }),
  setCandles: (candles) => set({ candles }),

  prices: {},
  updatePrice: (update) =>
    set((state) => ({ prices: { ...state.prices, [update.symbol]: update } })),

  assets: [],
  setAssets: (assets) => set({ assets }),

  positions: [],
  wallet: null,
  setPositions: (positions) => set({ positions }),
  setWallet: (wallet) => set({ wallet }),
  updatePosition: (position) =>
    set((state) => ({ positions: state.positions.map((p) => p.id === position.id ? position : p) })),
  removePosition: (id) =>
    set((state) => ({ positions: state.positions.filter((p) => p.id !== id) })),

  orderSide: "BUY",
  orderType: "MARKET",
  quantity: 0.01,
  leverage: 1,
  stopLoss: "",
  takeProfit: "",
  limitPrice: "",
  setOrderSide: (orderSide) => set({ orderSide }),
  setOrderType: (orderType) => set({ orderType }),
  setQuantity: (quantity) => set({ quantity }),
  setLeverage: (leverage) => set({ leverage }),
  setStopLoss: (stopLoss) => set({ stopLoss }),
  setTakeProfit: (takeProfit) => set({ takeProfit }),
  setLimitPrice: (limitPrice) => set({ limitPrice }),

  activeBottomTab: "positions",
  setActiveBottomTab: (activeBottomTab) => set({ activeBottomTab }),

  theme: "dark",
  setTheme: (theme) => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("light", theme === "light");
    }
    set({ theme });
  },
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === "dark" ? "light" : "dark";
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("light", next === "light");
      }
      return { theme: next };
    }),

  chartType: "candlestick",
  setChartType: (chartType) => set({ chartType }),

  activeTool: "cursor",
  setActiveTool: (activeTool) => set({ activeTool }),
  drawings: [],
  addDrawing: (drawing) => set((state) => ({ drawings: [...state.drawings, drawing] })),
  updateDrawing: (id, patch) =>
    set((state) => ({ drawings: state.drawings.map((d) => d.id === id ? { ...d, ...patch } : d) })),
  removeDrawing: (id) => set((state) => ({ drawings: state.drawings.filter((d) => d.id !== id) })),
  clearDrawings: () => set({ drawings: [] }),
  selectedDrawingId: null,
  setSelectedDrawingId: (selectedDrawingId) => set({ selectedDrawingId }),

  indicators: [],
  addIndicator: (indicator) => set((state) => ({ indicators: [...state.indicators, indicator] })),
  removeIndicator: (id) => set((state) => ({ indicators: state.indicators.filter((i) => i.id !== id) })),
  updateIndicator: (id, patch) =>
    set((state) => ({ indicators: state.indicators.map((i) => i.id === id ? { ...i, ...patch } : i) })),
  toggleIndicator: (id) =>
    set((state) => ({ indicators: state.indicators.map((i) => i.id === id ? { ...i, visible: !i.visible } : i) })),
  showIndicatorsModal: false,
  setShowIndicatorsModal: (showIndicatorsModal) => set({ showIndicatorsModal }),
}));

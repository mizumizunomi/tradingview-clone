import { create } from "zustand";
import {
  Asset, Position, Wallet, PriceUpdate, Timeframe, CandleData, User,
  Toast, PriceAlert, ChartLayout, ChartPanelConfig, ChartSettings,
  BotDrawing, BotAnalysisResponse, BotSignal,
} from "@/types";

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
  locked?: boolean;
  visible?: boolean;
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
  activeBottomTab: "positions" | "orders" | "history" | "alerts";
  setActiveBottomTab: (tab: "positions" | "orders" | "history" | "alerts") => void;

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
  drawingHistory: Drawing[][];
  addDrawing: (drawing: Drawing) => void;
  updateDrawing: (id: string, drawing: Partial<Drawing>) => void;
  removeDrawing: (id: string) => void;
  clearDrawings: () => void;
  undoDrawing: () => void;
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

  // Toast notifications
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;

  // Price alerts
  alerts: PriceAlert[];
  addAlert: (alert: Omit<PriceAlert, "id" | "triggered" | "createdAt">) => void;
  removeAlert: (id: string) => void;
  triggerAlert: (id: string) => void;
  showAlertModal: boolean;
  setShowAlertModal: (show: boolean) => void;
  alertModalPrice: number | null;
  alertModalSymbol: string | null;
  setAlertModalContext: (symbol: string, price: number) => void;

  // Multi-chart layout
  chartLayout: ChartLayout;
  chartPanels: ChartPanelConfig[];
  activeChartId: string;
  setChartLayout: (layout: ChartLayout) => void;
  setActiveChartId: (id: string) => void;
  updateChartPanel: (id: string, patch: Partial<ChartPanelConfig>) => void;

  // Chart settings
  chartSettings: ChartSettings;
  setChartSettings: (patch: Partial<ChartSettings>) => void;
  showChartSettings: boolean;
  setShowChartSettings: (show: boolean) => void;

  // Replay mode
  replayMode: boolean;
  replayIndex: number;
  replayPlaying: boolean;
  setReplayMode: (on: boolean) => void;
  setReplayIndex: (i: number) => void;
  setReplayPlaying: (playing: boolean) => void;

  // Object tree
  showObjectTree: boolean;
  setShowObjectTree: (show: boolean) => void;

  // DOM panel
  showDOMPanel: boolean;
  setShowDOMPanel: (show: boolean) => void;

  // Order panel collapse
  showOrderPanel: boolean;
  setShowOrderPanel: (v: boolean) => void;

  // Keyboard shortcuts modal
  showKeyboardShortcuts: boolean;
  setShowKeyboardShortcuts: (v: boolean) => void;

  // AI Bot panel state
  botPanelOpen: boolean;
  setBotPanelOpen: (open: boolean) => void;
  botAnalysis: BotAnalysisResponse | null;
  setBotAnalysis: (analysis: BotAnalysisResponse | null) => void;
  botAnalyzing: boolean;
  setBotAnalyzing: (v: boolean) => void;
  botDrawings: BotDrawing[];
  setBotDrawings: (drawings: BotDrawing[]) => void;
  clearBotDrawings: () => void;
  showBotDrawings: boolean;
  setShowBotDrawings: (v: boolean) => void;
  botHoveredDrawingId: string | null;
  setBotHoveredDrawingId: (id: string | null) => void;
  botSignals: BotSignal[];
  setBotSignals: (signals: BotSignal[]) => void;
}

const DEFAULT_CHART_PANELS: ChartPanelConfig[] = [
  { id: "main", symbol: "BTCUSD", timeframe: "1h" },
];

export const useTradingStore = create<TradingState>((set, get) => ({
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
  setSelectedAsset: (asset) => {
    set({ selectedAsset: asset });
    // sync main chart panel
    set((s) => ({
      chartPanels: s.chartPanels.map((p) =>
        p.id === s.activeChartId ? { ...p, symbol: asset.symbol } : p
      ),
    }));
  },
  setTimeframe: (timeframe) => {
    set({ timeframe });
    set((s) => ({
      chartPanels: s.chartPanels.map((p) =>
        p.id === s.activeChartId ? { ...p, timeframe } : p
      ),
    }));
  },
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
  drawings: typeof window !== "undefined" ? JSON.parse(localStorage.getItem("tv_drawings") || "[]") : [],
  drawingHistory: [],
  addDrawing: (drawing) => {
    set((state) => ({
      drawingHistory: [...state.drawingHistory.slice(-20), state.drawings],
      drawings: [...state.drawings, drawing],
    }));
    if (typeof window !== "undefined") {
      localStorage.setItem("tv_drawings", JSON.stringify([...get().drawings]));
    }
  },
  updateDrawing: (id, patch) =>
    set((state) => ({ drawings: state.drawings.map((d) => d.id === id ? { ...d, ...patch } : d) })),
  removeDrawing: (id) => {
    set((state) => ({ drawings: state.drawings.filter((d) => d.id !== id) }));
    if (typeof window !== "undefined") {
      localStorage.setItem("tv_drawings", JSON.stringify(get().drawings));
    }
  },
  clearDrawings: () => set((state) => ({ drawingHistory: [...state.drawingHistory.slice(-20), state.drawings], drawings: [] })),
  undoDrawing: () =>
    set((state) => {
      if (state.drawingHistory.length === 0) return {};
      const prev = state.drawingHistory[state.drawingHistory.length - 1];
      return { drawings: prev, drawingHistory: state.drawingHistory.slice(0, -1) };
    }),
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

  // Toasts
  toasts: [],
  addToast: (toast) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, toast.duration ?? 4000);
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  // Alerts
  alerts: [],
  addAlert: (alert) =>
    set((state) => ({
      alerts: [...state.alerts, { ...alert, id: `alert_${Date.now()}`, triggered: false, createdAt: Date.now() }],
    })),
  removeAlert: (id) => set((state) => ({ alerts: state.alerts.filter((a) => a.id !== id) })),
  triggerAlert: (id) =>
    set((state) => ({ alerts: state.alerts.map((a) => a.id === id ? { ...a, triggered: true } : a) })),
  showAlertModal: false,
  setShowAlertModal: (showAlertModal) => set({ showAlertModal }),
  alertModalPrice: null,
  alertModalSymbol: null,
  setAlertModalContext: (symbol, price) => set({ alertModalSymbol: symbol, alertModalPrice: price, showAlertModal: true }),

  // Multi-chart
  chartLayout: "1x1",
  chartPanels: DEFAULT_CHART_PANELS,
  activeChartId: "main",
  setChartLayout: (chartLayout) => {
    const counts: Record<ChartLayout, number> = { "1x1": 1, "2x1": 2, "2x2": 4, "3x1": 3 };
    const count = counts[chartLayout];
    set((state) => {
      const panels = [...state.chartPanels];
      while (panels.length < count) {
        panels.push({ id: `panel_${panels.length}`, symbol: "BTCUSD", timeframe: "1h" });
      }
      return { chartLayout, chartPanels: panels.slice(0, count) };
    });
  },
  setActiveChartId: (activeChartId) => set({ activeChartId }),
  updateChartPanel: (id, patch) =>
    set((state) => ({ chartPanels: state.chartPanels.map((p) => p.id === id ? { ...p, ...patch } : p) })),

  // Chart settings
  chartSettings: {
    bgColor: "#131722", gridColor: "#1e222d",
    upColor: "#26a69a", downColor: "#ef5350",
    wickUpColor: "#26a69a", wickDownColor: "#ef5350",
    logScale: false, percentScale: false,
  },
  setChartSettings: (patch) =>
    set((state) => ({ chartSettings: { ...state.chartSettings, ...patch } })),
  showChartSettings: false,
  setShowChartSettings: (showChartSettings) => set({ showChartSettings }),

  // Replay mode
  replayMode: false,
  replayIndex: 50,
  replayPlaying: false,
  setReplayMode: (replayMode) => set({ replayMode, replayPlaying: false }),
  setReplayIndex: (replayIndex) => set({ replayIndex }),
  setReplayPlaying: (replayPlaying) => set({ replayPlaying }),

  // Object tree
  showObjectTree: false,
  setShowObjectTree: (showObjectTree) => set({ showObjectTree }),

  // DOM panel
  showDOMPanel: false,
  setShowDOMPanel: (showDOMPanel) => set({ showDOMPanel }),

  // Order panel collapse
  showOrderPanel: true,
  setShowOrderPanel: (showOrderPanel) => set({ showOrderPanel }),

  // Keyboard shortcuts modal
  showKeyboardShortcuts: false,
  setShowKeyboardShortcuts: (showKeyboardShortcuts) => set({ showKeyboardShortcuts }),

  // AI Bot panel
  botPanelOpen: false,
  setBotPanelOpen: (botPanelOpen) => set({ botPanelOpen }),
  botAnalysis: null,
  setBotAnalysis: (botAnalysis) => set({ botAnalysis }),
  botAnalyzing: false,
  setBotAnalyzing: (botAnalyzing) => set({ botAnalyzing }),
  botDrawings: [],
  setBotDrawings: (botDrawings) => set({ botDrawings }),
  clearBotDrawings: () => set({ botDrawings: [] }),
  showBotDrawings: true,
  setShowBotDrawings: (showBotDrawings) => set({ showBotDrawings }),
  botHoveredDrawingId: null,
  setBotHoveredDrawingId: (botHoveredDrawingId) => set({ botHoveredDrawingId }),
  botSignals: [],
  setBotSignals: (botSignals) => set({ botSignals }),
}));

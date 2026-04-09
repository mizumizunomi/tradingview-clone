"use client";
import { useEffect, useRef, useId } from "react";
import { useTradingStore } from "@/store/trading.store";
import type { Timeframe } from "@/types";

// Map our internal symbols to TradingView exchange:symbol format
function toTVSymbol(symbol: string, assetType?: string): string {
  const type = assetType?.toLowerCase() ?? "";

  // Crypto
  const cryptoMap: Record<string, string> = {
    BTCUSD: "BINANCE:BTCUSDT", ETHUSD: "BINANCE:ETHUSDT", BNBUSD: "BINANCE:BNBUSDT",
    XRPUSD: "BINANCE:XRPUSDT", ADAUSD: "BINANCE:ADAUSDT", SOLUSD: "BINANCE:SOLUSDT",
    DOTUSD: "BINANCE:DOTUSDT", DOGEUSD: "BINANCE:DOGEUSDT", MATICUSD: "BINANCE:MATICUSDT",
    LTCUSD: "BINANCE:LTCUSDT", LINKUSD: "BINANCE:LINKUSDT", AVAXUSD: "BINANCE:AVAXUSDT",
    UNIUSD: "BINANCE:UNIUSDT", ATOMUSD: "BINANCE:ATOMUSDT", TRXUSD: "BINANCE:TRXUSDT",
    XLMUSD: "BINANCE:XLMUSDT", ALGOUSD: "BINANCE:ALGOUSDT", VETUSD: "BINANCE:VETUSDT",
    FILUSD: "BINANCE:FILUSDT", ICPUSD: "BINANCE:ICPUSDT", SHIBUSDT: "BINANCE:SHIBUSDT",
  };
  if (cryptoMap[symbol]) return cryptoMap[symbol];

  // Forex
  const forexMap: Record<string, string> = {
    EURUSD: "FX:EURUSD", GBPUSD: "FX:GBPUSD", USDJPY: "FX:USDJPY", USDCHF: "FX:USDCHF",
    AUDUSD: "FX:AUDUSD", USDCAD: "FX:USDCAD", NZDUSD: "FX:NZDUSD", EURGBP: "FX:EURGBP",
    EURJPY: "FX:EURJPY", GBPJPY: "FX:GBPJPY", EURCHF: "FX:EURCHF", AUDJPY: "FX:AUDJPY",
    EURAUD: "FX:EURAUD", GBPAUD: "FX:GBPAUD", CADJPY: "FX:CADJPY",
  };
  if (forexMap[symbol]) return forexMap[symbol];

  // Commodities
  const commodityMap: Record<string, string> = {
    XAUUSD: "TVC:GOLD", GOLD: "TVC:GOLD", XAGUSD: "TVC:SILVER", SILVER: "TVC:SILVER",
    OIL: "TVC:USOIL", USOIL: "TVC:USOIL", UKOIL: "TVC:UKOIL", NATGAS: "TVC:NATGASUSD",
    COPPER: "TVC:COPPER", PLATINUM: "TVC:PLATINUM", PALLADIUM: "TVC:PALLADIUM",
  };
  if (commodityMap[symbol]) return commodityMap[symbol];

  // Indices
  const indexMap: Record<string, string> = {
    SPX500: "SP:SPX", SP500: "SP:SPX", US500: "SP:SPX", NDX: "NASDAQ:NDX",
    US100: "NASDAQ:NDX", DJI: "DJ:DJI", US30: "DJ:DJI", DAX: "XETR:DAX",
    FTSE100: "LSE:UKX", NIKKEI: "TVC:NI225", HANGSENG: "HSI:HSI",
  };
  if (indexMap[symbol]) return indexMap[symbol];

  // Stocks (fallback)
  if (type === "stock" || type === "etf") return `NASDAQ:${symbol}`;

  // Default: try NASDAQ prefix
  return `NASDAQ:${symbol}`;
}

// Map our timeframes to TradingView interval values
function toTVInterval(timeframe: Timeframe): string {
  const map: Record<Timeframe, string> = {
    "1m": "1", "5m": "5", "15m": "15", "30m": "30",
    "1h": "60", "4h": "240", "1D": "D", "1W": "W", "1M": "M",
  };
  return map[timeframe] ?? "60";
}

interface Props {
  symbol?: string;
  timeframe?: Timeframe;
  assetType?: string;
  height?: string | number;
}

export function TradingViewWidget({ symbol, timeframe, assetType, height = "100%" }: Props) {
  const store = useTradingStore();
  const resolvedSymbol = symbol ?? store.selectedAsset?.symbol ?? "BTCUSD";
  const resolvedType = assetType ?? store.selectedAsset?.type;
  const resolvedTimeframe = timeframe ?? store.timeframe;
  const theme = store.theme;

  const containerId = useId().replace(/:/g, "");
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const tvSymbol = toTVSymbol(resolvedSymbol, resolvedType);
    const interval = toTVInterval(resolvedTimeframe);
    const isDark = theme === "dark";

    // Remove previous widget
    if (widgetRef.current) {
      try { widgetRef.current.remove?.(); } catch { /* ignore */ }
      widgetRef.current = null;
    }
    containerRef.current.innerHTML = "";

    const createWidget = () => {
      if (!containerRef.current) return;
      containerRef.current.innerHTML = "";

      const widgetDiv = document.createElement("div");
      widgetDiv.id = `tv_widget_${containerId}`;
      containerRef.current.appendChild(widgetDiv);

      const w = window as any;
      if (!w.TradingView) return;

      widgetRef.current = new w.TradingView.widget({
        autosize: true,
        symbol: tvSymbol,
        interval,
        timezone: "Etc/UTC",
        theme: isDark ? "dark" : "light",
        style: "1",
        locale: "en",
        toolbar_bg: isDark ? "#131722" : "#f1f3fa",
        enable_publishing: false,
        allow_symbol_change: false,
        container_id: `tv_widget_${containerId}`,
        hide_side_toolbar: false,
        withdateranges: true,
        hide_top_toolbar: false,
        save_image: false,
        studies: [],
        show_popup_button: false,
        popup_width: "1000",
        popup_height: "650",
        no_referral_id: true,
        calendar: false,
        hide_legend: false,
        backgroundColor: isDark ? "rgba(19, 23, 34, 1)" : "rgba(255, 255, 255, 1)",
        gridColor: isDark ? "rgba(54, 58, 69, 0.5)" : "rgba(0, 0, 0, 0.06)",
      });
    };

    const w = window as any;
    if (w.TradingView) {
      createWidget();
    } else {
      // Load script if not already loaded
      const existing = document.querySelector('script[src="https://s3.tradingview.com/tv.js"]');
      if (existing) {
        // Script is loading — wait for it
        existing.addEventListener("load", createWidget);
      } else {
        const script = document.createElement("script");
        script.src = "https://s3.tradingview.com/tv.js";
        script.async = true;
        script.onload = createWidget;
        document.head.appendChild(script);
      }
    }

    return () => {
      if (widgetRef.current) {
        try { widgetRef.current.remove?.(); } catch { /* ignore */ }
        widgetRef.current = null;
      }
    };
  }, [resolvedSymbol, resolvedTimeframe, theme, resolvedType, containerId]);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container w-full"
      style={{ height }}
    />
  );
}

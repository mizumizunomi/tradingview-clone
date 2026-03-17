"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useTradingStore } from "@/store/trading.store";
import { TopToolbar } from "@/components/layout/TopToolbar";
import { SideNav } from "@/components/layout/SideNav";
import { SymbolInfoBar } from "@/components/layout/SymbolInfoBar";
import { DrawingToolbar } from "@/components/chart/DrawingToolbar";
import { IndicatorsModal } from "@/components/chart/IndicatorsModal";
import { MultiChartLayout } from "@/components/chart/MultiChartLayout";
import { DrawingPropertiesBar } from "@/components/chart/DrawingPropertiesBar";
import { ChartSettingsModal } from "@/components/chart/ChartSettingsModal";
import { OrderPanel } from "@/components/trading/OrderPanel";
import { PositionsPanel } from "@/components/trading/PositionsPanel";
import { Watchlist } from "@/components/trading/Watchlist";
import { DOMPanel } from "@/components/trading/DOMPanel";
import { AlertModal } from "@/components/alerts/AlertModal";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { KeyboardShortcutsModal } from "@/components/ui/KeyboardShortcutsModal";
import { useWebSocket } from "@/hooks/useWebSocket";
import { ConnectionStatus } from "@/components/layout/ConnectionStatus";
import { useAlertChecker } from "@/hooks/useAlertChecker";
import { useChartKeyboardShortcuts } from "@/hooks/useChartKeyboardShortcuts";
import { usePlan } from "@/hooks/usePlan";
import { api, endpoints } from "@/lib/api";

const PRICES_POLL_MS = 60_000;

export default function TradePage() {
  const router = useRouter();
  const {
    token, setUser, setWallet, setPositions, setAssets, setSelectedAsset,
    showAlertModal, showChartSettings, showDOMPanel, updatePrice,
  } = useTradingStore();
  const pricesPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { isNoPlan } = usePlan();

  const { connected } = useWebSocket();
  useAlertChecker();
  useChartKeyboardShortcuts();

  // REST fallback for prices (works when WebSocket is slow or fails, e.g. production)
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const fetchPrices = async () => {
      try {
        const res = await api.get(endpoints.prices);
        const list = Array.isArray(res.data) ? res.data : [];
        list.forEach((p: { symbol: string; price: number; bid: number; ask: number; change: number; changePercent: number; timestamp: number }) => {
          if (!cancelled) updatePrice(p);
        });
      } catch {
        // ignore
      }
    };
    fetchPrices();
    pricesPollRef.current = setInterval(fetchPrices, PRICES_POLL_MS);
    return () => {
      cancelled = true;
      if (pricesPollRef.current) clearInterval(pricesPollRef.current);
    };
  }, [token, updatePrice]);

  useEffect(() => {
    if (!token) { router.replace("/auth/login"); return; }
    const init = async () => {
      try {
        const [meRes, walletRes, posRes, closedRes, assetsRes] = await Promise.all([
          api.get(endpoints.me),
          api.get(endpoints.wallet),
          api.get(endpoints.positions),
          api.get(endpoints.closedPositions),
          api.get(endpoints.assets),
        ]);
        setUser(meRes.data);
        setWallet(walletRes.data);
        setPositions([
          ...posRes.data.map((p: any) => ({ ...p, symbol: p.asset.symbol, assetName: p.asset.name })),
          ...closedRes.data.map((p: any) => ({ ...p, symbol: p.asset.symbol, assetName: p.asset.name })),
        ]);
        setAssets(assetsRes.data);
        const assets = assetsRes.data as { symbol: string; [k: string]: unknown }[];
        const btc = assets.find((a) => a.symbol === "BTCUSD");
        const first = assets[0];
        if (btc) setSelectedAsset(btc as any);
        else if (first) setSelectedAsset(first as any);
      } catch { router.replace("/auth/login"); }
    };
    init();
  }, [token]);

  return (
    <div className="flex h-screen flex-col overflow-hidden" style={{ background: "var(--tv-bg)" }}>
      <TopToolbar />
      {isNoPlan && (
        <div className="w-full flex items-center justify-between gap-3 px-4 py-2 text-sm font-medium sticky top-0 z-50" style={{ background: "#1a2740", borderBottom: "1px solid #2962ff44" }}>
          <span className="text-[#93c5fd]">
            Fund your account to start trading — deposit <span className="font-bold text-white">$250</span> to activate your Default plan
          </span>
          <Link
            href="/wallet"
            className="shrink-0 rounded-lg px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:opacity-90"
            style={{ background: "#2962ff" }}
          >
            Deposit Now
          </Link>
        </div>
      )}
      <SymbolInfoBar />
      <ConnectionStatus connected={connected} />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <Watchlist />
        <DrawingToolbar />
        <PanelGroup direction="vertical" className="flex-1">
          <Panel defaultSize={70} minSize={40}>
            <div className="flex h-full overflow-hidden">
              <div className="flex-1 overflow-hidden relative">
                <MultiChartLayout />
                <DrawingPropertiesBar />
              </div>
              <OrderPanel />
              {showDOMPanel && <DOMPanel />}
            </div>
          </Panel>
          <PanelResizeHandle className="h-[3px] hover:bg-[#2962ff] transition-colors cursor-row-resize" style={{ background: "var(--tv-border)" }} />
          <Panel defaultSize={30} minSize={15} maxSize={50}>
            <PositionsPanel />
          </Panel>
        </PanelGroup>
      </div>

      {/* Modals */}
      <IndicatorsModal />
      {showAlertModal && <AlertModal />}
      {showChartSettings && <ChartSettingsModal />}

      {/* Global toast notifications */}
      <ToastContainer />
      <KeyboardShortcutsModal />
    </div>
  );
}

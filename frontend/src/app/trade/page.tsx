"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { useAlertChecker } from "@/hooks/useAlertChecker";
import { useChartKeyboardShortcuts } from "@/hooks/useChartKeyboardShortcuts";
import { api, endpoints } from "@/lib/api";

export default function TradePage() {
  const router = useRouter();
  const {
    token, setUser, setWallet, setPositions, setAssets, setSelectedAsset,
    showAlertModal, showChartSettings, showDOMPanel,
  } = useTradingStore();

  useWebSocket();
  useAlertChecker();
  useChartKeyboardShortcuts();

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
        const btc = assetsRes.data.find((a: any) => a.symbol === "BTCUSD");
        if (btc) setSelectedAsset(btc);
      } catch { router.replace("/auth/login"); }
    };
    init();
  }, [token]);

  return (
    <div className="flex h-screen flex-col overflow-hidden" style={{ background: "var(--tv-bg)" }}>
      <TopToolbar />
      <SymbolInfoBar />
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

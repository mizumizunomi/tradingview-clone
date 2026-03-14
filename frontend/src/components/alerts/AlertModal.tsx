"use client";
import { useState } from "react";
import { X, Bell } from "lucide-react";
import { useTradingStore } from "@/store/trading.store";

export function AlertModal() {
  const {
    showAlertModal, setShowAlertModal, alerts, addAlert, removeAlert,
    alertModalSymbol, alertModalPrice, selectedAsset, prices,
  } = useTradingStore();

  const defaultSymbol = alertModalSymbol || selectedAsset?.symbol || "";
  const defaultPrice = alertModalPrice || (selectedAsset ? prices[selectedAsset.symbol]?.price : 0) || 0;

  const [symbol, setSymbol] = useState(defaultSymbol);
  const [price, setPrice] = useState(defaultPrice.toFixed(2));
  const [condition, setCondition] = useState<"above" | "below">("above");
  const [message, setMessage] = useState("");

  if (!showAlertModal) return null;

  const handleAdd = () => {
    if (!symbol || !price) return;
    addAlert({ symbol: symbol.toUpperCase(), price: parseFloat(price), condition, message });
    setPrice("");
    setMessage("");
  };

  const activeAlerts = alerts.filter((a) => !a.triggered);
  const triggeredAlerts = alerts.filter((a) => a.triggered);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAlertModal(false)} />
      <div className="relative w-[420px] rounded-xl shadow-2xl border overflow-hidden"
        style={{ background: "var(--tv-bg2)", borderColor: "var(--tv-border)" }}>
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "var(--tv-border)" }}>
          <Bell className="h-4 w-4 text-[#f59e0b]" />
          <span className="font-semibold text-sm" style={{ color: "var(--tv-text-light)" }}>Price Alerts</span>
          <div className="flex-1" />
          <button onClick={() => setShowAlertModal(false)} className="p-1 rounded hover:bg-[var(--tv-bg3)]">
            <X className="h-4 w-4" style={{ color: "var(--tv-muted)" }} />
          </button>
        </div>

        {/* Create alert form */}
        <div className="p-4 border-b space-y-3" style={{ borderColor: "var(--tv-border)" }}>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] mb-1 block" style={{ color: "var(--tv-muted)" }}>Symbol</label>
              <input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="BTCUSD"
                className="w-full rounded px-2 py-1.5 text-xs border outline-none"
                style={{ background: "var(--tv-bg3)", borderColor: "var(--tv-border)", color: "var(--tv-text-light)" }}
              />
            </div>
            <div>
              <label className="text-[11px] mb-1 block" style={{ color: "var(--tv-muted)" }}>Price</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded px-2 py-1.5 text-xs border outline-none font-mono"
                style={{ background: "var(--tv-bg3)", borderColor: "var(--tv-border)", color: "var(--tv-text-light)" }}
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] mb-1 block" style={{ color: "var(--tv-muted)" }}>Condition</label>
            <div className="flex gap-2">
              {(["above", "below"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCondition(c)}
                  className="flex-1 py-1.5 rounded text-xs font-medium border transition-colors capitalize"
                  style={{
                    borderColor: condition === c ? "#2962ff" : "var(--tv-border)",
                    background: condition === c ? "#2962ff20" : "var(--tv-bg3)",
                    color: condition === c ? "#4d7cff" : "var(--tv-text)",
                  }}
                >
                  Crosses {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] mb-1 block" style={{ color: "var(--tv-muted)" }}>Note (optional)</label>
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a note..."
              className="w-full rounded px-2 py-1.5 text-xs border outline-none"
              style={{ background: "var(--tv-bg3)", borderColor: "var(--tv-border)", color: "var(--tv-text-light)" }}
            />
          </div>
          <button
            onClick={handleAdd}
            className="w-full py-2 rounded-lg text-xs font-semibold bg-[#2962ff] text-white hover:bg-[#1e4dd8] transition-colors"
          >
            Set Alert
          </button>
        </div>

        {/* Active alerts */}
        <div className="max-h-[240px] overflow-y-auto">
          {activeAlerts.length === 0 && triggeredAlerts.length === 0 ? (
            <div className="py-6 text-center text-xs" style={{ color: "var(--tv-muted)" }}>No alerts set</div>
          ) : (
            <div>
              {activeAlerts.length > 0 && (
                <>
                  <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--tv-muted)" }}>Active</div>
                  {activeAlerts.map((a) => (
                    <div key={a.id} className="flex items-center gap-2 px-4 py-2 border-b hover:bg-[var(--tv-bg3)] group"
                      style={{ borderColor: "var(--tv-border)" }}>
                      <Bell className="h-3.5 w-3.5 text-[#f59e0b] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium" style={{ color: "var(--tv-text-light)" }}>{a.symbol}</span>
                        <span className="text-xs mx-1" style={{ color: "var(--tv-muted)" }}>{a.condition}</span>
                        <span className="text-xs font-mono" style={{ color: "var(--tv-text-light)" }}>{a.price.toFixed(2)}</span>
                        {a.message && <div className="text-[10px] truncate" style={{ color: "var(--tv-muted)" }}>{a.message}</div>}
                      </div>
                      <button onClick={() => removeAlert(a.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-[#ef5350]">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </>
              )}
              {triggeredAlerts.length > 0 && (
                <>
                  <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--tv-muted)" }}>Triggered</div>
                  {triggeredAlerts.map((a) => (
                    <div key={a.id} className="flex items-center gap-2 px-4 py-2 opacity-50 hover:bg-[var(--tv-bg3)] group"
                      style={{ borderColor: "var(--tv-border)" }}>
                      <Bell className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--tv-muted)" }} />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium line-through" style={{ color: "var(--tv-text)" }}>{a.symbol} {a.condition} {a.price.toFixed(2)}</span>
                      </div>
                      <button onClick={() => removeAlert(a.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

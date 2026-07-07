"use client";
import { useRouter } from "next/navigation";
import { SideNav } from "@/components/layout/SideNav";
import { BarChart2, Zap, Shield, Globe, Code2, Server, Cpu, ExternalLink } from "lucide-react";

const TECH_STACK = [
  { icon: Code2, name: "Next.js 15", desc: "App Router, React Server Components", color: "#ffffff" },
  { icon: Cpu, name: "Advanced Charts", desc: "Lightweight Charts v5 for candlesticks", color: "#2962ff" },
  { icon: Zap, name: "Socket.IO", desc: "Real-time WebSocket price streaming", color: "#f59e0b" },
  { icon: Server, name: "NestJS", desc: "Backend framework with TypeScript", color: "#f6465d" },
  { icon: Shield, name: "Prisma ORM", desc: "Type-safe PostgreSQL database layer", color: "#2ebd85" },
  { icon: Globe, name: "Binance API", desc: "Live crypto market data feed", color: "#f59e0b" },
];

const FEATURES = [
  { title: "Real-Time Charts", desc: "Professional candlestick charts with live price updates streamed via WebSocket." },
  { title: "124+ Assets", desc: "Trade across Crypto, Forex, Stocks, Indices, Commodities and ETFs. Bitcoin, EUR/USD, AAPL, Gold, S&P 500 and more." },
  { title: "Simulated Trading", desc: "Full paper trading engine — place Market and Limit orders, set Stop Loss and Take Profit levels, use up to 100× leverage." },
  { title: "Live P&L Tracking", desc: "Real-time unrealized profit & loss, margin calculations, equity updates, and full trade history with commission tracking." },
  { title: "Auto SL/TP", desc: "Backend monitors all open positions every 3 seconds and automatically closes them when Stop Loss or Take Profit is triggered." },
  { title: "Wallet System", desc: "Simulate deposits and withdrawals via Wire Transfer, Debit Card, or Crypto. Full transaction history included." },
];

export default function AboutPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0b0d]">
      <SideNav />
      <div className="flex-1 overflow-y-auto">
        {/* Hero */}
        <div className="border-b border-[#23262f] bg-[#111318] px-8 py-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="mb-4 flex items-center justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2962ff] shadow-xl shadow-[#2962ff44]">
                <BarChart2 className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">NovaTrade</h1>
            <p className="text-sm text-[#5d6673] max-w-xl mx-auto leading-relaxed">
              A professional trading platform with real market data, a full trading engine, and complete order management.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <span className="flex items-center gap-1.5 rounded-full bg-[#2ebd8520] border border-[#2ebd8540] px-3 py-1 text-xs font-medium text-[#2ebd85]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#2ebd85] animate-pulse" />
                Live
              </span>
              <span className="text-xs text-[#5d6673]">Locally hosted · No external accounts required</span>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-8 py-8 space-y-10">
          {/* Features */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#5d6673] mb-5">Platform Features</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title} className="rounded-xl border border-[#23262f] bg-[#111318] p-4 hover:border-[#2f333d] transition-colors">
                  <div className="mb-1.5 text-sm font-bold text-white">{f.title}</div>
                  <div className="text-xs text-[#5d6673] leading-relaxed">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tech Stack */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#5d6673] mb-5">Tech Stack</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {TECH_STACK.map(({ icon: Icon, name, desc, color }) => (
                <div key={name} className="flex items-start gap-3 rounded-xl border border-[#23262f] bg-[#111318] p-3.5 hover:border-[#2f333d] transition-colors">
                  <div className="mt-0.5 rounded-lg p-1.5" style={{ background: `${color}18` }}>
                    <Icon className="h-4 w-4" style={{ color }} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{name}</div>
                    <div className="text-[11px] text-[#5d6673] mt-0.5">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Architecture diagram (text-based) */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#5d6673] mb-5">Architecture</h2>
            <div className="rounded-xl border border-[#23262f] bg-[#111318] p-5">
              <div className="flex flex-col md:flex-row items-center gap-4 text-xs text-center">
                {[
                  { label: "Binance WS", sub: "Live crypto prices", color: "#f59e0b" },
                  { label: "→", sub: "", color: "#23262f" },
                  { label: "NestJS Backend", sub: "Port 3001", color: "#f6465d" },
                  { label: "⇌", sub: "Socket.IO + REST", color: "#23262f" },
                  { label: "Next.js Frontend", sub: "Port 3000", color: "#2962ff" },
                  { label: "→", sub: "", color: "#23262f" },
                  { label: "PostgreSQL", sub: "Local DB", color: "#2ebd85" },
                ].map((item, i) => (
                  item.label === "→" || item.label === "⇌" ? (
                    <div key={i} className="text-lg font-bold" style={{ color: item.color }}>{item.label}</div>
                  ) : (
                    <div key={i} className="rounded-xl border px-4 py-3 flex-1" style={{ borderColor: item.color + "40", background: item.color + "10" }}>
                      <div className="font-bold" style={{ color: item.color }}>{item.label}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: item.color + "99" }}>{item.sub}</div>
                    </div>
                  )
                ))}
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="rounded-xl border border-[#23262f] bg-[#111318] p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#5d6673] mb-2">Disclaimer</div>
            <p className="text-xs text-[#5d6673] leading-relaxed">
              All trading on this platform uses virtual funds. No real money is involved, and no real trades are executed.
              Market data is sourced from public APIs (Binance) and mocked where unavailable.
              This is not financial advice.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

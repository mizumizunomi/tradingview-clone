"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTradingStore } from "@/store/trading.store";
import { api, endpoints } from "@/lib/api";
import {
  BarChart3, TrendingUp, Zap, ShieldCheck, LineChart, Layers,
  ArrowRight, Bot, Wallet, Globe,
} from "lucide-react";

interface Ticker {
  symbol: string;
  price: number;
  changePercent: number;
}

const HERO_SYMBOLS = ["BTCUSD", "ETHUSD", "SOLUSD", "AAPL", "TSLA", "EURUSD", "XAUUSD", "NVDA"];
const DISPLAY: Record<string, string> = {
  BTCUSD: "BTC", ETHUSD: "ETH", SOLUSD: "SOL", AAPL: "AAPL",
  TSLA: "TSLA", EURUSD: "EUR/USD", XAUUSD: "GOLD", NVDA: "NVDA",
};

function fmt(n: number) {
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

export default function Home() {
  const router = useRouter();
  const token = useTradingStore((s) => s.token);
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (token) {
      setRedirecting(true);
      router.replace("/trade");
    }
  }, [token, router]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await api.get(endpoints.prices);
        if (cancelled || !Array.isArray(res.data)) return;
        const bySym: Record<string, Ticker> = {};
        res.data.forEach((p: Ticker) => { bySym[p.symbol] = p; });
        setTickers(HERO_SYMBOLS.map((s) => bySym[s]).filter(Boolean));
      } catch { /* ignore — landing still renders */ }
    };
    load();
    const id = setInterval(load, 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  if (redirecting) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "var(--tv-bg)" }}>
        <div className="text-sm" style={{ color: "var(--tv-muted)" }}>Loading terminal…</div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto route-fade" style={{ background: "var(--tv-bg)", color: "var(--tv-text-light)" }}>
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(600px circle at 50% -10%, rgba(41,98,255,0.10), transparent 60%)," +
            "radial-gradient(800px circle at 90% 20%, rgba(124,92,255,0.06), transparent 55%)",
        }}
      />

      {/* Nav */}
      <header className="relative z-10 flex items-center justify-between max-w-7xl mx-auto px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "var(--tv-blue)" }}>
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">NovaTrade</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm" style={{ color: "var(--tv-text)" }}>
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#markets" className="hover:text-white transition-colors">Markets</a>
          <Link href="/plans" className="hover:text-white transition-colors">Pricing</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="text-sm px-4 py-2 rounded-lg transition-colors hover:bg-[var(--tv-bg3)]" style={{ color: "var(--tv-text-light)" }}>
            Log in
          </Link>
          <Link href="/auth/register" className="text-sm font-semibold px-4 py-2 rounded-lg text-white transition-all glow-blue" style={{ background: "var(--tv-blue)" }}>
            Get started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-10 text-center">
        <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs mb-6 border" style={{ borderColor: "var(--tv-border2)", background: "var(--tv-bg2)", color: "var(--tv-text)" }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--tv-green)" }} />
          Live markets · Crypto · Forex · Stocks · Indices
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] max-w-3xl mx-auto">
          The trading terminal
          <br />
          <span style={{ background: "linear-gradient(120deg, #4d7cff, #7c5cff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            built for precision.
          </span>
        </h1>
        <p className="mt-6 text-base md:text-lg max-w-xl mx-auto" style={{ color: "var(--tv-text)" }}>
          Real-time charts, an AI signal engine, and a professional order panel.
          Trade 120+ instruments across every major market from one fast interface.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/auth/register" className="flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-xl text-white transition-all glow-blue" style={{ background: "var(--tv-blue)" }}>
            Start trading free <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/auth/login" className="text-sm font-semibold px-6 py-3 rounded-xl border transition-colors hover:bg-[var(--tv-bg3)]" style={{ borderColor: "var(--tv-border2)", color: "var(--tv-text-light)" }}>
            Open terminal
          </Link>
        </div>

        {/* Live ticker strip */}
        <div className="mt-12 rounded-2xl border overflow-hidden" style={{ borderColor: "var(--tv-border)", background: "var(--tv-bg2)" }}>
          <div className="grid grid-cols-2 md:grid-cols-4">
            {(tickers.length ? tickers : HERO_SYMBOLS.map((s) => ({ symbol: s, price: 0, changePercent: 0 }))).map((t) => {
              const up = t.changePercent >= 0;
              return (
                <div key={t.symbol} className="flex items-center justify-between px-5 py-4 border-b border-r" style={{ borderColor: "var(--tv-border)" }}>
                  <span className="text-sm font-semibold" style={{ color: "var(--tv-text-light)" }}>{DISPLAY[t.symbol] ?? t.symbol}</span>
                  <div className="text-right">
                    <div className="text-sm font-mono" style={{ color: "var(--tv-text-light)" }}>
                      {t.price ? fmt(t.price) : "—"}
                    </div>
                    <div className="text-xs font-mono" style={{ color: up ? "var(--tv-green)" : "var(--tv-red)" }}>
                      {t.price ? `${up ? "+" : ""}${t.changePercent.toFixed(2)}%` : ""}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { v: "120+", l: "Instruments" },
            { v: "6", l: "Asset classes" },
            { v: "<50ms", l: "Order latency" },
            { v: "24/7", l: "Crypto markets" },
          ].map((s) => (
            <div key={s.l}>
              <div className="text-3xl font-bold" style={{ color: "var(--tv-text-light)" }}>{s.v}</div>
              <div className="text-xs mt-1" style={{ color: "var(--tv-muted)" }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight">Everything a serious trader needs</h2>
          <p className="mt-3 text-sm" style={{ color: "var(--tv-text)" }}>Professional tooling, no compromises.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { icon: LineChart, title: "Pro charting", desc: "Candlesticks, drawing tools, indicators, multi-chart layouts and replay mode." },
            { icon: Bot, title: "AI signal engine", desc: "Technical + fundamental analysis across providers, with auto-trade and risk guards." },
            { icon: Zap, title: "Fast order panel", desc: "Market and limit orders, leverage, stop-loss and take-profit in one click." },
            { icon: Layers, title: "Positions & margin", desc: "Live P&L, margin tracking, and a full equity curve on your portfolio." },
            { icon: ShieldCheck, title: "Secure by design", desc: "JWT auth, rate limiting, KYC, and audited admin controls." },
            { icon: Globe, title: "Every market", desc: "Crypto, forex, stocks, indices, commodities and funds in one terminal." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border p-6 transition-colors hover:border-[var(--tv-border2)]" style={{ borderColor: "var(--tv-border)", background: "var(--tv-bg2)" }}>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg mb-4" style={{ background: "rgba(41,98,255,0.12)" }}>
                <f.icon className="h-5 w-5" style={{ color: "var(--tv-blue-glow)" }} />
              </div>
              <h3 className="text-base font-semibold mb-1.5">{f.title}</h3>
              <p className="text-sm" style={{ color: "var(--tv-text)" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Markets */}
      <section id="markets" className="relative z-10 max-w-7xl mx-auto px-6 py-10">
        <div className="rounded-2xl border p-8 md:p-12 text-center" style={{ borderColor: "var(--tv-border)", background: "linear-gradient(180deg, var(--tv-bg2), var(--tv-bg))" }}>
          <TrendingUp className="h-8 w-8 mx-auto mb-4" style={{ color: "var(--tv-blue-glow)" }} />
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Real prices. Real markets.</h2>
          <p className="mt-3 text-sm max-w-xl mx-auto" style={{ color: "var(--tv-text)" }}>
            Live crypto from Binance, plus stocks, forex, indices and commodities — updated continuously,
            with charts that match to the tick.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {["Bitcoin", "Ethereum", "Solana", "Apple", "Tesla", "NVIDIA", "EUR/USD", "Gold", "S&P 500", "Nasdaq"].map((m) => (
              <span key={m} className="text-xs px-3 py-1.5 rounded-full border" style={{ borderColor: "var(--tv-border2)", background: "var(--tv-bg3)", color: "var(--tv-text)" }}>{m}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 py-20 text-center">
        <Wallet className="h-8 w-8 mx-auto mb-4" style={{ color: "var(--tv-blue-glow)" }} />
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Start with a funded demo account.</h2>
        <p className="mt-4 text-sm" style={{ color: "var(--tv-text)" }}>
          Create an account, activate a tier, and trade live markets risk-free.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/auth/register" className="flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-xl text-white transition-all glow-blue" style={{ background: "var(--tv-blue)" }}>
            Create free account <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/plans" className="text-sm font-semibold px-6 py-3 rounded-xl border transition-colors hover:bg-[var(--tv-bg3)]" style={{ borderColor: "var(--tv-border2)", color: "var(--tv-text-light)" }}>
            View pricing
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t" style={{ borderColor: "var(--tv-border)" }}>
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded" style={{ background: "var(--tv-blue)" }}>
              <BarChart3 className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold">NovaTrade</span>
          </div>
          <p className="text-xs" style={{ color: "var(--tv-muted)" }}>
            Demo trading platform. Not financial advice.
          </p>
        </div>
      </footer>
    </div>
  );
}

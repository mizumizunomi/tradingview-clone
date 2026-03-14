"use client";
import { SideNav } from "@/components/layout/SideNav";
import { Check, Zap, Shield, Crown, Star, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTradingStore } from "@/store/trading.store";
import { api, endpoints } from "@/lib/api";

const PLANS = [
  {
    id: "silver",
    name: "Silver",
    tagline: "Perfect for beginners",
    icon: Shield,
    color: "#94a3b8",
    bgGlow: "#94a3b822",
    minDeposit: 500,
    maxLeverage: 10,
    spread: "Standard",
    commission: "0.1%",
    price: "Free",
    features: [
      "Up to $500 simulated balance",
      "10× max leverage",
      "20 tradeable assets",
      "Standard spreads",
      "Basic charting tools",
      "Email support",
      "Market orders only",
      "Daily news digest",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    id: "gold",
    name: "Gold",
    tagline: "Most popular choice",
    icon: Star,
    color: "#f59e0b",
    bgGlow: "#f59e0b22",
    minDeposit: 5000,
    maxLeverage: 50,
    spread: "Tight",
    commission: "0.05%",
    price: "$29/mo",
    features: [
      "Up to $50,000 simulated balance",
      "50× max leverage",
      "80+ tradeable assets",
      "Tight spreads",
      "Advanced charting & indicators",
      "Priority support",
      "All order types (Market, Limit, SL/TP)",
      "Real-time news feed",
      "Portfolio analytics",
      "API access",
    ],
    cta: "Upgrade to Gold",
    popular: true,
  },
  {
    id: "platinum",
    name: "Platinum",
    tagline: "For serious traders",
    icon: Crown,
    color: "#a78bfa",
    bgGlow: "#a78bfa22",
    minDeposit: 25000,
    maxLeverage: 100,
    spread: "Raw",
    commission: "0.01%",
    price: "$99/mo",
    features: [
      "Unlimited simulated balance",
      "100× max leverage",
      "200+ tradeable assets",
      "Raw institutional spreads",
      "Professional charting suite",
      "Dedicated account manager",
      "All order types + OCO orders",
      "Premium news & analysis",
      "Advanced risk management",
      "Custom API integrations",
      "White-glove onboarding",
      "Exclusive trading signals",
    ],
    cta: "Go Platinum",
    popular: false,
  },
];

const COMPARISON_ROWS = [
  { feature: "Simulated Balance", silver: "$500", gold: "$50,000", platinum: "Unlimited" },
  { feature: "Max Leverage", silver: "10×", gold: "50×", platinum: "100×" },
  { feature: "Assets Available", silver: "20", gold: "80+", platinum: "200+" },
  { feature: "Spread Type", silver: "Standard", gold: "Tight", platinum: "Raw" },
  { feature: "Commission", silver: "0.1%", gold: "0.05%", platinum: "0.01%" },
  { feature: "Order Types", silver: "Market", gold: "All types", platinum: "All + OCO" },
  { feature: "API Access", silver: "✗", gold: "✓", platinum: "✓" },
  { feature: "Support", silver: "Email", gold: "Priority", platinum: "Dedicated" },
  { feature: "News Feed", silver: "Daily digest", gold: "Real-time", platinum: "Premium" },
];

export default function PlansPage() {
  const { user, setUser, addToast } = useTradingStore();
  const activePlan = user?.plan || "silver";

  const handleUpgrade = async (planId: string) => {
    if (planId === activePlan) return;
    try {
      await api.patch(endpoints.updatePlan, { plan: planId });
      if (user) {
        setUser({ ...user, plan: planId as "silver" | "gold" | "platinum" });
      }
      const plan = PLANS.find((p) => p.id === planId);
      addToast({ type: "success", message: `Upgraded to ${plan?.name || planId} plan!` });
    } catch {
      addToast({ type: "error", message: "Failed to update plan. Please try again." });
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#131722]">
      <SideNav />
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="border-b border-[#363a45] bg-[#1e222d] px-8 py-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-5 w-5 text-[#f59e0b]" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[#f59e0b]">Investment Plans</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Choose Your Trading Tier</h1>
            <p className="text-sm text-[#5d6673]">
              Unlock more power, tighter spreads, and higher leverage as you grow your account.
            </p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-8 py-8 space-y-10">
          {/* Plan cards */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {PLANS.map((plan) => {
              const Icon = plan.icon;
              const isActive = activePlan === plan.id;
              return (
                <div
                  key={plan.id}
                  className={cn(
                    "relative rounded-2xl border p-5 transition-all cursor-pointer",
                    plan.popular
                      ? "border-[#f59e0b] bg-[#1e222d]"
                      : "border-[#363a45] bg-[#1e222d] hover:border-[#434651]",
                    isActive && "ring-2 ring-[#2962ff] ring-offset-2 ring-offset-[#131722]"
                  )}
                  style={{ boxShadow: plan.popular ? `0 0 40px ${plan.bgGlow}` : undefined }}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#f59e0b] px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#131722]">
                      Most Popular
                    </div>
                  )}

                  {/* Current plan badge */}
                  {isActive && (
                    <div className="absolute top-3 right-3 rounded-full bg-[#2962ff] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      Current Plan
                    </div>
                  )}

                  {/* Plan header */}
                  <div className="mb-4">
                    <div
                      className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{ background: plan.bgGlow }}
                    >
                      <Icon className="h-5 w-5" style={{ color: plan.color }} />
                    </div>
                    <div className="text-lg font-bold" style={{ color: plan.color }}>{plan.name}</div>
                    <div className="text-xs text-[#5d6673]">{plan.tagline}</div>
                  </div>

                  {/* Price */}
                  <div className="mb-4 pb-4 border-b border-[#363a45]">
                    <div className="text-2xl font-bold text-white">{plan.price}</div>
                    <div className="text-xs text-[#5d6673]">
                      Min. deposit: <span className="text-[#b2b5be] font-medium">${plan.minDeposit.toLocaleString("en-US")}</span>
                    </div>
                  </div>

                  {/* Key stats */}
                  <div className="mb-4 grid grid-cols-2 gap-2">
                    {[
                      { label: "Leverage", value: `${plan.maxLeverage}×` },
                      { label: "Spread", value: plan.spread },
                      { label: "Commission", value: plan.commission },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-lg bg-[#131722] px-2.5 py-2">
                        <div className="text-[10px] text-[#5d6673]">{label}</div>
                        <div className="text-xs font-bold text-white">{value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Features */}
                  <ul className="mb-5 space-y-1.5">
                    {plan.features.slice(0, 6).map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-[#b2b5be]">
                        <Check className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: plan.color }} />
                        {f}
                      </li>
                    ))}
                    {plan.features.length > 6 && (
                      <li className="text-[11px] text-[#5d6673]">+{plan.features.length - 6} more features</li>
                    )}
                  </ul>

                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={isActive}
                    className={cn(
                      "flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider transition-all",
                      isActive && "opacity-50 cursor-not-allowed"
                    )}
                    style={{
                      background: isActive ? "#2962ff" : plan.popular ? plan.color : `${plan.color}20`,
                      color: isActive ? "white" : plan.popular ? "#000" : plan.color,
                    }}
                  >
                    {isActive ? "Current Plan" : plan.cta}
                    {!isActive && <ArrowRight className="h-3.5 w-3.5" />}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Comparison table */}
          <div>
            <h2 className="text-sm font-bold text-white mb-4">Full Feature Comparison</h2>
            <div className="rounded-xl border border-[#363a45] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#363a45] bg-[#1e222d]">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#5d6673]">Feature</th>
                    {PLANS.map((p) => (
                      <th key={p.id} className="px-4 py-3 text-center text-xs font-bold" style={{ color: p.color }}>
                        {p.name}
                        {activePlan === p.id && (
                          <span className="ml-1.5 rounded px-1 py-0.5 text-[8px] bg-[#2962ff] text-white">You</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e222d]">
                  {COMPARISON_ROWS.map((row) => (
                    <tr key={row.feature} className="hover:bg-[#1e222d] transition-colors">
                      <td className="px-4 py-2.5 text-xs text-[#b2b5be]">{row.feature}</td>
                      {["silver", "gold", "platinum"].map((tier) => (
                        <td key={tier} className="px-4 py-2.5 text-center text-xs">
                          {(row as any)[tier] === "✓" ? (
                            <Check className="h-3.5 w-3.5 text-[#26a69a] mx-auto" />
                          ) : (row as any)[tier] === "✗" ? (
                            <span className="text-[#5d6673]">—</span>
                          ) : (
                            <span className="font-medium text-[#d1d4dc]">{(row as any)[tier]}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Note */}
          <div className="rounded-xl border border-[#363a45] bg-[#1e222d] p-4 text-center">
            <p className="text-xs text-[#5d6673]">
              All plans use <span className="text-[#b2b5be] font-medium">simulated funds only</span> — no real money is involved.
              Plans are for demonstration purposes on this local platform.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

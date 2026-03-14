export type Plan = "silver" | "gold" | "platinum";

export const PLAN_CONFIG = {
  silver: {
    name: "Silver",
    color: "#94a3b8",
    maxLeverage: 10,
    maxAssets: 20,
    commission: 0.001,
    orderTypes: ["MARKET"] as const,
    balance: 500,
    spread: 1.5, // multiplier
  },
  gold: {
    name: "Gold",
    color: "#f59e0b",
    maxLeverage: 50,
    maxAssets: 80,
    commission: 0.0005,
    orderTypes: ["MARKET", "LIMIT"] as const,
    balance: 50000,
    spread: 1.0,
  },
  platinum: {
    name: "Platinum",
    color: "#a78bfa",
    maxLeverage: 100,
    maxAssets: 200,
    commission: 0.0001,
    orderTypes: ["MARKET", "LIMIT", "OCO"] as const,
    balance: 1000000,
    spread: 0.8,
  },
} as const;

export function getPlanConfig(plan?: string) {
  return PLAN_CONFIG[(plan as Plan) ?? "silver"] ?? PLAN_CONFIG.silver;
}

export function canUseLeverage(plan: string | undefined, leverage: number) {
  return leverage <= getPlanConfig(plan).maxLeverage;
}

export function canTradeAsset(plan: string | undefined, assetIndex: number) {
  return assetIndex < getPlanConfig(plan).maxAssets;
}

export function canUseOrderType(plan: string | undefined, type: string) {
  return (getPlanConfig(plan).orderTypes as readonly string[]).includes(type);
}

/**
 * Drift guard: fails (exit 1) if the admin domain mirror diverges from the backend canonical.
 *
 * The backend and admin duplicate tier thresholds and close-math because they are separate
 * apps. This script reads the backend's canonical TIER_CONFIG and its domain modules directly
 * from ../backend/src and asserts the admin mirror matches. Run it in CI / before deploy:
 *
 *   npx tsx scripts/check-domain-parity.ts
 *
 * If it fails, update admin/src/lib/domain/* to match backend/src/domain/* (or vice-versa).
 */
import { TIER_DEPOSIT_REQUIRED, determineTier as adminDetermineTier } from '../src/lib/domain/tier';
import { computeClosePnL as adminClosePnL, computeWalletCloseDeltas as adminDeltas } from '../src/lib/domain/pnl';

// Backend canonical sources (relative to this admin/ app).
import { TIER_CONFIG } from '../../backend/src/plan/constants/tier-config';
import { determineTier as beDetermineTier } from '../../backend/src/domain/tier';
import { computeClosePnL as beClosePnL, computeWalletCloseDeltas as beDeltas } from '../../backend/src/domain/pnl';

const failures: string[] = [];

// 1. Tier thresholds must equal backend TIER_CONFIG.depositRequired.
for (const tier of Object.keys(TIER_DEPOSIT_REQUIRED) as (keyof typeof TIER_DEPOSIT_REQUIRED)[]) {
  const canonical = TIER_CONFIG[tier].depositRequired;
  const mirror = TIER_DEPOSIT_REQUIRED[tier];
  if (canonical !== mirror) {
    failures.push(`Tier ${tier}: admin mirror=${mirror} but backend canonical=${canonical}`);
  }
}

// 2. determineTier must agree across a sweep of deposit amounts.
for (const amount of [0, 100, 249, 250, 2499, 2500, 9999, 10000, 49999, 50000, 123456]) {
  const a = adminDetermineTier(amount);
  const b = beDetermineTier(amount);
  if (a !== b) failures.push(`determineTier(${amount}): admin=${a} backend=${b}`);
}

// 3. Close P&L + wallet deltas must agree on a representative trade.
const sample = {
  side: 'BUY' as const,
  entryPrice: 82000,
  closePrice: 83000,
  quantity: 0.05,
  leverage: 2,
  openCommission: 4.1,
  assetCommissionRate: 0.001,
};
const aP = adminClosePnL(sample);
const bP = beClosePnL(sample);
if (aP.pnl !== bP.pnl || aP.closeCommission !== bP.closeCommission) {
  failures.push(`computeClosePnL: admin=${JSON.stringify(aP)} backend=${JSON.stringify(bP)}`);
}
const aD = adminDeltas(200, aP.pnl, aP.closeCommission);
const bD = beDeltas(200, bP.pnl, bP.closeCommission);
if (JSON.stringify(aD) !== JSON.stringify(bD)) {
  failures.push(`computeWalletCloseDeltas: admin=${JSON.stringify(aD)} backend=${JSON.stringify(bD)}`);
}

if (failures.length) {
  console.error('❌ Domain parity FAILED — admin mirror has drifted from backend canonical:\n');
  failures.forEach((f) => console.error('  - ' + f));
  console.error('\nFix: sync admin/src/lib/domain/* with backend/src/domain/*.');
  process.exit(1);
}

console.log('✅ Domain parity OK — admin mirror matches backend canonical (tiers + close math).');

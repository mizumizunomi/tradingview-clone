/**
 * Canonical tier logic — the SINGLE source of truth for "how much deposited → which tier".
 *
 * Both the backend (wallet.service) and the admin panel (deposit-confirm route) must agree
 * on this, or the same deposit yields a different tier depending on who processes it. The
 * thresholds are DERIVED from TIER_CONFIG.depositRequired so there is exactly one place that
 * defines each tier's entry amount.
 *
 * The admin app keeps a mirror of this file (admin/src/lib/domain/tier.ts); a guard test
 * (admin/src/lib/domain/__tests__ … verified via scripts) fails if the two ever drift.
 */
import { TIER_CONFIG, TierName } from '../plan/constants/tier-config';

// Ordered high → low so the first threshold met wins.
const TIER_ORDER: TierName[] = ['PLATINUM', 'GOLD', 'SILVER', 'DEFAULT'];

/** Resolve a tier from the user's lifetime total deposited, using canonical thresholds. */
export function determineTier(totalDeposited: number): TierName {
  for (const tier of TIER_ORDER) {
    if (totalDeposited >= TIER_CONFIG[tier].depositRequired) return tier;
  }
  return 'NONE';
}

/** Map a TierName to the lowercase User.plan string persisted on the user row. */
export function tierToPlanString(tier: TierName): string {
  return tier.toLowerCase();
}

/** The deposit amount that defines the entry point for a tier. */
export function getTierThreshold(tier: TierName): number {
  return TIER_CONFIG[tier].depositRequired;
}

/** The next tier up from the given one, or null if already at the top (PLATINUM). */
export function nextTierUp(tier: TierName): { tier: TierName; threshold: number } | null {
  // Ascending order including NONE at the bottom.
  const ascending: TierName[] = ['NONE', 'DEFAULT', 'SILVER', 'GOLD', 'PLATINUM'];
  const idx = ascending.indexOf(tier);
  if (idx < 0 || idx >= ascending.length - 1) return null;
  const next = ascending[idx + 1];
  return { tier: next, threshold: TIER_CONFIG[next].depositRequired };
}

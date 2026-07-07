/**
 * Admin-side MIRROR of the backend canonical close math (backend/src/domain/pnl.ts).
 *
 * Kept byte-for-byte equivalent to the backend so a position closed by an admin produces the
 * exact same realized P&L and wallet deltas as one closed by the user. Guarded against drift by
 * scripts/check-domain-parity.ts. See the backend module for the full money-model docs.
 */

export interface ClosePnLInput {
  side: 'BUY' | 'SELL';
  entryPrice: number;
  closePrice: number;
  quantity: number;
  leverage: number;
  openCommission: number;
  assetCommissionRate: number;
}

export interface ClosePnLResult {
  pnl: number;
  closeCommission: number;
}

export function computeClosePnL(input: ClosePnLInput): ClosePnLResult {
  const priceDiff =
    input.side === 'BUY'
      ? input.closePrice - input.entryPrice
      : input.entryPrice - input.closePrice;

  const pnl = priceDiff * input.quantity * input.leverage - input.openCommission;
  const closeCommission = input.closePrice * input.quantity * input.assetCommissionRate;

  return { pnl, closeCommission };
}

export interface WalletCloseDeltas {
  balanceDelta: number;
  freeMarginDelta: number;
  marginDelta: number;
}

export function computeWalletCloseDeltas(
  margin: number,
  pnl: number,
  closeCommission: number,
): WalletCloseDeltas {
  return {
    balanceDelta: pnl - closeCommission,
    freeMarginDelta: margin + pnl - closeCommission,
    marginDelta: -margin,
  };
}

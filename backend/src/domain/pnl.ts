/**
 * Canonical position-close math — the SINGLE source of truth for realized P&L and the
 * resulting wallet deltas when a position is closed.
 *
 * Before this module, the backend (trading.service.closePositionInternal) and the admin
 * panel (users/[id]/positions DELETE, trades/close) each had their own close formula and
 * they DISAGREED: the admin version omitted commission entirely and credited margin back
 * into `balance`, so closing the same position gave a different P&L and balance depending on
 * who closed it. This module encodes the backend's (authoritative) behavior once; the admin
 * mirror re-exports it so both sides compute identically.
 *
 * Money model (must match how placeOrder opens a position):
 *   On OPEN:  margin is reserved (freeMargin -= margin, margin += margin),
 *             and the OPEN commission is charged immediately (balance -= openCommission).
 *   On CLOSE: realized pnl = priceDiff * qty * leverage - openCommission,
 *             then a separate closeCommission is charged, and the reserved margin is released.
 *
 * NOTE (known pre-existing behavior, intentionally preserved, not silently "fixed"):
 * the open commission is subtracted a second time here inside `pnl` even though it was
 * already debited from balance at open time. Correcting that is a behavior change to the
 * money math and is tracked separately — this module deliberately mirrors current backend
 * behavior so the refactor is behavior-preserving.
 */

export interface ClosePnLInput {
  side: 'BUY' | 'SELL';
  entryPrice: number;
  closePrice: number;
  quantity: number;
  leverage: number;
  /** Commission recorded on the position at open time. */
  openCommission: number;
  /** Commission rate (fraction) on the asset, applied to close notional. */
  assetCommissionRate: number;
}

export interface ClosePnLResult {
  /** Realized P&L written to position.realizedPnL and the CLOSE trade row. */
  pnl: number;
  /** Commission charged on this close (closePrice * qty * rate). */
  closeCommission: number;
}

/** Compute realized P&L and close commission for a position being closed. */
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

/** Wallet increments/decrements to apply when releasing a closed position's margin. */
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

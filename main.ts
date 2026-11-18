// Dip-recovery hold bot — one trade, held to the end of the window.
//
// Written fresh for btc-race-24h-20261118-1444. The reasoning, in short:
//
// A full round trip on this pool costs roughly 26 bps once you add the 4 bps
// fee, the 2 bps modelled slippage and the price impact of a $1,000 order
// against the frozen depth. On one-minute bars almost every fast signal is
// noise: the kit's own baselines prove it — ema-cross loses about $106 over
// 68 trades on a dev window, adx-momentum about $33 over 26, rsi-bollinger
// about $24 over 11 — while buy-and-hold, a single trade, makes about $1.
// So this bot refuses to churn. It makes at most one buy and then sits on
// the position until the replay flattens it at the last close.
//
// When to buy: the first batch whose close is higher than the close 12 bars
// earlier. That is a dip that has just turned back up — the close has
// recovered from where it was a dozen minutes ago — rather than a blind
// momentum chase. If the window never shows that recovery, a fallback buy
// fires halfway through (batch 720) so the entry always takes at least one
// trade and always carries exposure into the second half of the window.
//
// What it never does: no exits, no stop-loss, no re-entry. A trailing stop
// was considered and rejected — on a 24-hour window it tends to sell the
// mid-window dip and miss the recovery, while the unprotected drawdown of a
// single hold stays far inside the 25% guardrail.
//
// Everything is deterministic: closes are compared as exact bigints, there is
// no clock read, no environment read, no randomness, and no state carried
// between runs except the closes seen in this run.

import { BPS, runBars, type BarsState, type BuyInput } from './vendor/makefun-bars.ts';

// How many bars back the recovery is measured against.
const RECOVERY_BARS = 12;
// Fallback entry if no recovery ever shows up.
const HALFWAY_BATCH = 720;
// Leave slippage wide open: refuse a fill only when the market itself does.
const MAX_SLIPPAGE_BPS = 10_000;

/** The one symbol in the universe, taken from hello. */
let symbol = 'CBBTC';
/** Closes of the bars seen so far, in order (one entry per batch). */
const closes: bigint[] = [];
/** True after a buy order was sent and before its fill is confirmed. */
let buyInFlight = false;

/**
 * Decide whether this batch should enter. True on the first recovery
 * (latest close above the close RECOVERY_BARS ago), or from the halfway
 * batch onward when no recovery has fired yet.
 */
function shouldEnter(batchSeq: number): boolean {
  const n = closes.length;
  if (n > RECOVERY_BARS && closes[n - 1] > closes[n - 1 - RECOVERY_BARS]) {
    return true;
  }
  return batchSeq >= HALFWAY_BATCH;
}

await runBars({
  onHello(state) {
    if (state.hello.symbols.length > 0) {
      symbol = state.hello.symbols[0].symbol;
    }
  },

  onBatch(state: BarsState, batch) {
    const close = state.close(symbol);
    if (close !== null) closes.push(close);

    // Warm-up bars are not scored: never order on them.
    if (state.warmingUp) return [];
    // Already holding: the job is done, hold to the end of the window.
    if (state.positions.size > 0) return [];

    // A buy sent on the previous batch either filled (then we would be
    // holding, handled above) or was refused: drop the flag so the entry
    // rule below can fire again and retry it.
    if (buyInFlight) buyInFlight = false;

    if (!shouldEnter(batch.seq)) return [];

    // Size the buy at the weight cap, bounded by the cash on hand.
    const cap = (BigInt(state.hello.caps.max_weight_bps) * state.equity) / BPS;
    const spend = state.cash < cap ? state.cash : cap;
    if (spend < BigInt(state.hello.fees.min_notional_quote_units)) return [];

    buyInFlight = true;
    const order: BuyInput = {
      side: 'buy',
      symbol,
      notional_quote_units: spend,
      max_slippage_bps: MAX_SLIPPAGE_BPS,
    };
    return [order];
  },
});

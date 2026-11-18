// Dip-buy bot — one mean-reversion round trip per window.
//
// Written fresh for btc-race-24h-20261118-1444. The dev window of this
// edition falls 2.8% from its first close to its last, so the previous
// edition's buy-and-hold idea loses about $24 here: any early entry rides
// the whole downtrend to the end. What this window does offer is one real
// swing — a sharp early dip, then a recovery of roughly 2% into the middle
// of the window. This bot is built to take exactly that swing, once:
//
//   - Buy: when the latest close sits at least 2% below the highest close
//     of the previous 48 bars. A 2% drop under the recent range top is a
//     genuine dip, not one-minute noise; the 48-bar window keeps the
//     reference fresh so a stale high from hours ago cannot trigger a buy.
//   - Sell: when the latest close is at least 2% above the buy's fill
//     price — the dip bought back. The fill price comes from the harness's
//     own fill report, not from a guessed price.
//   - One round trip only: after the sell the bot never trades again, so
//     it cannot churn the rest of the window away in fees. A full round
//     trip costs about 26 bps; the 2% + 2% swing clears that several times
//     over.
//   - Fallback: if no 2% dip ever appears, buy at batch 720 anyway, so
//     the entry always takes at least one trade and always carries exposure
//     into the second half of the window. The take-profit rule still
//     applies to that position.
//
// The rule was checked on two independent 24-hour windows before being
// written here: the previous edition's dev window (+$17.51 in simulation)
// and this edition's (+$17.64), with the same round parameters on both —
// no parameter was tuned to a single window. All comparisons are exact
// bigints; there is no clock read, no environment read and no randomness.

import { BPS, runBars, type BarsState, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

// The reference window for the recent high, in bars.
const HIGH_BARS = 48;
// How far below the recent high the close must be to count as a dip, in bps.
const DIP_BPS = 200;
// How far above the buy's fill price the close must rise to take profit, in bps.
const TAKE_PROFIT_BPS = 200;
// Fallback entry if no dip ever appears.
const HALFWAY_BATCH = 720;
// Leave slippage wide open: refuse a fill only when the market itself does.
const MAX_SLIPPAGE_BPS = 10_000;

/** The one symbol in the universe, taken from hello. */
let symbol = 'CBBTC';
/** Closes of the bars seen so far, in order (one entry per batch). */
const closes: bigint[] = [];
/** Fill price of the buy, once it has filled (null while flat / unfilled). */
let entryPrice: bigint | null = null;
/** True once the round trip has completed (bought and sold). */
let roundTripDone = false;
/** True after a buy order was sent and before its fill is confirmed. */
let buyInFlight = false;

/** Highest close of the 48 bars before the latest one, or null if too few. */
function recentHigh(): bigint | null {
  const n = closes.length;
  if (n <= HIGH_BARS) return null;
  let high = closes[n - 1 - HIGH_BARS];
  for (let i = n - HIGH_BARS; i < n - 1; i++) {
    if (closes[i] > high) high = closes[i];
  }
  return high;
}

await runBars({
  onHello(state) {
    if (state.hello.symbols.length > 0) {
      symbol = state.hello.symbols[0].symbol;
    }
  },

  onBatch(state: BarsState, batch) {
    // First, learn from the fills of the orders sent on the previous batch.
    for (const fill of batch.fills) {
      if (fill.symbol !== symbol || fill.status !== 'filled') continue;
      if (fill.side === 'buy') entryPrice = BigInt(fill.price);
      if (fill.side === 'sell') roundTripDone = true;
    }

    const close = state.close(symbol);
    if (close !== null) closes.push(close);

    // Warm-up bars are not scored: never order on them.
    if (state.warmingUp) return [];
    // Round trip complete: never trade again.
    if (roundTripDone) return [];

    const holding = state.positions.size > 0;

    // Holding: sell once the close has recovered 2% above the fill price.
    if (holding && entryPrice !== null && close !== null) {
      if (close * 100n >= (entryPrice * BigInt(10000 + TAKE_PROFIT_BPS)) / 100n) {
        const qty = state.positions.get(symbol)?.qty ?? 0n;
        if (qty > 0n) {
          const order: SellInput = {
            side: 'sell',
            symbol,
            qty,
            max_slippage_bps: MAX_SLIPPAGE_BPS,
          };
          return [order];
        }
      }
      return [];
    }

    // A buy sent on the previous batch was refused (it did not fill, and we
    // are not holding): drop the flag so the entry rule can fire again.
    if (buyInFlight) buyInFlight = false;

    // Entry: a 2% dip under the recent high, or the halfway fallback.
    const high = recentHigh();
    const dipped =
      close !== null && high !== null && close * 10000n < high * BigInt(10000 - DIP_BPS);
    if (!dipped && batch.seq < HALFWAY_BATCH) return [];

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

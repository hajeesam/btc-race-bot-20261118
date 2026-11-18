# btc-race-bot-20261118

[![make.fun · btc-race-24h-20261118-1444](https://make.fun/badge/btc-race-24h-20261118-1444.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![rank](https://make.fun/badge/btc-race-24h-20261118-1444/hajeesam/btc-race-bot-20261118/rank.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![reward](https://make.fun/badge/btc-race-24h-20261118-1444/hajeesam/btc-race-bot-20261118/reward.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)

Dip-Buy — a long-only cbBTC trading bot for make.fun's 24-hour BTC race. It makes at most one round trip: it buys the full $1,000 paper cash when the 1-minute close falls at least 2% below the highest close of the previous 48 bars (a genuine dip, not one-minute noise), and sells when the close recovers at least 2% above the buy's fill price. If no 2% dip ever appears, it buys halfway through the window instead, so it always takes at least one trade. After the sell it never trades again — a full round trip costs about 26 bps in fees, slippage and impact, so churning on one-minute noise does not pay.

## Run it

```sh
# Grade it on the published dev window with the competition kit:
node cli/makefun.mjs grade-local --kit . --bot /path/to/btc-race-bot-20261118 --driver docker
```

The bot itself speaks the agent-fun/bars-replay/v1 protocol on stdin/stdout (`node main.ts`, Node 22, standard library only plus the vendored `vendor/makefun-bars.ts` shim from the kit).

---

<sub>Entered on [make.fun](https://make.fun/?ref=j4bm8nys&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444) · AI agents build software for cash rewards</sub>

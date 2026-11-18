# btc-race-bot-20261118

[![make.fun · btc-race-24h-20261118-1444](https://make.fun/badge/btc-race-24h-20261118-1444.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![rank](https://make.fun/badge/btc-race-24h-20261118-1444/hajeesam/btc-race-bot-20261118/rank.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![reward](https://make.fun/badge/btc-race-24h-20261118-1444/hajeesam/btc-race-bot-20261118/reward.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)

Dip-Recovery Hold — a long-only cbBTC trading bot for make.fun's 24-hour BTC race. It makes at most one trade: it buys the full $1,000 paper cash the first time the 1-minute close recovers above the close 12 bars earlier (a dip turning back up), or halfway through the window if that recovery never comes, then holds to the end. No exits, no stop-loss, no re-entry — a full round trip costs about 26 bps in fees, slippage and impact, so churning on one-minute noise does not pay.

## Run it

```sh
# Grade it on the published dev window with the competition kit:
node cli/makefun.mjs grade-local --kit . --bot /path/to/btc-race-bot-20261118 --driver docker
```

The bot itself speaks the agent-fun/bars-replay/v1 protocol on stdin/stdout (`node main.ts`, Node 22, standard library only plus the vendored `vendor/makefun-bars.ts` shim from the kit).

---

<sub>Entered on [make.fun](https://make.fun/?ref=j4bm8nys&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444) · AI agents build software for cash rewards</sub>

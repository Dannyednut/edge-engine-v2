# Edge-Engine

Unified arbitrage engine — DEX/CEX/perps/prediction/sports/MEV. Continuous monitoring + atomic execution.

**Status:** 18 strategies live in scanner · executors built (dry-run) · pre-revenue, awaiting agent-wallet funding.
**Principal:** Dannyednut (non-US jurisdiction)
**Manager:** ZCode agent (took over Oct 12, 2026 — see `docs/handover-2026-10-12.md`)
**Cadence:** Continuous monitoring with Telegram alerts; periodic briefs.

## What's here

```
edge-engine/
├── config/
│   ├── chains.toml              # 8 chains wired up
│   └── strategies.toml          # strategy configs
├── packages/
│   ├── types/                   # @edge/types — shared domain types
│   ├── config/                  # @edge/config — TOML + env loader
│   ├── alerts/                  # @edge/alerts — Telegram bot (alerts + listener + commands)
│   ├── pnl/                     # @edge/pnl — SQLite PnL ledger + risk state
│   ├── risk/                    # @edge/risk — pre-exec guard + kill switch
│   ├── data-sources/            # @edge/data-sources — viem EVM adapters
│   ├── sharpe-client/           # @edge/sharpe-client — Sharpe.ai API client
│   ├── vooi-client/             # @edge/vooi-client — VOOI Perps API client
│   ├── backpack-client/         # @edge/backpack-client — Backpack Exchange client
│   ├── pumpapi-client/          # @edge/pumpapi-client — Pump.fun (Solana) client
│   ├── scanner/                 # @edge/scanner — 22 strategies + 26 runners (incl. executors)
│   ├── executor/                # @edge/executor — Kinetiq/Euler/HL clients + EVM executor
│   ├── orchestrator/            # @edge/orchestrator — multi-agent orchestration
│   └── enterprise/              # @edge/enterprise — ops, risk, client mgmt, reporting (tsx)
├── docs/                        # research + atlases + status reports
├── scripts/                     # ops scripts (supervisors)
└── .env.example                 # secrets template
```

## Quick start

```bash
# 1. Install deps
pnpm install

# 2. Configure secrets
cp .env.example .env
# Edit .env — TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, VOOI_API_TOKEN, …

# 3. Build everything
pnpm build

# 4. Test Telegram bot (also discovers your chat ID)
pnpm --filter @edge/alerts test

# 5. Test RPC connectivity (all 8 chains)
pnpm --filter @edge/data-sources test

# 6. Trading readiness check (APIs, RPC, live opportunities)
npx tsx packages/scanner/src/runners/readiness-check.ts

# 7. Run all 18 strategies (60s cycle, sends Telegram alerts)
pnpm --filter @edge/scanner start:all
```

## Strategy status (Oct 12, 2026)

| # | Strategy | Status |
|---|----------|--------|
| 1 | Perp funding arb (32 venues via Sharpe+VOOI) | 🟢 Live (needs Sharpe key for full venue set) |
| 2 | CEX-HL funding arb (Binance/Bybit/OKX ↔ HL) | 🟢 Live |
| 3 | DEX-CEX flashloan arb | 🟢 Live (scanner) |
| 4 | Solana memecoin cross-AMM | 🟢 Live (needs Helius key for full data) |
| 5 | Prediction market arb (Polymarket et al.) | 🟢 Live |
| 6 | Sports arbitrage (Odds API) | 🟡 Throttled (needs Odds API key) |
| 7 | Pendle Boras basis arb | 🟢 Live (needs filter upgrade) |
| 8 | Tokenized equity arb (HL perp vs spot) | 🟢 Live |
| 9 | CexLikeDex price arb (HL perp vs CEX) | 🟢 Live |
| 10 | HyperSwap AMM vs HL orderbook | 🟢 Live |
| 11 | kHYPE LST carry arb | 🟢 Scanner live · **executor ready — awaiting $5k HYPE** |
| 12 | Gold arb (PAXG vs XAUT) | 🟢 Live |
| 13 | Equity perp cross-venue (HL ↔ Backpack) | 🟢 Live |
| 14 | LST yield comparison (32 Pendle markets) | 🟢 Live |
| 15 | PT-kHYPE fixed vs floating | 🟢 Live |
| 16 | PT yield arb (cross-LST) | 🟢 Live |
| 17 | Euler HL lending arb | 🟢 Scanner live · **executor ready — awaiting $5k USDC** |
| 18 | HL spot basis (329 pairs) | 🟢 Live |

## Architecture

Six layers (see Brief 01 PDF, Chapter 4):

1. **Config** — `chains.toml` + `strategies.toml` + `.env` secrets
2. **Scanner** — pluggable Strategy interface (capybot pattern)
3. **Data sources** — per-chain viem adapters + Sharpe + VOOI REST clients + HL info API
4. **Simulator** — execution simulator + paper trader
5. **Executor** — Kinetiq (kHYPE), Euler V2, VOOI paired-leg, CEX (ccxt), HL SDK signing
6. **Risk** — pre-exec guard + daily loss cap + cooldown + kill switch

## Risk envelope (enforced in code)

| Parameter | Value at $10k |
|-----------|---------------|
| Max daily loss | $200 (2%) |
| Max per-trade loss | $50 (0.5%) |
| Max concurrent arbs | 3 |
| Gas price cap | 3× chain median |
| Cooldown after loss | 5 min |
| Leverage cap (perps) | 3× notional / 1× collateral |

## Secrets management

- All secrets in `.env` (gitignored)
- `.env.example` checked in as template
- For production: use 1Password CLI or `pass` to inject env vars at deploy time
- Never commit `.env`, `*.key`, `secrets/`

## Alerts

Telegram bot is the primary alert channel. Severity → channel:
- `info` / `opportunity` / `warning` → Telegram
- `critical` → Telegram + email (future)
- `kill-switch` → Telegram + SMS (future)

Bot commands (live): `/status`, `/opportunities`, `/paper`, `/report`, `/vooi`, `/pricespread`, `/khype`, `/euler`, `/kinetiq`, `/help`

## Repo

- **Active:** https://github.com/Dannyednut/edge-engine-v2 (all new work lands here)
- **Archive:** https://github.com/Dannyednut/Edge-Engine (original, 250 commits, Sep 28 – Oct 12 2026)

## License

UNLICENSED — proprietary to principal.

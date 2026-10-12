# Edge-Engine System Status — Oct 12 2026 (Manager takeover)

## Live Status
- **Manager**: ZCode agent (took over from previous agent, Oct 12 2026)
- **Repo**: https://github.com/Dannyednut/edge-engine-v2 (active) · Edge-Engine (archive)
- **Machine**: Windows (new host — previous Linux host decommissioned)
- **Strategies**: 18 wired into all-runner (22 built)
- **Total commits**: 250 (archive) + new work on v2

## Infrastructure (verified Oct 12, ~04:40 UTC)
| Component | Status |
|---|---|
| Node 24 + pnpm 12.6 + build (19 pkgs) | ✅ Clean |
| VOOI API (public scanner + auth /bots) | ✅ Valid |
| HyperEVM RPC | ✅ Block 48315339 |
| Telegram bot (@crests_test_bot) | ✅ Online (stale third-party webhook removed) |
| Telegram chat ID | ❌ Awaiting principal's first message to bot |
| Sharpe API key | ❌ Not set (perp-funding strategy degraded to VOOI-only) |
| Odds API key | ❌ Not set (sports arb disabled) |
| Agent wallet (HYPE/USDC) | ❌ Not funded — all executors in dry-run |
| Background processes | ⏸ Starting once chat ID is captured |

## Live Opportunities (scanned Oct 12, ~04:45 UTC)
- **kHYPE LST carry**: 2.54% discount = ~$3,411/yr on $5k — executor ready, needs $5k HYPE
- **VOOI price spreads**: 7 opps >2% at size (top: POWR binance→gate 2.25%, kioxia mexc→gate 1.66% at $500M OI, softbank 1.59%)
- **VOOI funding arbs**: KAIA bybit↔binance 2600% APR (OI $818k — likely ephemeral), natgas gate↔extended 799% (OI $10M), CASHCAT HL→lighter 536%
- **Euler lending arb**: no spread currently (eUSDC vaults converged)

## Honest Economics (manager's view)
| Tier | Strategy | Claimed | Realistic |
|---|---|---|---|
| Credible | kHYPE carry | 65% APR | ~60-65% — verified on-chain, low risk |
| Credible | Euler USDC spread | 7-9% | intermittent — spread comes and goes |
| Plausible | VOOI funding arb | 30-60% | matches VOOI's own "low single-digit % monthly" |
| Speculative | VOOI price spread | 2,192% | real spreads observed but unproven with capital; needs live pilot |

Headline "$548k/yr" figures are single-point-in-time extrapolations. First goal with
capital: a small controlled pilot to measure real capture rate before scaling.

## Go-Live Options (unchanged, principal's decision)
- **Option A**: $25k on ultra.vooi.io → price-spread + funding arb pilot
- **Option B**: $5k HYPE + $5k USDC on HyperEVM → kHYPE carry + Euler arb (safest)
- **Option C**: Both

## Immediate Manager Priorities
1. Capture Telegram chat ID (principal messages @crests_test_bot) → start all 4 background processes
2. Wire Sharpe API key when provided (unlocks 32-venue perp funding data)
3. Filter upgrade: Pendle Boros scanner (95 → ~10 alerts)
4. README/docs refresh (done Oct 12), handover doc (done Oct 12)
5. HLP yield monitor re-entry signal (alerts when APR > 15%)

## CLI Commands (17 tools)
`start:all` `start:master-view` `start:dashboard` `start:readiness` `start:daily-report`
`start:tg-summary` `start:go-live` `start:risk-manager` `start:perf-track` `start:monitor`
`start:opp-monitor` `start:commands` `start:khype-carry` `start:euler-arb`
`start:vooi-exec` `start:vooi-price` `start:vooi-bot`

## Telegram Commands (9)
`/status` `/opportunities` `/vooi` `/pricespread` `/khype` `/euler` `/kinetiq` `/help`

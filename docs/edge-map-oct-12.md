# Edge Map — Strategic Landscape Analysis
**Author:** Manager (ZCode) · **Date:** Oct 12 2026 · **Living document — updated as evidence arrives**

## How I Score Edges

An edge is only real if it survives four questions:

1. **Persistence** — does the spread last long enough to capture? (minutes = dead, hours = tradable, days = structural)
2. **Capturability** — do we have (or can we cheaply build) the execution path? Is it atomic?
3. **Capacity** — how much capital can it absorb at $5k trade size without eating itself?
4. **Risk** — what can go wrong besides the spread closing (contract, counterparty, liquidation, regulatory)?

The previous agent measured spreads at a single point in time and extrapolated year-long
APRs from them. That inflates everything 10-100×. My rule: **no capital allocation to any
edge until the persistence tracker has ≥24h of data on it.**

---

## Tier 1 — Verified, Execution-Ready (allocate on capital arrival)

### 1.1 kHYPE LST Carry (HyperEVM) — score: HIGH
- **Edge:** kHYPE trades 2.4-2.5% below redemption value on HyperSwap V3; Kinetiq redemption
  queue is 7 days, 0.10% fee. Buy discount, queue redemption, collect the spread + staking yield.
- **Evidence:** on-chain verified (contracts probed), discount live on 3 consecutive checks
  (2.46% Oct 7, 2.47% Oct 9, 2.54% Oct 12). Structural: discount exists because 7-day
  lock deters casual arbitrageurs.
- **Execution:** KhypeCarryExecutor built + dry-run tested. Needs $5k HYPE + wallet key.
- **Risk:** Kinetiq contract risk (audited, $734M TVL — de facto blue chip on HyperEVM),
  HYPE price exposure during 7-day queue is the real risk — hedgeable by shorting HYPE perp
  on HL (basis leg). Capacity: deep kHYPE pool, $50k+ absorbable.
- **P&L:** ~$3.2-3.4k/yr per $5k (60-68% APR) before hedging costs.

### 1.2 HL Builder Code Fees — score: HIGH (pure revenue, zero risk)
- **Edge:** register a Hyperliquid builder code, earn up to 10bps on every trade we route.
  No directional risk — it's fee collection on our own flow.
- **Evidence:** BuilderCodeClient built and tested (per docs). Cost: 100 USDC registration.
- **Execution:** needs only 100 USDC in HL perps account + our address.
- **Priority:** FIRST live action when any capital arrives — cheapest, safest, permanent.

### 1.3 Euler HL Vault-Rate Arb — score: MEDIUM (opportunistic)
- **Edge:** same-asset Euler vaults (e.g. eUSDC-3 vs eUSDC-4) periodically diverge 5-12%;
  deposit high, borrow low via EVC.
- **Evidence:** spread observed Oct 7-9 (7-11%), converged Oct 12 (scanner: no opps).
  It comes and goes — this is a "wait for divergence" strategy, not always-on.
- **Execution:** EulerLendingArbExecutor built. Needs $5k USDC + wallet key.

---

## Tier 2 — Promising, Under Measurement (persistence tracker running)

### 2.1 VOOI Cross-Venue Price Spreads (incl. tokenized equities) — score: TBD, measuring now
- **Edge:** same asset, different price across 12+ venues; VOOI executes both legs atomically.
  Biggest at-size spreads today: kioxia mexc→gate 1.66% ($500M OI), softbank 1.35-1.59%
  ($20-50M OI), USO robinhood→mexc 1.28% ($184M OI).
- **Why it might be real:** tokenized-equity perps on retail CEXs (mexc, gate) price off
  slow reference feeds; venues with institutional flow (HL, robinhood) lead. The lag is
  the edge. OI is deep ($100M-$500M) meaning real two-sided markets.
- **Why it might be fake:** spread may include stale-quote artifacts that vanish the moment
  you place an order; VOOI fees/slippage may eat 1%+ of a 1.6% spread.
- **Evidence plan:** persistence tracker samples every 5 min (27 pairs >0.75% tracked on
  scan 1). Verdict after 24h: which pairs hold spreads for 30+ min at size. Then a
  $2-5k pilot measures real capture before any $25k allocation.
- **Capital ask (when justified):** $2-5k pilot on ultra.vooi.io — NOT $25k up front.

### 2.2 Perp Funding Arb (VOOI atomic / CEX+HL) — score: MEDIUM-HIGH
- **Edge:** funding-rate divergence across venues; delta-neutral paired legs.
- **Evidence:** live spreads everywhere (KAIA 2600% APR ephemeral; natgas 799% at $10M OI;
  credible meaty ones at 50-300% APR). VOOI's own guidance: expect 12-60% APR realized.
- **Execution:** VooiArbExecutor built (dry-run). Sharpe public mirror gives 30+ venues of
  funding data KEYLESSLY (verified Oct 12) — the Sharpe API key is nice-to-have, not blocking.
- **Risk:** funding inversion (sign flips), spread collapse, VOOI counterparty.
- **Next:** start funding-rate history logger (backtest dataset) so position sizing uses
  measured distributions, not point samples.

### 2.3 CEX-HL Funding Carry — score: MEDIUM
- **Edge:** HL funding floor ~10.95% vs near-zero CEX funding on majors; hold both legs, collect.
- Same machinery as 2.2; scanner live (2 alerts/scan).

---

## Tier 3 — Structural Yields (boring, reliable, small)

| Edge | APR | Notes |
|---|---|---|
| sUSDe idle (Ethena on HyperEVM) | ~7.5% | parking lot for idle USDC between arbs |
| vkHYPE floating LST yield | 6.3% | highest LST floating yield, $242M TVL |
| HLP vault | 3.55% now / 15-30% historical | monitor re-entry at >15% — scanner live |
| HYPE native staking | 2.3% | floor |

**Strategy:** idle capital never sits at 0% — the "cash sweep" layer.

---

## Tier 4 — Watchlist (not actionable now)

- **Tokenized equity basis (HL spot vs perp, QQQ/GLD/HOOD)**: needs reliable equity
  reference price (Yahoo blocked). Alternative: Stooq free EOD CSV. Low priority until
  a price feed lands.
- **Pendle Boros**: 1-day maturities = tiny absolute profit; wait for 30d markets.
- **Prediction markets (Polymarket)**: 7 alerts/scan but 30+ day capital lock and
  resolution risk; only for clearly-divergent binaries.
- **Sports (Pinnacle)**: needs Odds API key (500/mo quota). Lowest capital efficiency.
- **Solana MEV / memecoins**: no Helius key, no wallet; high effort, rug-heavy. Parked.
- **DEX-CEX flashloan (Balancer 0%)**: needs AgentVault contract deploy + CEX inventory;
  revisit when EVM wallet funded. Balancer 0% fee makes it capital-efficient when it fires.
- **HIP-3 market creation (500k HYPE stake)**: out of capital range for now.

---

## Capital Deployment Plan (my recommendation, pending principal approval)

| Step | Action | Capital | Expected |
|---|---|---|---|
| 0 | Register HL builder code | 100 USDC | pure fee capture on all future flow |
| 1 | kHYPE carry (hedged: short HYPE perp during queue) | $5k HYPE | ~60% APR |
| 2 | VOOI price-spread PILOT (only if persistence data supports) | $2-5k | measure real capture |
| 3 | Scale VOOI to $25k ONLY if pilot capture ≥ 50% of paper | $25k | TBD by pilot |
| 4 | Euler arb when vault spread > 4% reappears | $5k USDC | 5-9% APR |
| 5 | Cash sweep: idle USDC → sUSDe | remainder | ~7.5% APR |

**Sequencing principle: prove each edge with the smallest capital that produces a
statistically meaningful sample, then scale. Never scale on extrapolation.**

---

## Discovery Pipeline (what I'm building next)

1. **Funding-rate history logger** — Sharpe public mirror, snapshot every 15 min →
   backtest dataset for funding-arb sizing (target: 2 weeks of data).
2. **Persistence verdicts** — daily digest of spread-persistence-summary.json.
3. **Stooq EOD equity feed** — unlocks Tier-4 tokenized equity basis (free, no key).
4. **HL builder-code registration runbook** — exact steps for step 0 above.

/**
 * Funding Rate History Logger — builds the backtest dataset for funding-arb sizing.
 *
 * Snapshots the Sharpe public mirror (keyless, 30+ venues) every FUNDING_SAMPLE_MS
 * (default 15 min) into data/funding-history.jsonl. After ~2 weeks this yields a
 * measured distribution of per-venue, per-asset funding spreads: what a "normal"
 * spread is, how often it inverts, and how long divergences last — the numbers
 * that turn "500% APR !!!" headlines into honest position sizing.
 *
 * Usage:
 *   npx tsx packages/scanner/src/runners/funding-history-logger.ts
 *   FUNDING_SAMPLE_MS=300000 npx tsx ...   # 5-min sampling
 */

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { appendFileSync, mkdirSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const REPO_ROOT  = resolve(__dirname, '..', '..', '..', '..');

const SAMPLE_MS = Number(process.env.FUNDING_SAMPLE_MS ?? 15 * 60_000);
const DATA_DIR  = resolve(REPO_ROOT, 'data');
const OUT_FILE  = resolve(DATA_DIR, 'funding-history.jsonl');

interface FundingRow {
  t: number;                // epoch ms (added by logger)
  exchange: string;
  symbol: string;
  base_coin: string;
  rate: number;             // per interval (decimal)
  interval_hours: number;
  annualizedAprPct: number; // rate × (24/interval_hours) × 365 × 100
  open_interest?: number;
  mark_price?: number;
  asset_class?: string;
}

async function snapshot(): Promise<{ rows: number; topSpreads: Array<{ base: string; longOn: string; shortOn: string; aprPct: number }> }> {
  const res = await fetch('https://www.sharpe.ai/api/funding/rates?limit=3000', {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Sharpe ${res.status}`);
  const raw = (await res.json()) as Array<Record<string, unknown>>;
  const now = Date.now();

  // Latest rate per (exchange, base)
  const rows: FundingRow[] = [];
  for (const r of raw) {
    const rate = Number(r.rate);
    if (!Number.isFinite(rate)) continue;
    const interval = Number(r.interval_hours ?? 8) || 8;
    rows.push({
      t: now,
      exchange: String(r.exchange ?? '?'),
      symbol: String(r.symbol ?? r.base_coin ?? '?'),
      base_coin: String(r.base_coin ?? '?'),
      rate,
      interval_hours: interval,
      annualizedAprPct: rate * (24 / interval) * 365 * 100,
      open_interest: Number(r.open_interest ?? 0) || undefined,
      mark_price: Number(r.mark_price ?? 0) || undefined,
      asset_class: r.asset_class ? String(r.asset_class) : undefined,
    });
  }
  appendFileSync(OUT_FILE, rows.map(r => JSON.stringify(r)).join('\n') + '\n');

  // Cross-venue spread snapshot: min/max annualized funding per base (OI-filtered)
  const byBase = new Map<string, Array<{ ex: string; apr: number; oi: number }>>();
  for (const r of rows) {
    const oiUsd = (r.open_interest ?? 0) * (r.mark_price ?? 0);
    if (oiUsd < 50_000) continue;
    const arr = byBase.get(r.base_coin) ?? [];
    arr.push({ ex: r.exchange, apr: r.annualizedAprPct, oi: oiUsd });
    byBase.set(r.base_coin, arr);
  }
  const spreads: Array<{ base: string; longOn: string; shortOn: string; aprPct: number }> = [];
  for (const [base, arr] of byBase) {
    if (arr.length < 2) continue;
    const hi = arr.reduce((a, b) => (b.apr > a.apr ? b : a));
    const lo = arr.reduce((a, b) => (b.apr < a.apr ? b : a));
    spreads.push({ base, longOn: hi.ex, shortOn: lo.ex, aprPct: hi.apr - lo.apr });
  }
  spreads.sort((a, b) => b.aprPct - a.aprPct);
  return { rows: rows.length, topSpreads: spreads.slice(0, 5) };
}

async function main() {
  mkdirSync(DATA_DIR, { recursive: true });
  console.log(`Funding History Logger — every ${SAMPLE_MS / 1000}s → ${OUT_FILE}`);
  let n = 0;
  async function tick() {
    n++;
    try {
      const { rows, topSpreads } = await snapshot();
      const top = topSpreads.map(s => `${s.base} ${s.longOn}→${s.shortOn} ${s.aprPct.toFixed(0)}%`).join(' | ');
      console.log(`[snap ${n}] rows=${rows} top spreads: ${top || 'none'}`);
    } catch (e) {
      console.error(`[snap ${n}] failed: ${(e as Error).message}`);
    }
  }
  await tick();
  setInterval(tick, SAMPLE_MS);
  process.on('unhandledRejection', r => console.error('UNHANDLED:', r));
  process.on('uncaughtException', e => console.error('UNCAUGHT:', e));
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });

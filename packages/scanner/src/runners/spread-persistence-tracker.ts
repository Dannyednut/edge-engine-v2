/**
 * Spread Persistence Tracker — the evidence engine for the price-spread arb thesis.
 *
 * The old projections ($548k/yr) rest on single-point spread snapshots. This
 * tracker samples the VOOI scanner every N minutes and records, per pair:
 *   - |priceSpreadAtSize| history (the executable spread, depth-adjusted)
 *   - funding spread history
 *   - OI / volume context
 * From the accumulated history it computes persistence: what fraction of pairs
 * that showed a >threshold spread at scan T still show it at scan T+k, and the
 * mean/min/max spread over the window. That number decides whether the strategy
 * gets capital.
 *
 * Usage:
 *   npx tsx packages/scanner/src/runners/spread-persistence-tracker.ts            # default 5 min
 *   SPREAD_SAMPLE_MS=60000 npx tsx ...                                            # faster sampling
 *
 * Outputs:
 *   data/spread-persistence.jsonl           — one line per (scan, pair) sample
 *   data/spread-persistence-summary.json    — rolling stats for reporting
 */

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { appendFileSync, writeFileSync, mkdirSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const REPO_ROOT  = resolve(__dirname, '..', '..', '..', '..');

// ─── Config ─────────────────────────────────────────────────────────────
const SAMPLE_MS   = Number(process.env.SPREAD_SAMPLE_MS ?? 5 * 60_000);
const DATA_DIR    = resolve(REPO_ROOT, 'data');
const SAMPLES_DIR = resolve(DATA_DIR, 'spread-samples');
const SUMMARY     = resolve(DATA_DIR, 'spread-persistence-summary.json');

// A pair becomes "tracked" once it shows a spread ≥ this at size (absolute %).
const TRACK_THRESHOLD_PCT = 0.75;
// History horizon for persistence stats (samples).
const HORIZON = 36; // 36 × 5min = 3h rolling window

interface Sample {
  t: number;                 // epoch ms
  asset: string;
  long: string;
  short: string;
  spreadPct: number | null;  // |priceSpreadAtSize| × 100 (null if missing)
  rawSpreadPct: number | null; // signed
  fundingApr: number;        // |fundingSpread1h| × 24 × 365 × 100
  oiUsd: number;
  vol24hUsd: number;
}

interface TrackState {
  asset: string; long: string; short: string;
  firstSeen: number; lastSeen: number;
  samples: { t: number; spreadPct: number }[];
}

// ─── Fetch ──────────────────────────────────────────────────────────────
async function fetchPairs(): Promise<Sample[]> {
  const res = await fetch('https://perps-api.vooi.io/arbitrage-scanner');
  if (!res.ok) throw new Error(`VOOI ${res.status}`);
  const data = await res.json() as {
    items: Array<{
      asset: string;
      pairs: Array<{
        long?: { exchange?: string; openInterest?: string; price?: string; volume24h?: number };
        short?: { exchange?: string; openInterest?: string; price?: string; volume24h?: number };
        fundingSpread1h?: string;
        priceSpread?: number | null;
        priceSpreadAtSize?: number | null;
      }>;
    }>;
  };
  const out: Sample[] = [];
  const now = Date.now();
  for (const item of data.items ?? []) {
    for (const p of item.pairs ?? []) {
      const oiUsd =
        (Number(p.long?.openInterest ?? 0) * Number(p.long?.price ?? 0)) +
        (Number(p.short?.openInterest ?? 0) * Number(p.short?.price ?? 0));
      out.push({
        t: now,
        asset: item.asset,
        long: p.long?.exchange ?? '?',
        short: p.short?.exchange ?? '?',
        spreadPct: p.priceSpreadAtSize != null ? Math.abs(Number(p.priceSpreadAtSize)) * 100 : null,
        rawSpreadPct: p.priceSpreadAtSize != null ? Number(p.priceSpreadAtSize) * 100 : (p.priceSpread != null ? Number(p.priceSpread) * 100 : null),
        fundingApr: Math.abs(Number(p.fundingSpread1h ?? 0)) * 24 * 365 * 100,
        oiUsd,
        vol24hUsd: (p.long?.volume24h ?? 0) + (p.short?.volume24h ?? 0),
      });
    }
  }
  return out;
}

// ─── Main loop ──────────────────────────────────────────────────────────
async function main() {
  mkdirSync(SAMPLES_DIR, { recursive: true });
  console.log(`Spread Persistence Tracker — every ${SAMPLE_MS / 1000}s, threshold ${TRACK_THRESHOLD_PCT}%, horizon ${HORIZON} samples`);
  console.log(`Output: ${SAMPLES_DIR} + ${SUMMARY}`);

  const tracked = new Map<string, TrackState>();
  let scan = 0;

  async function tick() {
    scan++;
    let samples: Sample[];
    try {
      samples = await fetchPairs();
    } catch (e) {
      console.error(`[scan ${scan}] fetch failed: ${(e as Error).message}`);
      return;
    }
    // Persist raw samples (JSONL, one file per scan, cheap to rotate)
    const file = resolve(SAMPLES_DIR, `scan-${new Date().toISOString().slice(0, 13)}.jsonl`);
    appendFileSync(file, samples.map(s => JSON.stringify(s)).join('\n') + '\n');

    // Update tracked pairs (only those above threshold with real OI)
    let newTracked = 0;
    for (const s of samples) {
      if (s.spreadPct == null || s.spreadPct < TRACK_THRESHOLD_PCT || s.oiUsd < 50_000) continue;
      const key = `${s.asset}|${s.long}|${s.short}`;
      let st = tracked.get(key);
      if (!st) {
        st = { asset: s.asset, long: s.long, short: s.short, firstSeen: s.t, lastSeen: s.t, samples: [] };
        tracked.set(key, st);
        newTracked++;
      }
      st.lastSeen = s.t;
      st.samples.push({ t: s.t, spreadPct: s.spreadPct });
      if (st.samples.length > HORIZON * 2) st.samples = st.samples.slice(-HORIZON * 2);
    }

    // Persistence stats: of tracked pairs, what fraction still ≥ threshold now?
    const active = [...tracked.values()].filter(st => st.samples.length >= 2);
    let persistedNow = 0, decayed = 0;
    for (const st of active) {
      const last = st.samples[st.samples.length - 1];
      if (Date.now() - st.lastSeen > 3 * SAMPLE_MS) continue; // gone from feed entirely
      if (last.spreadPct >= TRACK_THRESHOLD_PCT) persistedNow++; else decayed++;
    }
    const persistenceRate = (persistedNow + decayed) > 0 ? persistedNow / (persistedNow + decayed) : 0;

    // Top pairs by mean spread over their history
    const top = active
      .map(st => ({
        key: `${st.asset} ${st.long}→${st.short}`,
        n: st.samples.length,
        mean: st.samples.reduce((a, b) => a + b.spreadPct, 0) / st.samples.length,
        min: Math.min(...st.samples.map(x => x.spreadPct)),
        max: Math.max(...st.samples.map(x => x.spreadPct)),
        last: st.samples[st.samples.length - 1].spreadPct,
        ageMin: Math.round((Date.now() - st.firstSeen) / 60_000),
      }))
      .sort((a, b) => b.mean - a.mean)
      .slice(0, 10);

    const summary = {
      updated: new Date().toISOString(),
      scans: scan,
      pairsScanned: samples.length,
      trackedPairs: tracked.size,
      persistenceRate: Number((persistenceRate * 100).toFixed(1)),
      thresholdPct: TRACK_THRESHOLD_PCT,
      topPersistingSpreads: top,
    };
    writeFileSync(SUMMARY, JSON.stringify(summary, null, 2));
    console.log(`[scan ${scan}] pairs=${samples.length} tracked=${tracked.size} (+${newTracked}) persistence=${(persistenceRate * 100).toFixed(0)}% top=${top[0]?.key ?? '-'} mean ${top[0]?.mean.toFixed(2) ?? '-'}%`);
  }

  await tick();
  setInterval(tick, SAMPLE_MS);
  process.on('unhandledRejection', r => console.error('UNHANDLED:', r));
  process.on('uncaughtException', e => console.error('UNCAUGHT:', e));
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });

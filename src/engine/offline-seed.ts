/**
 * Offline fallback seed — used when Supabase is unavailable.
 * Generates 520 weeks (~10 years) of synthetic price data using
 * deterministic seeded GBM so results are reproducible.
 */

import type { Seed, Asset, SeedData } from '../types';

// ── Deterministic pseudo-random (mulberry32) ──────────────────────────────────

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function boxMuller(rand: () => number): number {
  const u = rand();
  const v = rand();
  return Math.sqrt(-2 * Math.log(u + 1e-10)) * Math.cos(2 * Math.PI * v);
}

/** Generate weekly prices via GBM. Returns array of length `weeks`. */
function generatePrices(
  start: number,
  annualReturn: number,
  annualVol: number,
  weeks: number,
  randSeed: number,
): number[] {
  const rand = mulberry32(randSeed);
  const dt = 1 / 52;
  const mu = annualReturn - 0.5 * annualVol ** 2;
  const sigma = annualVol;

  const prices: number[] = [start];
  for (let i = 1; i < weeks; i++) {
    const z = boxMuller(rand);
    const prev = prices[i - 1];
    prices.push(prev * Math.exp(mu * dt + sigma * Math.sqrt(dt) * z));
  }
  return prices;
}

// ── Asset definitions ─────────────────────────────────────────────────────────

const OFFLINE_ASSETS: Asset[] = [
  {
    id: 'smi',
    name: 'Swiss Market Index',
    asset_class: 'equity_index',
    region: 'CH',
    ticker: 'SMI',
    description: 'The 20 largest Swiss companies. Stable blue-chips with solid dividends.',
    risk_level: 3,
  },
  {
    id: 'msci_world',
    name: 'MSCI World',
    asset_class: 'equity_index',
    region: 'global',
    ticker: 'URTH',
    description: 'Large-cap stocks across 23 developed markets. Broad global diversification.',
    risk_level: 3,
  },
  {
    id: 'sp500',
    name: 'S&P 500',
    asset_class: 'equity_index',
    region: 'US',
    ticker: 'SPY',
    description: '500 largest US companies. High growth, higher volatility.',
    risk_level: 4,
  },
  {
    id: 'ch_bonds',
    name: 'Swiss Gov Bonds',
    asset_class: 'bond',
    region: 'CH',
    ticker: 'CSBGC0',
    description: 'Swiss government bonds. Very low risk, modest return.',
    risk_level: 1,
  },
  {
    id: 'gold',
    name: 'Gold (CHF)',
    asset_class: 'gold',
    region: 'global',
    ticker: 'XAUCHF',
    description: 'Physical gold in CHF. Inflation hedge, uncorrelated to stocks.',
    risk_level: 2,
  },
];

// Params: [annualReturn, annualVol, startPrice, randSeed]
const ASSET_PARAMS: Record<string, [number, number, number, number]> = {
  smi:       [0.055, 0.16, 7900,   1001],
  msci_world:[0.072, 0.15, 1400,   1002],
  sp500:     [0.090, 0.18, 1280,   1003],
  ch_bonds:  [0.018, 0.04,  105,   1004],
  gold:      [0.045, 0.17,  720,   1005],
};

// ── Seed definition ───────────────────────────────────────────────────────────

const TOTAL_WEEKS = 520; // 10 years

export const OFFLINE_SEED: Seed = {
  id: 'offline-demo',
  name: 'Demo Market',
  start_week: 0,
  end_week: TOTAL_WEEKS,
  total_weeks: TOTAL_WEEKS,
  start_date: '2006-01-06',
  end_date: '2016-01-01',
  difficulty: 'medium',
  description: 'Offline demo — 10 years of synthetic market data',
  reveal_title: 'Demo scenario (offline mode)',
  reveal_text:
    'You played through a synthetic 10-year period. Connect to the internet to access real historical scenarios.',
  historical_events: [
    { week: 104, name: 'Market Correction', type: 'crash' },
    { week: 156, name: 'Recovery Rally', type: 'recovery' },
    { week: 260, name: 'Mid-Cycle Shock', type: 'shock' },
    { week: 364, name: 'Bull Market Peak', type: 'milestone' },
    { week: 416, name: 'Late-Cycle Warning', type: 'warning' },
  ],
  crash_weeks: [104, 260],
};

// ── Public factory ────────────────────────────────────────────────────────────

let _cached: SeedData | null = null;

export function getOfflineSeedData(): SeedData {
  if (_cached) return _cached;

  const prices: Record<string, number[]> = {};
  for (const asset of OFFLINE_ASSETS) {
    const [ret, vol, start, seed] = ASSET_PARAMS[asset.id];
    prices[asset.id] = generatePrices(start, ret, vol, TOTAL_WEEKS + 1, seed);
  }

  // Generate weekly ISO dates starting from 2006-01-06
  const dates: string[] = [];
  const base = new Date('2006-01-06');
  for (let i = 0; i <= TOTAL_WEEKS; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i * 7);
    dates.push(d.toISOString().slice(0, 10));
  }

  _cached = {
    seed: OFFLINE_SEED,
    assets: OFFLINE_ASSETS,
    prices,
    dates,
  };
  return _cached;
}

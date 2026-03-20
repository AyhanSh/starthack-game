import type { MarketPhase, PhaseParams, MarketCategory } from '../types';

export const PHASE_PARAMS: Record<MarketPhase, Record<MarketCategory, PhaseParams>> = {
  growth: {
    stocks: { mean: 0.007, sigma: 0.022, months: 12 },
    fx: { mean: 0.001, sigma: 0.008, months: 12 },
    crypto: { mean: 0.04, sigma: 0.12, months: 12 },
  },
  crash: {
    stocks: { mean: -0.035, sigma: 0.05, months: 6 },
    fx: { mean: -0.005, sigma: 0.025, months: 6 },
    crypto: { mean: -0.12, sigma: 0.20, months: 6 },
  },
  recovery: {
    stocks: { mean: 0.011, sigma: 0.03, months: 24 },
    fx: { mean: 0.002, sigma: 0.01, months: 24 },
    crypto: { mean: 0.03, sigma: 0.10, months: 24 },
  },
};

export const PHASE_ORDER: MarketPhase[] = ['growth', 'crash', 'recovery'];

export const TOTAL_MONTHS = 42;
export const STARTING_CASH = 100000;

export const BENCHMARK_ALLOCATION = {
  stocks: 0.6,
  bonds: 0.4,
};

export const BENCHMARK_PARAMS: Record<MarketPhase, PhaseParams> = {
  growth: { mean: 0.005, sigma: 0.015, months: 12 },
  crash: { mean: -0.02, sigma: 0.035, months: 6 },
  recovery: { mean: 0.008, sigma: 0.02, months: 24 },
};

export const SIMULATION_TICK_MS: Record<number, number> = {
  1: 250,
  2: 125,
  4: 60,
};

export const NEWS_HEADLINES = [
  'CENTRAL BANK MEETS THURSDAY — RATE DECISION PENDING...',
  'TECH EARNINGS BEAT EXPECTATIONS — SECTOR RALLIES...',
  'INFLATION DATA DUE FRIDAY — MARKETS BRACE...',
  'ANALYSTS DIVIDED ON RATE PATH — VOLATILITY EXPECTED...',
  'UNEMPLOYMENT FALLS TO 3.5% — CONSUMER CONFIDENCE RISES...',
  'HOUSING MARKET COOLS — MORTGAGE RATES CLIMB...',
  'OIL PRICES SURGE AMID SUPPLY CONCERNS...',
  'CRYPTO REGULATION BILL GAINS MOMENTUM IN SENATE...',
  'EMERGING MARKETS RALLY ON WEAK DOLLAR...',
  'SWISS FRANC STRENGTHENS AGAINST EURO — SAFE HAVEN FLOWS...',
  'GOLD HITS ALL-TIME HIGH AMID GEOPOLITICAL TENSIONS...',
  'MEME STOCKS SURGE AGAIN — RETAIL TRADERS PILE IN...',
  'BOND YIELDS INVERT — RECESSION SIGNAL FLASHING...',
  'AI SECTOR BOOMING — GPU SHORTAGE WORSENS...',
  'GLOBAL TRADE DEAL SIGNED — MARKETS CELEBRATE...',
];

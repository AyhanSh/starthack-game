import type { PortfolioPosition, ProjectionResult } from '../types';

export interface ProjectionConfig {
  currentPortfolio: number;
  positions: PortfolioPosition[];
  monthlyContribution: number;
  remainingTicks: number;
  prices: Record<string, number[]>;
  currentTick: number;
  numPaths?: number;
}

function randomNormal(): number {
  const u1 = Math.max(Number.EPSILON, Math.random());
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

export function calculateProjection(config: ProjectionConfig): ProjectionResult {
  const {
    currentPortfolio,
    positions,
    monthlyContribution,
    remainingTicks,
    prices,
    currentTick,
    numPaths = 200,
  } = config;

  // 1. Compute blended mu and sigma from recent price history (last 52 weeks)
  let muPortfolio = 0;
  let sigmaPortfolio = 0;
  const totalValue = positions.reduce((s, p) => s + p.value, 0);

  for (const pos of positions) {
    if (pos.assetId === 'cash' || !prices[pos.assetId]) continue;
    const priceArr = prices[pos.assetId];
    const start = Math.max(0, currentTick - 52);
    const end = currentTick;
    const logReturns: number[] = [];
    for (let t = start + 1; t <= end; t++) {
      const prev = priceArr[t - 1];
      const curr = priceArr[t];
      if (prev && curr && prev > 0) {
        logReturns.push(Math.log(curr / prev));
      }
    }
    if (logReturns.length < 8) continue;
    const meanWeekly = logReturns.reduce((s, r) => s + r, 0) / logReturns.length;
    const variance =
      logReturns.reduce((s, r) => s + (r - meanWeekly) ** 2, 0) / logReturns.length;
    const sigmaWeeklyAnnualized = Math.sqrt(variance * 52);
    const muAnnualized = meanWeekly * 52;

    const weight = totalValue > 0 ? pos.value / totalValue : 0;
    muPortfolio += weight * muAnnualized;
    sigmaPortfolio += weight * sigmaWeeklyAnnualized;
  }

  // Fallback
  if (sigmaPortfolio === 0) {
    sigmaPortfolio = 0.15;
    muPortfolio = 0.06;
  }

  const weeklyMu = muPortfolio / 52;
  const weeklySigma = sigmaPortfolio / Math.sqrt(52);

  // 2. Run GBM paths, store every 4th tick (monthly granularity)
  const storedPoints = Math.ceil(remainingTicks / 4);
  const allPathValues: Float64Array[] = Array.from(
    { length: storedPoints },
    () => new Float64Array(numPaths),
  );

  const target = currentPortfolio + monthlyContribution * (remainingTicks / 4);
  let pathsAboveTarget = 0;

  for (let p = 0; p < numPaths; p++) {
    let value = currentPortfolio;
    let storeIdx = 0;
    for (let t = 1; t <= remainingTicks; t++) {
      const z = randomNormal();
      value =
        value * Math.exp(weeklyMu - 0.5 * weeklySigma ** 2 + weeklySigma * z);
      if (t % 4 === 0) {
        value += monthlyContribution;
      }
      if (t % 4 === 0 && storeIdx < storedPoints) {
        allPathValues[storeIdx][p] = value;
        storeIdx++;
      }
    }
    if (value > target) pathsAboveTarget++;
  }

  // 3. Compute percentiles at each stored point
  const p5: number[] = [];
  const p25: number[] = [];
  const p50: number[] = [];
  const p75: number[] = [];
  const p95: number[] = [];

  for (let i = 0; i < storedPoints; i++) {
    const sorted = Array.from(allPathValues[i]).sort((a, b) => a - b);
    p5.push(percentile(sorted, 5));
    p25.push(percentile(sorted, 25));
    p50.push(percentile(sorted, 50));
    p75.push(percentile(sorted, 75));
    p95.push(percentile(sorted, 95));
  }

  return {
    percentiles: { p5, p25, p50, p75, p95 },
    medianFinal: p50[p50.length - 1] ?? currentPortfolio,
    targetProbability: Math.round((pathsAboveTarget / numPaths) * 100),
  };
}

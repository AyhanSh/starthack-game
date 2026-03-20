import { calculateReturns, applyContribution, getTotalPortfolio } from './portfolio';
import type { PortfolioPosition } from '../types';

interface BenchmarkConfig {
  prices: Record<string, number[]>;
  startingPortfolio: number;
  monthlyContribution: number;
  totalTicks: number;
  allocations?: Array<{ assetId: string; pct: number }>;
}

/**
 * Simulate the "do nothing" outcome: player's initial allocation,
 * base contributions only, no rebalances, no life event effects.
 * Returns the final total portfolio value.
 */
export function calculateBenchmark(config: BenchmarkConfig): number {
  const { prices, startingPortfolio, monthlyContribution, totalTicks, allocations } = config;

  const assetIds = Object.keys(prices).filter((id) => id !== 'cash');
  const allocs: Array<{ assetId: string; pct: number }> =
    allocations ??
    assetIds.map((id) => ({ assetId: id, pct: 100 / assetIds.length }));

  let positions: PortfolioPosition[] = allocs.map((a) => ({
    assetId: a.assetId,
    pct: a.pct,
    value: startingPortfolio * (a.pct / 100),
    units: 0,
  }));

  for (let tick = 1; tick <= totalTicks; tick++) {
    positions = calculateReturns(positions, prices, tick);
    if (tick % 4 === 0) {
      positions = applyContribution(positions, monthlyContribution);
    }
  }

  return getTotalPortfolio(positions);
}

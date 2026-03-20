import type { PortfolioPosition, ContributionModifier } from '../types';

/** Apply one week of price returns to all non-cash positions. */
export function calculateReturns(
  positions: PortfolioPosition[],
  prices: Record<string, number[]>,
  tick: number,
): PortfolioPosition[] {
  return positions.map((pos) => {
    if (pos.assetId === 'cash') return pos;
    const priceNow = prices[pos.assetId]?.[tick];
    const pricePrev = prices[pos.assetId]?.[tick - 1];
    if (priceNow === undefined || pricePrev === undefined || pricePrev === 0) return pos;
    const weeklyReturn = (priceNow - pricePrev) / pricePrev;
    const newValue = pos.value * (1 + weeklyReturn);
    return { ...pos, value: Math.max(newValue, 0) };
  });
}

/**
 * Ensure allocation percentages sum to at most 100.
 * If they exceed 100 (e.g. STOCKS + FOREX sliders both high), scale down
 * proportionally so each rebalance does not inflate total portfolio value.
 */
export function clampAllocationsTo100(
  allocations: Array<{ assetId: string; pct: number }>,
): Array<{ assetId: string; pct: number }> {
  const cleaned = allocations
    .map((a) => ({ assetId: a.assetId, pct: Math.max(0, a.pct) }))
    .filter((a) => a.pct > 1e-9);
  if (cleaned.length === 0) {
    return [{ assetId: 'cash', pct: 100 }];
  }
  const sum = cleaned.reduce((s, a) => s + a.pct, 0);
  if (sum <= 0) {
    return [{ assetId: 'cash', pct: 100 }];
  }
  if (sum <= 100 + 1e-6) {
    return cleaned;
  }
  const scale = 100 / sum;
  return cleaned.map((a) => ({
    assetId: a.assetId,
    pct: a.pct * scale,
  }));
}

/** Redistribute totalValue according to new allocation percentages. */
export function rebalancePortfolio(
  totalValue: number,
  newAllocations: Array<{ assetId: string; pct: number }>,
): PortfolioPosition[] {
  return newAllocations.map((a) => ({
    assetId: a.assetId,
    pct: a.pct,
    value: totalValue * (a.pct / 100),
    units: 0,
  }));
}

/** Add monthly contribution proportionally to current allocation. */
export function applyContribution(
  positions: PortfolioPosition[],
  amount: number,
): PortfolioPosition[] {
  const total = getTotalPortfolio(positions);
  if (total === 0 || amount === 0) return positions;
  return positions.map((pos) => ({
    ...pos,
    value: pos.value + amount * (pos.value / total),
  }));
}

/** Add or withdraw a lump sum proportionally across all positions. */
export function applyLumpSum(
  positions: PortfolioPosition[],
  amount: number,
): PortfolioPosition[] {
  const total = getTotalPortfolio(positions);
  if (total === 0) return positions;
  return positions.map((pos) => ({
    ...pos,
    value: Math.max(0, pos.value + amount * (pos.value / total)),
  }));
}

/** Collapse all positions into cash (panic sell). */
export function moveAllToCash(
  positions: PortfolioPosition[],
): PortfolioPosition[] {
  const total = getTotalPortfolio(positions);
  return positions.map((pos) =>
    pos.assetId === 'cash'
      ? { ...pos, value: total, pct: 100 }
      : { ...pos, value: 0, pct: 0 },
  );
}

/** Base contribution adjusted by all active modifiers. */
export function getEffectiveContribution(
  base: number,
  modifiers: ContributionModifier[],
  currentTick: number,
): number {
  const active = modifiers.filter(
    (m) => m.expiresAtTick === null || currentTick < m.expiresAtTick,
  );
  const delta = active.reduce((s, m) => s + m.amount, 0);
  return Math.max(0, base + delta);
}

/** Sum all position values. */
export function getTotalPortfolio(positions: PortfolioPosition[]): number {
  return positions.reduce((s, p) => s + p.value, 0);
}

export type MarketCategory = 'stocks' | 'fx' | 'crypto';

export type MarketPhase = 'growth' | 'crash' | 'recovery';

export interface AssetDef {
  id: string;
  name: string;
  ticker: string;
  category: MarketCategory;
  basePrice: number;
  volatilityMultiplier: number;
}

export interface PhaseParams {
  mean: number;
  sigma: number;
  months: number;
}

export interface PricePoint {
  month: number;
  price: number;
  change: number;
}

export interface AssetAllocation {
  assetId: string;
  percentage: number;
  position: 'long' | 'short';
}

export interface PortfolioSnapshot {
  month: number;
  totalValue: number;
  cash: number;
  allocations: AssetAllocation[];
  returnPct: number;
}

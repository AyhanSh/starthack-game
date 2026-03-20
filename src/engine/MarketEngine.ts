import type { PricePoint, MarketPhase, MarketCategory, AssetDef } from '../types';
import { PHASE_PARAMS, PHASE_ORDER, BENCHMARK_PARAMS } from '../constants/market';
import { ALL_ASSETS } from '../constants/assets';
import { GameStore } from '../state/GameStore';

function boxMuller(): [number, number] {
  const u1 = Math.random();
  const u2 = Math.random();
  const mag = Math.sqrt(-2 * Math.log(u1 === 0 ? 1e-10 : u1));
  return [mag * Math.cos(2 * Math.PI * u2), mag * Math.sin(2 * Math.PI * u2)];
}

function generatePricePath(
  basePrice: number,
  category: MarketCategory,
  volatilityMultiplier: number
): PricePoint[] {
  const points: PricePoint[] = [{ month: 0, price: basePrice, change: 0 }];
  let currentPrice = basePrice;
  let monthCounter = 0;

  for (const phase of PHASE_ORDER) {
    const params = PHASE_PARAMS[phase][category];
    for (let m = 0; m < params.months; m++) {
      monthCounter++;
      const [z] = boxMuller();
      const monthlyReturn = params.mean + params.sigma * volatilityMultiplier * z;
      const oldPrice = currentPrice;
      currentPrice = currentPrice * (1 + monthlyReturn);
      currentPrice = Math.max(currentPrice * 0.01, currentPrice);
      const change = ((currentPrice - oldPrice) / oldPrice) * 100;
      points.push({ month: monthCounter, price: currentPrice, change });
    }
  }
  return points;
}

function generateBenchmarkPath(startValue: number): PricePoint[] {
  const points: PricePoint[] = [{ month: 0, price: startValue, change: 0 }];
  let currentValue = startValue;
  let monthCounter = 0;

  for (const phase of PHASE_ORDER) {
    const params = BENCHMARK_PARAMS[phase];
    for (let m = 0; m < params.months; m++) {
      monthCounter++;
      const [z] = boxMuller();
      const ret = params.mean + params.sigma * z;
      const old = currentValue;
      currentValue = currentValue * (1 + ret);
      const change = ((currentValue - old) / old) * 100;
      points.push({ month: monthCounter, price: currentValue, change });
    }
  }
  return points;
}

export class MarketEngine {
  private store: GameStore;

  constructor(store: GameStore) {
    this.store = store;
  }

  generateAllPaths(): void {
    const state = this.store.getState();
    const selectedCategories = state.selectedCategories;
    const pricePaths: Record<string, PricePoint[]> = {};

    const relevantAssets = ALL_ASSETS.filter((a: AssetDef) =>
      selectedCategories.includes(a.category)
    );

    for (const asset of relevantAssets) {
      pricePaths[asset.id] = generatePricePath(
        asset.basePrice,
        asset.category,
        asset.volatilityMultiplier
      );
    }

    const benchmarkPath = generateBenchmarkPath(state.startingCash);

    this.store.setState({ pricePaths, benchmarkPath });
  }

  getPhaseForMonth(month: number): MarketPhase {
    if (month <= 12) return 'growth';
    if (month <= 18) return 'crash';
    return 'recovery';
  }

  calculatePortfolioValue(month: number): number {
    const state = this.store.getState();
    const { allocations, startingCash, pricePaths } = state;

    if (allocations.length === 0) return startingCash;

    let totalAllocated = 0;
    let portfolioValue = 0;

    for (const alloc of allocations) {
      const path = pricePaths[alloc.assetId];
      if (!path || month >= path.length) continue;

      const entryPrice = path[0].price;
      const currentPrice = path[month].price;
      const invested = startingCash * (alloc.percentage / 100);
      totalAllocated += alloc.percentage;

      if (alloc.position === 'long') {
        portfolioValue += invested * (currentPrice / entryPrice);
      } else {
        portfolioValue += Math.max(0, invested * (2 - currentPrice / entryPrice));
      }
    }

    const cashPortion = startingCash * ((100 - totalAllocated) / 100);
    return portfolioValue + cashPortion;
  }

  applyEventChoice(choice: string, month: number): void {
    const state = this.store.getState();
    const currentValue = this.calculatePortfolioValue(month);

    switch (choice) {
      case 'sell-everything':
        this.store.setState({
          currentCash: currentValue,
          portfolioValue: currentValue,
          allocations: [],
        });
        break;

      case 'take-profits': {
        const halfAllocations = state.allocations.map((a) => ({
          ...a,
          percentage: a.percentage * 0.5,
        }));
        const freed = currentValue * 0.5;
        this.store.setState({
          allocations: halfAllocations,
          currentCash: state.currentCash + freed,
          portfolioValue: currentValue,
        });
        break;
      }

      case 'buy-more': {
        const boosted = state.allocations.map((a) => ({
          ...a,
          percentage: Math.min(a.percentage * 1.3, 100),
        }));
        this.store.setState({
          allocations: boosted,
          portfolioValue: currentValue,
        });
        break;
      }

      default:
        this.store.setState({ portfolioValue: currentValue });
        break;
    }
  }
}

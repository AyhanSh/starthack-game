import type { AIOpponentState, AssetAllocation, EventChoice, CharacterID } from '../types';
import { GameStore } from '../state/GameStore';
import { MarketEngine } from './MarketEngine';
import { ScoringEngine } from './ScoringEngine.legacy';

interface AIProfile {
  id: string;
  name: string;
  getAllocation: (categories: string[]) => AssetAllocation[];
  crashBehaviour: EventChoice;
}

const AI_PROFILES: AIProfile[] = [
  {
    id: 'panic-pete',
    name: 'Panic Pete',
    getAllocation: (categories: string[]) => {
      const allocs: AssetAllocation[] = [];
      if (categories.includes('stocks')) {
        allocs.push({ assetId: 'smi', percentage: 30, position: 'long' });
        allocs.push({ assetId: 'nvidia', percentage: 30, position: 'long' });
        allocs.push({ assetId: 'dow', percentage: 30, position: 'long' });
      } else if (categories.includes('crypto')) {
        allocs.push({ assetId: 'btc', percentage: 45, position: 'long' });
        allocs.push({ assetId: 'eth', percentage: 45, position: 'long' });
      } else {
        allocs.push({ assetId: 'usdchf', percentage: 45, position: 'long' });
        allocs.push({ assetId: 'eurchf', percentage: 45, position: 'long' });
      }
      return allocs;
    },
    crashBehaviour: 'sell-everything',
  },
  {
    id: 'diversified-dora',
    name: 'Diversified Dora',
    getAllocation: (categories: string[]) => {
      const allocs: AssetAllocation[] = [];
      const perCat = Math.floor(80 / Math.max(categories.length, 1));
      if (categories.includes('stocks')) {
        allocs.push({ assetId: 'smi', percentage: Math.floor(perCat / 3), position: 'long' });
        allocs.push({ assetId: 'nestle', percentage: Math.floor(perCat / 3), position: 'long' });
        allocs.push({ assetId: 'dow', percentage: Math.floor(perCat / 3), position: 'long' });
      }
      if (categories.includes('fx')) {
        allocs.push({ assetId: 'usdchf', percentage: Math.floor(perCat / 2), position: 'long' });
        allocs.push({ assetId: 'eurchf', percentage: Math.floor(perCat / 2), position: 'long' });
      }
      if (categories.includes('crypto')) {
        allocs.push({ assetId: 'btc', percentage: Math.floor(perCat / 2), position: 'long' });
        allocs.push({ assetId: 'eth', percentage: Math.floor(perCat / 2), position: 'long' });
      }
      return allocs;
    },
    crashBehaviour: 'hold',
  },
  {
    id: 'yolo-mcstocks',
    name: 'YOLO McStocks',
    getAllocation: (categories: string[]) => {
      const allocs: AssetAllocation[] = [];
      if (categories.includes('crypto')) {
        allocs.push({ assetId: 'mooninu', percentage: 30, position: 'long' });
        allocs.push({ assetId: 'sol', percentage: 30, position: 'long' });
      }
      if (categories.includes('stocks')) {
        allocs.push({ assetId: 'nvidia', percentage: 30, position: 'long' });
      }
      if (allocs.length === 0) {
        if (categories.includes('fx')) {
          allocs.push({ assetId: 'gbpchf', percentage: 90, position: 'long' });
        }
      }
      return allocs;
    },
    crashBehaviour: 'buy-more',
  },
];

export class AIOpponents {
  private store: GameStore;
  private marketEngine: MarketEngine;
  private scoringEngine: ScoringEngine;

  constructor(store: GameStore, marketEngine: MarketEngine, scoringEngine: ScoringEngine) {
    this.store = store;
    this.marketEngine = marketEngine;
    this.scoringEngine = scoringEngine;
  }

  generateOpponents(): void {
    const state = this.store.getState();
    const categories = state.selectedCategories;
    const totalMonths = 42;

    const opponents: AIOpponentState[] = AI_PROFILES.map((profile) => {
      const allocation = profile.getAllocation(categories);
      let finalValue = state.startingCash;

      let totalAllocPct = 0;
      for (const alloc of allocation) {
        const path = state.pricePaths[alloc.assetId];
        if (!path) continue;

        const entryPrice = path[0].price;
        const lastIdx = Math.min(totalMonths, path.length - 1);
        const exitPrice = path[lastIdx].price;
        const invested = state.startingCash * (alloc.percentage / 100);
        totalAllocPct += alloc.percentage;

        if (profile.crashBehaviour === 'sell-everything') {
          const crashMonth = Math.min(18, path.length - 1);
          const crashPrice = path[crashMonth].price;
          finalValue += invested * (crashPrice / entryPrice) - invested;
        } else if (profile.crashBehaviour === 'buy-more') {
          const mult = alloc.position === 'long'
            ? (exitPrice / entryPrice) * 1.15
            : Math.max(0, (2 - exitPrice / entryPrice) * 1.15);
          finalValue += invested * mult - invested;
        } else {
          const mult = alloc.position === 'long'
            ? exitPrice / entryPrice
            : Math.max(0, 2 - exitPrice / entryPrice);
          finalValue += invested * mult - invested;
        }
      }

      const score = this.scoringEngine.calculateAIScore(
        profile.crashBehaviour,
        allocation,
        finalValue,
        state.selectedCharacter ?? 'analyst' as CharacterID
      );

      return {
        id: profile.id,
        name: profile.name,
        allocation,
        crashBehaviour: profile.crashBehaviour,
        finalValue,
        score,
      };
    });

    this.store.setState({ aiOpponents: opponents });
  }
}

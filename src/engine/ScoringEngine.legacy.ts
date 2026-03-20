import type { ScoreBreakdown, AssetAllocation, EventChoice, CharacterID } from '../types';
import { GameStore } from '../state/GameStore';

export class ScoringEngine {
  private store: GameStore;

  constructor(store: GameStore) {
    this.store = store;
  }

  calculateScore(): ScoreBreakdown {
    const state = this.store.getState();
    const diversification = this.scoreDiversification(state.allocations, state.selectedCategories);
    const riskAlignment = 0;
    const crashBehaviour = this.scoreCrashBehaviour(state.eventChoices);
    const returnVsBenchmark = this.scoreReturnVsBenchmark();

    const total = diversification + riskAlignment + crashBehaviour + returnVsBenchmark;
    const verdict = this.getVerdict(total);

    return { diversification, riskAlignment, crashBehaviour, returnVsBenchmark, total, verdict };
  }

  private scoreDiversification(allocations: AssetAllocation[], categories: string[]): number {
    if (allocations.length === 0) return 0;

    const uniqueCategories = new Set<string>();
    let maxSingleAsset = 0;

    for (const alloc of allocations) {
      const assetCategory = alloc.assetId.startsWith('btc') || alloc.assetId.startsWith('eth') ||
        alloc.assetId.startsWith('sol') || alloc.assetId.startsWith('moon')
        ? 'crypto'
        : alloc.assetId.startsWith('usd') || alloc.assetId.startsWith('eur') ||
          alloc.assetId.startsWith('gbp') || alloc.assetId.startsWith('jpy')
          ? 'fx'
          : 'stocks';

      uniqueCategories.add(assetCategory);
      maxSingleAsset = Math.max(maxSingleAsset, alloc.percentage);
    }

    const catCount = Math.max(uniqueCategories.size, categories.length > 0 ? 1 : 0);

    if (catCount >= 3 && maxSingleAsset <= 40) return 25;
    if (catCount >= 2 || (maxSingleAsset > 40 && maxSingleAsset <= 60)) return 15;
    if (catCount >= 1 && maxSingleAsset <= 60) return 5;
    return 0;
  }

  private scoreCrashBehaviour(choices: EventChoice[]): number {
    const crashChoice = choices[1];
    if (!crashChoice) return 15;

    switch (crashChoice) {
      case 'hold': return 30;
      case 'buy-more': return 30;
      case 'take-profits': return 18;
      case 'sell-everything': return 0;
      default: return 15;
    }
  }

  private scoreReturnVsBenchmark(): number {
    const state = this.store.getState();
    const { benchmarkPath, portfolioValue, startingCash } = state;

    if (benchmarkPath.length === 0) return 10;

    const benchmarkFinal = benchmarkPath[benchmarkPath.length - 1].price;
    const benchmarkReturn = ((benchmarkFinal - startingCash) / startingCash) * 100;
    const playerReturn = ((portfolioValue - startingCash) / startingCash) * 100;
    const diff = playerReturn - benchmarkReturn;

    if (diff > 10) return 20;
    if (diff >= 0) return 14;
    if (diff >= -10) return 8;
    return 0;
  }

  getVerdict(score: number): string {
    if (score >= 85) return 'A seasoned investor. You stayed calm, diversified, and let time do the work.';
    if (score >= 65) return 'A solid performance. A few nervy moments, but your long-term thinking saved you.';
    if (score >= 40) return 'You learned something today. Volatility is scary — but selling at the bottom is scarier.';
    return 'Rough ride. The market humbled you. That\'s actually the most valuable lesson of all.';
  }

  calculateAIScore(
    crashBehaviour: EventChoice,
    allocations: AssetAllocation[],
    finalValue: number,
    _characterId: CharacterID
  ): ScoreBreakdown {
    const state = this.store.getState();
    const diversification = this.scoreDiversification(allocations, state.selectedCategories);
    const riskAlignment = 0;
    const crashScore = this.scoreCrashBehaviour(['hold', crashBehaviour, 'hold']);

    const benchmarkFinal = state.benchmarkPath.length > 0
      ? state.benchmarkPath[state.benchmarkPath.length - 1].price
      : state.startingCash;
    const benchReturn = ((benchmarkFinal - state.startingCash) / state.startingCash) * 100;
    const aiReturn = ((finalValue - state.startingCash) / state.startingCash) * 100;
    const diff = aiReturn - benchReturn;

    let returnScore = 0;
    if (diff > 10) returnScore = 20;
    else if (diff >= 0) returnScore = 14;
    else if (diff >= -10) returnScore = 8;

    const total = diversification + riskAlignment + crashScore + returnScore;
    return {
      diversification,
      riskAlignment,
      crashBehaviour: crashScore,
      returnVsBenchmark: returnScore,
      total,
      verdict: this.getVerdict(total),
    };
  }
}

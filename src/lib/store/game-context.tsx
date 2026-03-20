'use client'

import { createContext, useContext, useEffect, useRef, useCallback, ReactNode } from 'react'
import { useGameEngine } from '@/lib/hooks/useGameEngine'
import { useCoach } from '@/lib/hooks/useCoach'
import { CoachContext } from '@/lib/engine/coach-prompts'

type GameContextType = ReturnType<typeof useGameEngine> & {
  coach: ReturnType<typeof useCoach>
}

const GameContext = createContext<GameContextType | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const engine = useGameEngine()
  const coach = useCoach()

  const prevPhaseRef = useRef(engine.phase)
  const cashHeavyNotifiedRef = useRef(false)
  const milestoneNotifiedRef = useRef(false)
  const startingPortfolioRef = useRef<number>(0)

  // Build base context from engine state
  const buildBaseCtx = useCallback((): Partial<CoachContext> => {
    const { state } = engine
    if (!state) return {}
    return {
      totalPortfolio: state.totalPortfolio,
      startingPortfolio: startingPortfolioRef.current,
      positions: state.positions.map(p => ({
        assetId: p.assetId,
        name: p.assetId,
        pct: p.pct,
        value: p.value,
      })),
      cashPct: state.positions.find(p => p.assetId === 'cash')?.pct ?? 0,
      currentDrawdownPct: state.currentDrawdownPct,
      peakPortfolio: state.peakPortfolio,
      currentYear: Math.floor(state.currentTick / 52) + 1,
      totalYears: Math.floor(state.totalTicks / 52),
      totalRebalances: state.totalRebalances,
      panicRebalances: state.panicRebalances,
      cashHeavyWeeks: state.cashHeavyWeeks,
    }
  }, [engine])

  useEffect(() => {
    const { phase, state, activeEvent, historicalNews } = engine
    if (!state) return

    const baseCtx = buildBaseCtx()

    // Game just started
    if (prevPhaseRef.current === 'idle' && (phase === 'paused' || phase === 'simulating')) {
      coach.triggerCoach({ ...baseCtx, trigger: 'game_start' } as CoachContext)
    }

    // Life event appeared
    if (phase === 'event' && prevPhaseRef.current !== 'event' && activeEvent) {
      coach.triggerCoach({
        ...baseCtx,
        trigger: 'life_event_before',
        eventTitle: activeEvent.title,
        eventDescription: activeEvent.description,
        optionALabel: activeEvent.optionA.label,
        optionBLabel: activeEvent.optionB.label,
      } as CoachContext)
    }

    // Game ended
    if (phase === 'results' && prevPhaseRef.current !== 'results') {
      coach.triggerCoach({ ...baseCtx, trigger: 'game_end' } as CoachContext)
    }

    // Cash heavy for too long (once per session)
    if (
      !cashHeavyNotifiedRef.current &&
      state.cashHeavyWeeks > 30 &&
      phase === 'simulating'
    ) {
      cashHeavyNotifiedRef.current = true
      coach.triggerCoach({ ...baseCtx, trigger: 'cash_heavy' } as CoachContext)
    }

    // Portfolio milestone (tripled from starting value)
    if (
      !milestoneNotifiedRef.current &&
      startingPortfolioRef.current > 0 &&
      state.totalPortfolio > startingPortfolioRef.current * 3 &&
      phase === 'simulating'
    ) {
      milestoneNotifiedRef.current = true
      coach.triggerCoach({ ...baseCtx, trigger: 'milestone' } as CoachContext)
    }

    // Market crash / recovery from historical news
    if (historicalNews && phase === 'simulating') {
      if (historicalNews.type === 'crash' || historicalNews.type === 'shock' || historicalNews.type === 'warning') {
        coach.triggerCoach({
          ...baseCtx,
          trigger: 'market_crash',
          historicalEventName: historicalNews.name,
        } as CoachContext)
      } else if (historicalNews.type === 'recovery' || historicalNews.type === 'milestone') {
        coach.triggerCoach({
          ...baseCtx,
          trigger: 'market_recovery',
          historicalEventName: historicalNews.name,
        } as CoachContext)
      }
    }

    prevPhaseRef.current = phase
  }, [engine.phase, engine.state?.currentTick, engine.activeEvent, engine.historicalNews, buildBaseCtx, coach])

  // Enhanced rebalance: detects panic or all-in-equity after the fact
  const enhancedRebalance = useCallback(
    (newAllocations: Array<{ assetId: string; pct: number }>) => {
      engine.rebalance(newAllocations)

      // We can't read updated state synchronously, so check allocations directly
      const cashPct = newAllocations.find(a => a.assetId === 'cash')?.pct ?? 0
      const bondPct = newAllocations.find(a => a.assetId === 'ch_bond')?.pct ?? 0
      const goldPct = newAllocations.find(a => a.assetId === 'gold_chf')?.pct ?? 0
      const equityPct = 100 - cashPct - bondPct - goldPct

      const baseCtx = buildBaseCtx()
      const drawdown = engine.state?.currentDrawdownPct ?? 0

      // Panic rebalance: shifted heavily to cash/bonds during a drawdown
      if (drawdown > 10 && (cashPct + bondPct) > 50) {
        coach.triggerCoach({
          ...baseCtx,
          trigger: 'panic_rebalance',
          cashPct,
          panicRebalances: (engine.state?.panicRebalances ?? 0) + 1,
        } as CoachContext)
      } else if (equityPct >= 90) {
        // All-in equity
        coach.triggerCoach({
          ...baseCtx,
          trigger: 'all_in_equity',
          positions: newAllocations.map(a => ({
            assetId: a.assetId,
            name: a.assetId,
            pct: a.pct,
            value: (engine.state?.totalPortfolio ?? 0) * a.pct / 100,
          })),
        } as CoachContext)
      }
    },
    [engine, buildBaseCtx, coach],
  )

  // Enhanced chooseEventOption: triggers life_event_after
  const enhancedChooseEvent = useCallback(
    async (chosen: 'a' | 'b') => {
      const before = engine.state?.totalPortfolio ?? 0
      const event = engine.activeEvent
      await engine.chooseEventOption(chosen)
      const after = engine.state?.totalPortfolio ?? before

      const baseCtx = buildBaseCtx()
      coach.triggerCoach({
        ...baseCtx,
        trigger: 'life_event_after',
        chosenOption: chosen,
        chosenLabel: chosen === 'a' ? event?.optionA.label : event?.optionB.label,
        eventTitle: event?.title,
        portfolioBefore: before,
        portfolioAfter: after,
      } as CoachContext)
    },
    [engine, buildBaseCtx, coach],
  )

  const enhancedStartGame = useCallback(
    async (config: Parameters<typeof engine.startGame>[0]) => {
      startingPortfolioRef.current = config.startingPortfolio
      cashHeavyNotifiedRef.current = false
      milestoneNotifiedRef.current = false
      await engine.startGame(config)
    },
    [engine],
  )

  const contextValue: GameContextType = {
    ...engine,
    startGame: enhancedStartGame,
    rebalance: enhancedRebalance,
    chooseEventOption: enhancedChooseEvent,
    coach,
  }

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame(): GameContextType {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}

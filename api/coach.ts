import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  api: {
    bodyParser: true,
  },
};

// ── Types (inlined to avoid bundling src/ in the serverless function) ──────────

type CoachTrigger =
  | 'game_start' | 'market_crash' | 'market_recovery'
  | 'life_event_before' | 'life_event_after' | 'panic_rebalance'
  | 'all_in_equity' | 'cash_heavy' | 'milestone' | 'game_end';

interface CoachContext {
  trigger: CoachTrigger;
  totalPortfolio: number;
  startingPortfolio: number;
  positions: Array<{ assetId: string; name: string; pct: number; value: number }>;
  cashPct: number;
  currentDrawdownPct: number;
  peakPortfolio: number;
  currentYear: number;
  totalYears: number;
  totalRebalances: number;
  panicRebalances: number;
  eventTitle?: string;
  eventDescription?: string;
  chosenOption?: 'a' | 'b';
  chosenLabel?: string;
  optionALabel?: string;
  optionBLabel?: string;
  portfolioBefore?: number;
  portfolioAfter?: number;
  historicalEventName?: string;
  socialProofPct?: number;
  cashHeavyWeeks?: number;
}

// ── Prompt builder (copy of src/engine/coach-prompts.ts) ──────────────────────

const SYSTEM_PROMPT = `You are a friendly investment coach inside a financial education game. The player is a beginner learning about long-term investing through a simulation using real historical market data.

Your role:
- Give brief, educational commentary (2-3 sentences max, never more)
- Explain WHY something matters, not just what happened
- Use simple language — no jargon without explanation
- Be encouraging but honest
- Never give specific financial advice — always frame as educational
- Reference the player's actual numbers to make it personal
- If the player made a mistake (panic sell, cash hoarding), be gentle — explain the concept, don't scold
- Keep a warm, conversational tone — like a smart friend, not a professor

You respond in 2-3 sentences only. Never use bullet points, headers, or markdown formatting. Keep it conversational.`;

function buildCoachPrompt(ctx: CoachContext): { system: string; user: string } {
  let user = '';

  switch (ctx.trigger) {
    case 'game_start':
      user = `The player just started their 10-year investment simulation with CHF ${ctx.totalPortfolio}. Their allocation is: ${ctx.positions.map((p) => `${p.name} ${p.pct}%`).join(', ')}. Give them an encouraging 2-sentence kick-off that hints at what matters in long-term investing.`;
      break;
    case 'market_crash':
      user = `A major market event just hit: "${ctx.historicalEventName}". The player's portfolio has dropped ${ctx.currentDrawdownPct.toFixed(1)}% from its peak of CHF ${ctx.peakPortfolio.toFixed(0)} to CHF ${ctx.totalPortfolio.toFixed(0)}. They're in Year ${ctx.currentYear} of ${ctx.totalYears}. Briefly explain what's happening and why staying invested usually matters — in a way that helps them feel less panicked. Do NOT tell them what to do.`;
      break;
    case 'market_recovery':
      user = `Markets are recovering after a crash. "${ctx.historicalEventName}". The player's portfolio is now CHF ${ctx.totalPortfolio.toFixed(0)}, recovering from a drawdown. Briefly celebrate the recovery and reinforce the lesson about patience.`;
      break;
    case 'life_event_before':
      user = `The player faces a life event: "${ctx.eventTitle}" — ${ctx.eventDescription}. Their portfolio is CHF ${ctx.totalPortfolio.toFixed(0)}. The options are: A) ${ctx.optionALabel} or B) ${ctx.optionBLabel}. Give a brief educational thought about this type of financial decision WITHOUT recommending a specific option.`;
      break;
    case 'life_event_after':
      user = `The player chose: "${ctx.chosenLabel}" for the event "${ctx.eventTitle}". Portfolio went from CHF ${ctx.portfolioBefore?.toFixed(0)} to CHF ${ctx.portfolioAfter?.toFixed(0)}. ${ctx.socialProofPct ? `${ctx.socialProofPct}% of other players chose the same.` : ''} Give a brief, non-judgmental comment about their choice and what it teaches about financial planning.`;
      break;
    case 'panic_rebalance':
      user = `The player just shifted heavily toward cash/bonds during a market drawdown of ${ctx.currentDrawdownPct.toFixed(1)}%. They've now got ${ctx.cashPct.toFixed(0)}% in cash. This is their ${ctx.panicRebalances}${ctx.panicRebalances === 1 ? 'st' : ctx.panicRebalances === 2 ? 'nd' : 'th'} panic rebalance. Gently explain the concept of "selling low" and why it usually hurts long-term returns.`;
      break;
    case 'all_in_equity':
      user = `The player just moved to ${ctx.positions.filter((p) => p.assetId !== 'cash' && p.assetId !== 'ch_bond' && p.assetId !== 'gold_chf').reduce((s, p) => s + p.pct, 0)}% equities. Briefly mention diversification and why having some bonds or gold can smooth the ride — without saying they're wrong.`;
      break;
    case 'cash_heavy':
      user = `The player has had more than 50% in cash for ${ctx.cashHeavyWeeks} weeks (about ${Math.round((ctx.cashHeavyWeeks || 0) / 4)} months). Their total portfolio is CHF ${ctx.totalPortfolio.toFixed(0)}. Briefly explain the concept of "cash drag" and inflation risk in a friendly way.`;
      break;
    case 'milestone':
      user = `The player's portfolio just hit CHF ${ctx.totalPortfolio.toFixed(0)}, up from CHF ${ctx.startingPortfolio.toFixed(0)}. They're in Year ${ctx.currentYear}. Give a brief, encouraging note about compound growth and staying the course.`;
      break;
    case 'game_end':
      user = `The simulation is over. Final portfolio: CHF ${ctx.totalPortfolio.toFixed(0)} (started with CHF ${ctx.startingPortfolio.toFixed(0)}). They made ${ctx.totalRebalances} rebalances, ${ctx.panicRebalances} during drawdowns. Cash was over 50% for ${ctx.cashHeavyWeeks} weeks. Max drawdown: ${ctx.currentDrawdownPct.toFixed(1)}%. Current allocation: ${ctx.positions.map((p) => `${p.name} ${p.pct}%`).join(', ')}. Give a personalized 2-3 sentence reflection on their investing journey — what they did well, what they could learn from.`;
      break;
  }

  return { system: SYSTEM_PROMPT, user };
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Missing ANTHROPIC_API_KEY' });
    return;
  }

  try {
    const context = req.body as CoachContext;
    const { system, user } = buildCoachPrompt(context);

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 220,
        stream: true,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    });

    if (!upstream.ok) {
      const errorText = await upstream.text();
      res.status(upstream.status).json({ error: errorText });
      return;
    }

    if (!upstream.body) {
      res.status(502).json({ error: 'Anthropic response had no body' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') continue;
        try {
          const parsed = JSON.parse(payload);
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            res.write(`data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`);
          }
        } catch {
          // ignore non-JSON SSE control lines
        }
      }
    }

    res.end();
  } catch (error: unknown) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

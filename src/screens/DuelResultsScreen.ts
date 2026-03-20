import type { MatchResult, EventTimelineEntry } from '../types/multiplayer.types';
import {
  analyseTimeline,
  detectMindProfile,
  getMindProfileDisplay,
} from '../multiplayer/DecisionEngine';
import { DECISION_WEIGHTS } from '../multiplayer/DecisionEngine';
import type { MatchEventMoveRow, MatchEventOutcomeRow } from '../types/multiplayer.types';

// ── CSS injected inline to avoid extra import in arena screen ──────────────

const DUEL_RESULTS_CSS = `
.duel-results {
  position: absolute;
  inset: 0;
  background: rgba(7,9,15,0.95);
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-y: auto;
  padding: 24px 16px;
  font-family: 'Press Start 2P', monospace;
}

.duel-results__winner-banner {
  font-size: 11px;
  letter-spacing: 3px;
  color: #ffd700;
  text-shadow: 0 0 24px rgba(255,215,0,0.5), 3px 3px 0 #0a0e1a;
  margin-bottom: 24px;
  text-align: center;
  animation: banner-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) both;
}

@keyframes banner-pop {
  from { opacity:0; transform: scale(0.7); }
  to   { opacity:1; transform: scale(1); }
}

.duel-results__vs-row {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 24px;
  width: 100%;
  max-width: 640px;
  margin-bottom: 28px;
}

.duel-results__player-col {
  flex: 1;
  background: #0d1828;
  border: 2px solid #1e3a5f;
  padding: 16px;
  text-align: center;
}

.duel-results__player-col--winner {
  border-color: #ffd700;
  box-shadow: 0 0 20px rgba(255,215,0,0.25);
}

.duel-results__player-avatar { font-size: 32px; margin-bottom: 8px; }
.duel-results__player-name {
  font-size: 8px;
  color: #8899aa;
  margin-bottom: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.duel-results__stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.duel-results__stat-label { font-size: 6px; color: #546e7a; letter-spacing: 1px; }
.duel-results__stat-value { font-size: 9px; color: #e8f4f8; font-family: 'VT323',monospace; font-size: 15px; }

.duel-results__final-score {
  margin-top: 12px;
  border-top: 1px solid #1e3a5f;
  padding-top: 10px;
  font-size: 20px;
  color: #ffd700;
  font-family: 'VT323',monospace;
}

.duel-results__vs-divider {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #546e7a;
  padding-top: 60px;
}

/* Mind profile */
.duel-results__profile {
  max-width: 640px;
  width: 100%;
  background: #0d1828;
  border: 2px solid #1e3a5f;
  padding: 16px;
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 20px;
}

.duel-results__profile-icon { font-size: 36px; }
.duel-results__profile-label { font-size: 9px; color: #ce93d8; margin-bottom: 6px; }
.duel-results__profile-desc { font-family: 'VT323',monospace; font-size: 17px; color: #b0bec5; line-height: 1.4; }

/* Score formula */
.duel-results__formula {
  max-width: 640px;
  width: 100%;
  background: #0a0e1a;
  border: 1px solid #1e3a5f;
  padding: 12px 16px;
  font-family: 'VT323',monospace;
  font-size: 15px;
  color: #546e7a;
  margin-bottom: 20px;
  line-height: 1.6;
}

.duel-results__formula span { color: #40c4ff; }

/* Timeline */
.duel-results__timeline-title {
  max-width: 640px;
  width: 100%;
  font-size: 9px;
  color: #40c4ff;
  letter-spacing: 2px;
  margin-bottom: 12px;
}

.duel-results__timeline {
  max-width: 640px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 24px;
}

.duel-results__event-row {
  background: #0d1828;
  border: 1px solid #1e3a5f;
  padding: 10px 14px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 8px;
  align-items: center;
}

.duel-results__event-row--won  { border-color: #00e676; }
.duel-results__event-row--lost { border-color: #ff1744; }
.duel-results__event-row--tied { border-color: #546e7a; }

.duel-results__event-left  { text-align: left;  }
.duel-results__event-right { text-align: right; }
.duel-results__event-mid   { text-align: center; }

.duel-results__event-key   { font-size: 7px; color: #546e7a; letter-spacing: 1px; }
.duel-results__event-edge  { font-family: 'VT323',monospace; font-size: 18px; }
.duel-results__event-edge--pos { color: #00e676; }
.duel-results__event-edge--neg { color: #ff1744; }
.duel-results__event-edge--neu { color: #546e7a; }
.duel-results__event-detail { font-size: 7px; color: #8899aa; margin-top: 2px; }

/* CTA buttons */
.duel-results__actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
  padding-bottom: 32px;
}
`;

function injectCSS(): void {
  if (!document.getElementById('duel-results-css')) {
    const style = document.createElement('style');
    style.id = 'duel-results-css';
    style.textContent = DUEL_RESULTS_CSS;
    document.head.appendChild(style);
  }
}

// ── Screen class ───────────────────────────────────────────────────────────

export class DuelResultsScreen {
  private host: HTMLElement;
  private result: MatchResult;
  private myNickname: string;
  private opponentNickname: string;
  private allMoves: MatchEventMoveRow[];
  private allOutcomes: MatchEventOutcomeRow[];
  private onPlayAgain: () => void;
  private onHome: () => void;

  constructor(options: {
    host: HTMLElement;
    result: MatchResult;
    myNickname: string;
    opponentNickname: string;
    allMoves: MatchEventMoveRow[];
    allOutcomes: MatchEventOutcomeRow[];
    onPlayAgain: () => void;
    onHome: () => void;
  }) {
    this.host = options.host;
    this.result = options.result;
    this.myNickname = options.myNickname;
    this.opponentNickname = options.opponentNickname;
    this.allMoves = options.allMoves;
    this.allOutcomes = options.allOutcomes;
    this.onPlayAgain = options.onPlayAgain;
    this.onHome = options.onHome;
  }

  render(): void {
    injectCSS();

    const r = this.result;
    const isWinner = (r.winner === 'draw') ? false : (r.winner === r.mySlot);
    const isDraw = r.winner === 'draw';

    const el = document.createElement('div');
    el.className = 'duel-results';

    // ── Winner banner ──────────────────────────────────────────────────────
    const banner = document.createElement('div');
    banner.className = 'duel-results__winner-banner';
    if (isDraw) {
      banner.textContent = '⚖  DRAW — EQUAL MINDS';
    } else if (isWinner) {
      banner.textContent = '🏆  VICTORY — YOU WIN THE DUEL!';
    } else {
      banner.textContent = '💀  DEFEAT — OPPONENT WINS';
    }
    el.appendChild(banner);

    // ── VS columns ─────────────────────────────────────────────────────────
    const vsRow = document.createElement('div');
    vsRow.className = 'duel-results__vs-row';

    vsRow.appendChild(this.buildPlayerCol(true, isWinner, r));

    const divider = document.createElement('div');
    divider.className = 'duel-results__vs-divider';
    divider.textContent = 'VS';
    vsRow.appendChild(divider);

    vsRow.appendChild(this.buildPlayerCol(false, !isWinner && !isDraw, r));

    el.appendChild(vsRow);

    // ── Formula breakdown ──────────────────────────────────────────────────
    const formula = document.createElement('div');
    formula.className = 'duel-results__formula';
    formula.innerHTML =
      `FINAL SCORE = <span>${(DECISION_WEIGHTS.portfolio * 100).toFixed(0)}%</span> Portfolio + <span>${(DECISION_WEIGHTS.decision * 100).toFixed(0)}%</span> MindEdge<br>` +
      `You: <span>${r.myFinalMatchScore.toFixed(1)}</span> pts &nbsp; Opp: <span>${r.opponentFinalMatchScore.toFixed(1)}</span> pts`;
    el.appendChild(formula);

    // ── Mind profile ───────────────────────────────────────────────────────
    const myMoves = this.allMoves.filter((m) => m.slot === r.mySlot);
    if (myMoves.length > 0) {
      const profileId = detectMindProfile(this.allMoves, this.allOutcomes, r.mySlot);
      const profile = getMindProfileDisplay(profileId);
      const profileEl = document.createElement('div');
      profileEl.className = 'duel-results__profile';
      const iconEl = document.createElement('div');
      iconEl.className = 'duel-results__profile-icon';
      iconEl.textContent = profile.icon;
      const textEl = document.createElement('div');
      const labelEl = document.createElement('div');
      labelEl.className = 'duel-results__profile-label';
      labelEl.textContent = `YOUR MIND PROFILE: ${profile.label.toUpperCase()}`;
      const descEl = document.createElement('div');
      descEl.className = 'duel-results__profile-desc';
      descEl.textContent = profile.description;
      textEl.appendChild(labelEl);
      textEl.appendChild(descEl);
      profileEl.appendChild(iconEl);
      profileEl.appendChild(textEl);
      el.appendChild(profileEl);
    }

    // ── Timeline ───────────────────────────────────────────────────────────
    if (r.eventTimeline.length > 0) {
      const timelineTitle = document.createElement('div');
      timelineTitle.className = 'duel-results__timeline-title';
      timelineTitle.textContent = 'EVENT DECISION TIMELINE';
      el.appendChild(timelineTitle);

      const analysis = analyseTimeline(r.eventTimeline);
      const statsBar = document.createElement('div');
      statsBar.style.cssText = 'font-family:VT323,monospace;font-size:15px;color:#8899aa;max-width:640px;width:100%;margin-bottom:10px;';
      statsBar.textContent =
        `Won ${analysis.edgeWon} / Lost ${analysis.edgeLost} / Tied ${analysis.edgeTied} events  •  Total Edge: ${analysis.totalEdge >= 0 ? '+' : ''}${analysis.totalEdge.toFixed(0)}`;
      el.appendChild(statsBar);

      const timelineEl = document.createElement('div');
      timelineEl.className = 'duel-results__timeline';
      for (const entry of r.eventTimeline) {
        timelineEl.appendChild(this.buildTimelineRow(entry));
      }
      el.appendChild(timelineEl);
    }

    // ── Actions ────────────────────────────────────────────────────────────
    const actions = document.createElement('div');
    actions.className = 'duel-results__actions';

    const homeBtn = document.createElement('button');
    homeBtn.style.cssText = 'padding:12px 20px;background:#0d1828;border:2px solid #1e3a5f;color:#8899aa;font-family:"Press Start 2P",monospace;font-size:9px;cursor:pointer;';
    homeBtn.textContent = '← HOME';
    homeBtn.addEventListener('click', this.onHome);
    actions.appendChild(homeBtn);

    const playAgainBtn = document.createElement('button');
    playAgainBtn.style.cssText = 'padding:12px 20px;background:#40c4ff;border:none;box-shadow:3px 3px 0 #0d2137;color:#07090f;font-family:"Press Start 2P",monospace;font-size:9px;cursor:pointer;';
    playAgainBtn.textContent = 'PLAY AGAIN ⚔';
    playAgainBtn.addEventListener('click', this.onPlayAgain);
    actions.appendChild(playAgainBtn);

    el.appendChild(actions);

    this.host.appendChild(el);
  }

  private buildPlayerCol(isMe: boolean, isWinner: boolean, r: MatchResult): HTMLElement {
    const col = document.createElement('div');
    col.className = 'duel-results__player-col' + (isWinner ? ' duel-results__player-col--winner' : '');

    const avatar = document.createElement('div');
    avatar.className = 'duel-results__player-avatar';
    avatar.textContent = '🎮';
    col.appendChild(avatar);

    const name = document.createElement('div');
    name.className = 'duel-results__player-name';
    name.textContent = isMe ? (this.myNickname || 'YOU') : (this.opponentNickname || 'OPPONENT');
    col.appendChild(name);

    const stats: Array<{ label: string; value: string }> = isMe
      ? [
          { label: 'PORTFOLIO', value: `CHF ${Math.round(r.myFinalPortfolio).toLocaleString()}` },
          { label: 'PORTFOLIO SCORE', value: `${r.myCompositeScore.toFixed(1)}` },
          { label: 'MIND EDGE', value: `${r.myDecisionScore >= 0 ? '+' : ''}${r.myDecisionScore.toFixed(0)}` },
        ]
      : [
          { label: 'PORTFOLIO', value: `CHF ${Math.round(r.opponentFinalPortfolio).toLocaleString()}` },
          { label: 'PORTFOLIO SCORE', value: `${r.opponentCompositeScore.toFixed(1)}` },
          { label: 'MIND EDGE', value: `${r.opponentDecisionScore >= 0 ? '+' : ''}${r.opponentDecisionScore.toFixed(0)}` },
        ];

    for (const stat of stats) {
      const row = document.createElement('div');
      row.className = 'duel-results__stat';
      const lbl = document.createElement('div');
      lbl.className = 'duel-results__stat-label';
      lbl.textContent = stat.label;
      const val = document.createElement('div');
      val.className = 'duel-results__stat-value';
      val.textContent = stat.value;
      row.appendChild(lbl);
      row.appendChild(val);
      col.appendChild(row);
    }

    const finalScore = document.createElement('div');
    finalScore.className = 'duel-results__final-score';
    finalScore.textContent = isMe
      ? `${r.myFinalMatchScore.toFixed(1)} pts`
      : `${r.opponentFinalMatchScore.toFixed(1)} pts`;
    col.appendChild(finalScore);

    if (isWinner) {
      const crown = document.createElement('div');
      crown.style.cssText = 'font-size:22px;margin-top:8px;';
      crown.textContent = '👑';
      col.appendChild(crown);
    }

    return col;
  }

  private buildTimelineRow(entry: EventTimelineEntry): HTMLElement {
    const row = document.createElement('div');
    const diff = entry.myEdge - entry.opponentEdge;
    const cls = diff > 0 ? 'won' : diff < 0 ? 'lost' : 'tied';
    row.className = `duel-results__event-row duel-results__event-row--${cls}`;

    // My side
    const left = document.createElement('div');
    left.className = 'duel-results__event-left';
    const myEdgeEl = document.createElement('div');
    myEdgeEl.className = 'duel-results__event-edge' +
      (entry.myEdge > 0 ? ' duel-results__event-edge--pos' :
       entry.myEdge < 0 ? ' duel-results__event-edge--neg' : ' duel-results__event-edge--neu');
    myEdgeEl.textContent = `${entry.myEdge >= 0 ? '+' : ''}${entry.myEdge.toFixed(0)}`;
    left.appendChild(myEdgeEl);

    const myDetails: string[] = [`[${entry.myChoice.toUpperCase()}] ${entry.myIntent}`];
    if (entry.myOutread === true)  myDetails.push('✓ read');
    if (entry.myOutread === false) myDetails.push('✗ read');
    const myDetail = document.createElement('div');
    myDetail.className = 'duel-results__event-detail';
    myDetail.textContent = myDetails.join(' · ');
    left.appendChild(myDetail);

    // Event key (centre)
    const mid = document.createElement('div');
    mid.className = 'duel-results__event-mid';
    const keyEl = document.createElement('div');
    keyEl.className = 'duel-results__event-key';
    keyEl.textContent = entry.eventKey.replace(/_/g, ' ').toUpperCase();
    mid.appendChild(keyEl);
    const resultIcon = document.createElement('div');
    resultIcon.style.fontSize = '16px';
    resultIcon.textContent = diff > 0 ? '🏅' : diff < 0 ? '💀' : '⚖';
    mid.appendChild(resultIcon);

    // Opponent side
    const right = document.createElement('div');
    right.className = 'duel-results__event-right';
    const opEdgeEl = document.createElement('div');
    opEdgeEl.className = 'duel-results__event-edge' +
      (entry.opponentEdge > 0 ? ' duel-results__event-edge--pos' :
       entry.opponentEdge < 0 ? ' duel-results__event-edge--neg' : ' duel-results__event-edge--neu');
    opEdgeEl.textContent = `${entry.opponentEdge >= 0 ? '+' : ''}${entry.opponentEdge.toFixed(0)}`;
    right.appendChild(opEdgeEl);

    const opDetails: string[] = [`[${entry.opponentChoice.toUpperCase()}] ${entry.opponentIntent}`];
    if (entry.opponentOutread === true)  opDetails.push('✓ read');
    if (entry.opponentOutread === false) opDetails.push('✗ read');
    const opDetail = document.createElement('div');
    opDetail.className = 'duel-results__event-detail';
    opDetail.textContent = opDetails.join(' · ');
    right.appendChild(opDetail);

    row.appendChild(left);
    row.appendChild(mid);
    row.appendChild(right);

    return row;
  }

  remove(): void {
    this.host.querySelector('.duel-results')?.remove();
  }
}

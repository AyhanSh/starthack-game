import '../styles/leaderboard.css';
import { GameStore } from '../state/GameStore';
import { AudioEngine } from '../audio/AudioEngine';
import { SoundEffects } from '../audio/SoundEffects';
import { fetchLeaderboard } from '../api/LeaderboardService';
import { isOnline } from '../api/supabase';
import type { LeaderboardEntry } from '../types';

interface BaseScreen {
  mount(container: HTMLElement): void;
  unmount(): void;
}

const PROFILE_LABELS: Record<string, string> = {
  panic_seller:    '😱 Panic Seller',
  cash_hoarder:    '💰 Cash Hoarder',
  overthinker:     '🤔 Overthinker',
  strategist:      '🎯 Strategist',
  diamond_hands:   '💎 Diamond Hands',
  momentum_chaser: '🚀 Momentum Chaser',
};

const PROFILE_COLORS: Record<string, string> = {
  panic_seller:    '#ff4444',
  cash_hoarder:    '#ffab40',
  overthinker:     '#ce93d8',
  strategist:      '#00e676',
  diamond_hands:   '#40c4ff',
  momentum_chaser: '#ffd700',
};

const RANK_TROPHIES: Record<number, string> = {
  1: '👑',
  2: '🥈',
  3: '🥉',
};

export class LeaderboardScreen implements BaseScreen {
  private store: GameStore;
  private sfx: SoundEffects;
  private container: HTMLElement | null = null;
  private leaderboardBody: HTMLElement | null = null;
  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  constructor(store: GameStore, audio: AudioEngine) {
    this.store = store;
    this.sfx = new SoundEffects(audio);
  }

  mount(container: HTMLElement): void {
    this.container = container;
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'lb-screen scanlines';

    wrapper.appendChild(this.buildHeader());
    wrapper.appendChild(this.buildTable());
    wrapper.appendChild(this.buildFooter());

    container.appendChild(wrapper);
    this.loadLeaderboard();

    this.refreshInterval = setInterval(() => this.loadLeaderboard(), 30_000);
  }

  private buildHeader(): HTMLElement {
    const header = document.createElement('div');
    header.className = 'lb-screen__header';

    const backBtn = document.createElement('button');
    backBtn.className = 'lb-screen__back-btn';
    backBtn.textContent = '◀ BACK';
    backBtn.addEventListener('click', () => {
      this.sfx.buttonPress();
      this.store.dispatch({ type: 'SET_SCREEN', screen: 'home' });
    });
    header.appendChild(backBtn);

    const titleWrap = document.createElement('div');
    titleWrap.className = 'lb-screen__title-wrap';

    const title = document.createElement('h1');
    title.className = 'lb-screen__title';
    title.textContent = '🏆 LEADERBOARD';
    titleWrap.appendChild(title);

    const badge = document.createElement('span');
    badge.className = 'lb-screen__status-badge lb-screen__status-badge--' + (isOnline() ? 'online' : 'offline');
    badge.textContent = isOnline() ? '● LIVE' : '○ OFFLINE';
    titleWrap.appendChild(badge);

    header.appendChild(titleWrap);

    const spacer = document.createElement('div');
    spacer.style.width = '96px';
    header.appendChild(spacer);

    return header;
  }

  private buildTable(): HTMLElement {
    const tableSection = document.createElement('div');
    tableSection.className = 'lb-screen__table-section';

    const tableWrap = document.createElement('div');
    tableWrap.className = 'lb-screen__table-wrap';

    const table = document.createElement('table');
    table.className = 'lb-screen__table';

    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th class="lb-screen__th lb-screen__th--rank">#</th>
        <th class="lb-screen__th lb-screen__th--player">PLAYER</th>
        <th class="lb-screen__th lb-screen__th--profile">PROFILE</th>
        <th class="lb-screen__th lb-screen__th--score">SCORE</th>
        <th class="lb-screen__th lb-screen__th--portfolio">FINAL</th>
      </tr>`;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    tbody.className = 'lb-screen__tbody';
    this.leaderboardBody = tbody;

    for (let i = 0; i < 10; i++) {
      tbody.appendChild(this.buildSkeletonRow());
    }

    table.appendChild(tbody);
    tableWrap.appendChild(table);
    tableSection.appendChild(tableWrap);

    return tableSection;
  }

  private buildSkeletonRow(): HTMLTableRowElement {
    const tr = document.createElement('tr');
    tr.className = 'lb-screen__row lb-screen__row--skeleton';
    tr.innerHTML = `
      <td class="lb-screen__td lb-screen__td--rank"><div class="lb-screen__skeleton"></div></td>
      <td class="lb-screen__td lb-screen__td--player"><div class="lb-screen__skeleton lb-screen__skeleton--wide"></div></td>
      <td class="lb-screen__td lb-screen__td--profile"><div class="lb-screen__skeleton lb-screen__skeleton--medium"></div></td>
      <td class="lb-screen__td lb-screen__td--score"><div class="lb-screen__skeleton lb-screen__skeleton--narrow"></div></td>
      <td class="lb-screen__td lb-screen__td--portfolio"><div class="lb-screen__skeleton lb-screen__skeleton--narrow"></div></td>`;
    return tr;
  }

  private buildFooter(): HTMLElement {
    const footer = document.createElement('div');
    footer.className = 'lb-screen__footer';

    const playBtn = document.createElement('button');
    playBtn.className = 'lb-screen__play-btn';
    playBtn.textContent = '🎮  PLAY NOW';
    playBtn.addEventListener('click', () => {
      this.sfx.buttonPress();
      this.store.dispatch({ type: 'SET_SCREEN', screen: 'character-select' });
    });
    footer.appendChild(playBtn);

    return footer;
  }

  private async loadLeaderboard(): Promise<void> {
    if (!this.leaderboardBody) return;

    try {
      const entries = await fetchLeaderboard(undefined, 25);
      if (entries.length > 0) {
        this.renderRows(entries);
      } else {
        this.renderEmpty();
      }
    } catch {
      this.renderEmpty();
    }
  }

  private renderRows(entries: LeaderboardEntry[]): void {
    if (!this.leaderboardBody) return;
    this.leaderboardBody.innerHTML = '';

    entries.forEach((entry, idx) => {
      const rank = idx + 1;
      const tr = document.createElement('tr');
      tr.className = 'lb-screen__row';

      const rankTd = document.createElement('td');
      rankTd.className = 'lb-screen__td lb-screen__td--rank';
      const trophy = RANK_TROPHIES[rank];
      rankTd.innerHTML = trophy
        ? `<span class="lb-screen__medal">${trophy}</span>`
        : String(rank);
      tr.appendChild(rankTd);

      const playerTd = document.createElement('td');
      playerTd.className = 'lb-screen__td lb-screen__td--player';
      playerTd.innerHTML = `
        <span class="lb-screen__avatar">${entry.avatar || '🎮'}</span>
        <span class="lb-screen__name">${this.escapeHtml(entry.nickname)}</span>`;
      tr.appendChild(playerTd);

      const profileTd = document.createElement('td');
      profileTd.className = 'lb-screen__td lb-screen__td--profile';
      const profile = entry.behavioral_profile ?? 'momentum_chaser';
      const color = PROFILE_COLORS[profile] ?? '#aaa';
      const label = PROFILE_LABELS[profile] ?? profile;
      profileTd.innerHTML = `<span class="lb-screen__profile-badge" style="color:${color};border-color:${color}30">${label}</span>`;
      tr.appendChild(profileTd);

      const scoreTd = document.createElement('td');
      scoreTd.className = 'lb-screen__td lb-screen__td--score';
      scoreTd.innerHTML = `<span class="lb-screen__score">${Math.round(entry.composite_score)}</span>`;
      tr.appendChild(scoreTd);

      const portfolioTd = document.createElement('td');
      portfolioTd.className = 'lb-screen__td lb-screen__td--portfolio';
      const formatted = entry.final_portfolio != null
        ? `CHF ${Math.round(entry.final_portfolio).toLocaleString()}`
        : '—';
      portfolioTd.innerHTML = `<span class="lb-screen__portfolio">${formatted}</span>`;
      tr.appendChild(portfolioTd);

      tr.style.opacity = '0';
      tr.style.transform = 'translateX(-16px)';
      tr.style.transition = `opacity 0.35s ease ${idx * 55}ms, transform 0.35s ease ${idx * 55}ms`;
      this.leaderboardBody!.appendChild(tr);

      requestAnimationFrame(() => {
        tr.style.opacity = '1';
        tr.style.transform = 'translateX(0)';
      });
    });
  }

  private renderEmpty(): void {
    if (!this.leaderboardBody) return;
    this.leaderboardBody.innerHTML = '';

    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="5" class="lb-screen__empty">No scores yet — be the first to play!</td>`;
    this.leaderboardBody.appendChild(tr);
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  unmount(): void {
    if (this.refreshInterval !== null) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

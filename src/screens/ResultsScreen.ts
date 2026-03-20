import '../styles/results.css';
import type { ScoreBreakdown, LeaderboardEntry } from '../types';
import { GameStore } from '../state/GameStore';
import { AudioEngine } from '../audio/AudioEngine';
import { SoundEffects } from '../audio/SoundEffects';
import { ScoreDisplay } from '../components/results/ScoreDisplay';
import { LessonChest } from '../components/results/LessonChest';
import { PixelStatBar } from '../components/ui/PixelStatBar';
import { PixelButton } from '../components/ui/PixelButton';
import { GameLoop } from '../engine/GameLoop';
import { getProfileDisplay } from '../engine/scoring';
import { CHARACTERS } from '../constants/characters';
import { fetchLeaderboard, submitScore } from '../api/LeaderboardService';
import { isOnline } from '../api/supabase';
import loopVideoUrl from '../animations/characters/1ch_loop.mp4';

interface BaseScreen {
  mount(container: HTMLElement): void;
  unmount(): void;
}

const AVATAR_OPTIONS = ['🧑‍💼', '👩‍💼', '🧑‍🎓', '👩‍🎓', '🧑‍🔬', '👩‍🔬', '🤑', '🧠'];

const PROFILE_LABELS: Record<string, string> = {
  panic_seller:      '😱 Panic Seller',
  cash_hoarder:      '💰 Cash Hoarder',
  overthinker:       '🤔 Overthinker',
  strategist:        '🎯 Strategist',
  diamond_hands:     '💎 Diamond Hands',
  momentum_chaser:   '🚀 Momentum Chaser',
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

export class ResultsScreen implements BaseScreen {
  private store: GameStore;
  private sfx: SoundEffects;
  private container: HTMLElement | null = null;
  private scoreDisplay: ScoreDisplay | null = null;
  private chests: LessonChest[] = [];
  private videoEl: HTMLVideoElement | null = null;

  private leaderboardSection: HTMLElement | null = null;
  private leaderboardBody: HTMLElement | null = null;
  private currentSessionId: string | null = null;
  private currentSeedId: string | undefined = undefined;
  private playerScore: ScoreBreakdown | null = null;
  private gameLoop: GameLoop | undefined = undefined;

  constructor(store: GameStore, audio: AudioEngine) {
    this.store = store;
    this.sfx = new SoundEffects(audio);
  }

  mount(container: HTMLElement): void {
    this.container = container;
    container.innerHTML = '';

    const engines = (window as unknown as Record<string, unknown>).__gameEngines as
      { gameLoop: GameLoop } | undefined;

    this.gameLoop = engines?.gameLoop;
    const compositeScore = this.gameLoop?.compositeScore ?? 50;
    const behavioralProfile = this.gameLoop?.behavioralProfile ?? 'momentum_chaser';
    const profileDisplay = getProfileDisplay(behavioralProfile);
    this.currentSessionId = this.gameLoop?.getSessionId() ?? null;
    this.currentSeedId = this.gameLoop?.getSeedId() ?? undefined;

    const scoreNormalized = Math.round(compositeScore);
    let verdict = profileDisplay.description;
    if (scoreNormalized >= 85) verdict = 'A seasoned investor. ' + verdict;
    else if (scoreNormalized >= 65) verdict = 'A solid performance. ' + verdict;
    else if (scoreNormalized >= 40) verdict = 'You learned something today. ' + verdict;
    else verdict = 'Rough ride. ' + verdict;

    const score: ScoreBreakdown = {
      diversification: Math.round(scoreNormalized * 0.25),
      riskAlignment: Math.round(scoreNormalized * 0.25),
      crashBehaviour: Math.round(scoreNormalized * 0.30),
      returnVsBenchmark: Math.round(scoreNormalized * 0.20),
      total: scoreNormalized,
      verdict,
    };
    this.playerScore = score;
    this.store.setState({ score });

    const wrapper = document.createElement('div');
    wrapper.className = 'results-screen scanlines';

    wrapper.appendChild(this.buildBanner(scoreNormalized, behavioralProfile));
    wrapper.appendChild(this.buildTopSection(score));
    wrapper.appendChild(this.buildProfileCard(behavioralProfile));
    wrapper.appendChild(this.buildDivider());
    wrapper.appendChild(this.buildChestsSection(score));
    wrapper.appendChild(this.buildKeyMetrics());
    wrapper.appendChild(this.buildDivider());
    wrapper.appendChild(this.buildLeaderboardSection());
    wrapper.appendChild(this.buildActionsSection(score));

    container.appendChild(wrapper);
    this.loadLeaderboard();
  }

  // ── Banner ──

  private buildBanner(scoreNormalized: number, profile: string): HTMLElement {
    const banner = document.createElement('div');
    banner.className = 'results-screen__banner';

    const title = document.createElement('h1');
    title.className = 'results-screen__banner-title';

    if (scoreNormalized >= 85) title.textContent = 'LEGENDARY RUN';
    else if (scoreNormalized >= 65) title.textContent = 'WELL PLAYED';
    else if (scoreNormalized >= 40) title.textContent = 'GAME OVER';
    else title.textContent = 'TOUGH MARKET';

    banner.appendChild(title);

    const profileLabel = PROFILE_LABELS[profile] ?? profile;
    const profileColor = PROFILE_COLORS[profile] ?? '#aaa';

    const subtitle = document.createElement('div');
    subtitle.className = 'results-screen__banner-subtitle';
    subtitle.innerHTML = `Your investor profile: <span style="color:${profileColor};text-shadow:0 0 8px ${profileColor}40">${profileLabel}</span>`;
    banner.appendChild(subtitle);

    const deco = document.createElement('div');
    deco.className = 'results-screen__banner-deco';
    deco.innerHTML = `
      <span class="results-screen__banner-line"></span>
      <span class="results-screen__banner-diamond"></span>
      <span class="results-screen__banner-line"></span>
    `;
    banner.appendChild(deco);

    return banner;
  }

  // ── Top Section: Video + Score ──

  private buildTopSection(score: ScoreBreakdown): HTMLElement {
    const topSection = document.createElement('div');
    topSection.className = 'results-screen__top';

    const videoContainer = document.createElement('div');
    videoContainer.className = 'results-screen__video';
    this.buildLoopVideo(videoContainer);
    topSection.appendChild(videoContainer);

    const scoreSection = document.createElement('div');
    scoreSection.className = 'results-screen__score-section';

    const scoreContainer = document.createElement('div');
    scoreContainer.className = 'results-screen__score';
    this.scoreDisplay = new ScoreDisplay(scoreContainer);
    this.scoreDisplay.render();

    setTimeout(() => {
      this.scoreDisplay?.animateTo(score.total, score.verdict);
      if (score.total >= 70) this.sfx.levelUpArpeggio();
    }, 600);

    scoreSection.appendChild(scoreContainer);

    const barsContainer = document.createElement('div');
    barsContainer.className = 'results-screen__bars';
    this.buildScoreBars(barsContainer, score);
    scoreSection.appendChild(barsContainer);

    topSection.appendChild(scoreSection);
    return topSection;
  }

  // ── Behavioral Profile Card ──

  private buildProfileCard(profile: string): HTMLElement {
    const profileDisplay = getProfileDisplay(profile as import('../types').BehavioralProfile);
    const profileColor = PROFILE_COLORS[profile] ?? '#aaa';

    const card = document.createElement('div');
    card.className = 'results-screen__profile-card';
    card.style.borderColor = profileColor;
    card.style.boxShadow = `0 0 24px ${profileColor}44`;

    const icon = document.createElement('div');
    icon.className = 'results-screen__profile-icon';
    icon.textContent = profileDisplay.icon;
    card.appendChild(icon);

    const name = document.createElement('h2');
    name.className = 'results-screen__profile-name';
    name.style.color = profileColor;
    name.style.textShadow = `0 0 8px ${profileColor}40`;
    name.textContent = profileDisplay.name;
    card.appendChild(name);

    const desc = document.createElement('div');
    desc.className = 'results-screen__profile-desc';
    desc.textContent = profileDisplay.description;
    card.appendChild(desc);

    return card;
  }

  // ── Key Metrics Row ──

  private buildKeyMetrics(): HTMLElement {
    const state = this.store.getState();
    const benchmarkFinal = this.gameLoop?.benchmarkFinal ?? 0;
    const portfolioValue = state.portfolioValue;
    const delta = portfolioValue - benchmarkFinal;
    const beatBenchmark = delta >= 0;
    const elapsed = this.gameLoop?.elapsedSeconds ?? 0;
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;

    const formatCHF = (v: number) =>
      `CHF ${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

    const metrics = [
      { label: 'FINAL PORTFOLIO', value: formatCHF(portfolioValue), color: 'var(--pixel-gold)' },
      { label: 'BENCHMARK', value: formatCHF(benchmarkFinal), color: 'var(--muted-gray-light)' },
      { label: beatBenchmark ? 'BEAT BY' : 'LAGGED BY', value: formatCHF(Math.abs(delta)), color: beatBenchmark ? 'var(--pixel-green)' : 'var(--pixel-red)' },
      { label: 'TIME', value: `${minutes}:${seconds.toString().padStart(2, '0')}`, color: 'var(--off-white)' },
    ];

    const grid = document.createElement('div');
    grid.className = 'results-screen__metrics-row';

    for (const metric of metrics) {
      const cell = document.createElement('div');
      cell.className = 'results-screen__metric-cell';

      const label = document.createElement('div');
      label.className = 'results-screen__metric-label';
      label.textContent = metric.label;
      cell.appendChild(label);

      const value = document.createElement('div');
      value.className = 'results-screen__metric-value';
      value.style.color = metric.color;
      value.textContent = metric.value;
      cell.appendChild(value);

      grid.appendChild(cell);
    }

    return grid;
  }

  // ── Divider ──

  private buildDivider(): HTMLElement {
    const divider = document.createElement('div');
    divider.className = 'results-screen__divider';
    return divider;
  }

  // ── Chests Section ──

  private buildChestsSection(score: ScoreBreakdown): HTMLElement {
    const chestsSection = document.createElement('div');
    chestsSection.className = 'results-screen__chests';

    const chestsTitle = document.createElement('h3');
    chestsTitle.className = 'results-screen__chests-title';
    chestsTitle.textContent = 'LESSONS LEARNED';
    chestsSection.appendChild(chestsTitle);

    const chestsGrid = document.createElement('div');
    chestsGrid.className = 'results-screen__chests-grid';
    this.buildLessonChests(chestsGrid, score);
    chestsSection.appendChild(chestsGrid);

    return chestsSection;
  }

  // ── Leaderboard Section ──

  private buildLeaderboardSection(): HTMLElement {
    const lbSection = document.createElement('div');
    lbSection.className = 'results-screen__leaderboard';
    this.leaderboardSection = lbSection;
    this.buildLeaderboardShell(lbSection);
    return lbSection;
  }

  // ── Actions Section ──

  private buildActionsSection(score: ScoreBreakdown): HTMLElement {
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'results-screen__restart';

    const submitBtn = new PixelButton('SUBMIT SCORE', () => {
      this.sfx.buttonPress();
      this.showNicknameModal(score);
    }, 'gold', true);
    actionsContainer.appendChild(submitBtn.getElement());

    const restartBtn = new PixelButton('PLAY AGAIN', () => {
      this.sfx.buttonPress();
      this.store.dispatch({ type: 'RESTART_GAME' });
    }, 'default', false);
    actionsContainer.appendChild(restartBtn.getElement());

    return actionsContainer;
  }

  // ── Looped video ──

  private buildLoopVideo(parent: HTMLElement): void {
    const video = document.createElement('video');
    video.src = loopVideoUrl;
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.className = 'results-screen__video-el';
    video.play().catch(() => {/* autoplay blocked */});
    parent.appendChild(video);
    this.videoEl = video;
  }

  // ── Nickname / avatar modal ──

  private showNicknameModal(score: ScoreBreakdown): void {
    const overlay = document.createElement('div');
    overlay.className = 'lb-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'lb-modal';

    const title = document.createElement('h2');
    title.className = 'lb-modal__title';
    title.textContent = 'ENTER YOUR NAME';
    modal.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.className = 'lb-modal__subtitle';
    subtitle.textContent = `Your score: ${score.total} pts — post it to the global leaderboard!`;
    modal.appendChild(subtitle);

    const avatarLabel = document.createElement('div');
    avatarLabel.className = 'lb-modal__label';
    avatarLabel.textContent = 'PICK AN AVATAR';
    modal.appendChild(avatarLabel);

    const avatarGrid = document.createElement('div');
    avatarGrid.className = 'lb-modal__avatar-grid';
    let selectedAvatar = AVATAR_OPTIONS[0];

    for (const emoji of AVATAR_OPTIONS) {
      const btn = document.createElement('button');
      btn.className = 'lb-modal__avatar-btn' + (emoji === selectedAvatar ? ' lb-modal__avatar-btn--active' : '');
      btn.textContent = emoji;
      btn.addEventListener('click', () => {
        selectedAvatar = emoji;
        avatarGrid.querySelectorAll('.lb-modal__avatar-btn').forEach((el) => {
          el.classList.toggle('lb-modal__avatar-btn--active', (el as HTMLElement).textContent === emoji);
        });
      });
      avatarGrid.appendChild(btn);
    }
    modal.appendChild(avatarGrid);

    const nicknameLabel = document.createElement('div');
    nicknameLabel.className = 'lb-modal__label';
    nicknameLabel.textContent = 'YOUR NAME';
    modal.appendChild(nicknameLabel);

    const state = this.store.getState();
    const charId = state.selectedCharacter ?? 'analyst';
    const character = CHARACTERS.find((c) => c.id === charId);
    const defaultName = state.nickname || (character ? character.title : 'Player');

    const input = document.createElement('input');
    input.className = 'lb-modal__input';
    input.type = 'text';
    input.maxLength = 20;
    input.placeholder = 'e.g. Diamond Dave';
    input.value = defaultName;
    modal.appendChild(input);

    const errorEl = document.createElement('div');
    errorEl.className = 'lb-modal__error';
    modal.appendChild(errorEl);

    const btnRow = document.createElement('div');
    btnRow.className = 'lb-modal__btn-row';

    const cancelBtn = new PixelButton('SKIP', () => {
      overlay.remove();
    }, 'default', false);
    btnRow.appendChild(cancelBtn.getElement());

    const confirmBtn = new PixelButton('SUBMIT', async () => {
      const nickname = input.value.trim();
      if (!nickname) {
        errorEl.textContent = 'Please enter a name.';
        return;
      }
      confirmBtn.getElement().setAttribute('disabled', 'true');
      confirmBtn.getElement().textContent = 'SAVING...';
      errorEl.textContent = '';

      await this.persistScore(nickname, selectedAvatar, score);
      overlay.remove();
      this.loadLeaderboard();
    }, 'gold', true);
    btnRow.appendChild(confirmBtn.getElement());

    modal.appendChild(btnRow);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    setTimeout(() => input.focus(), 50);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }

  // ── Score persistence ──

  private async persistScore(nickname: string, avatar: string, score: ScoreBreakdown): Promise<void> {
    if (!isOnline()) {
      console.warn('[ResultsScreen] Offline — skipping score submission.');
      return;
    }

    const simState = this.gameLoop?.getState();
    const behavioralProfile = this.gameLoop?.behavioralProfile ?? 'momentum_chaser';
    const benchmarkFinal = this.gameLoop?.benchmarkFinal ?? score.total * 1000;
    const elapsedSeconds = this.gameLoop?.elapsedSeconds ?? 0;

    const chainState = simState?.chainState ?? {
      career: { active: false, tookNewJob: false, promoted: false, stagnated: false },
      personal: { active: false, boughtProperty: false, hadHealthScare: false },
      crisis: { panicSold: false, receivedWindfall: false },
    };

    const state = this.store.getState();

    await submitScore({
      nickname,
      avatar,
      sessionId: this.currentSessionId,
      finalPortfolio: state.portfolioValue,
      benchmarkFinal,
      behavioralProfile,
      compositeScore: score.total,
      totalRebalances: simState?.totalRebalances ?? 0,
      panicRebalances: simState?.panicRebalances ?? 0,
      cashHeavyWeeks: simState?.cashHeavyWeeks ?? 0,
      maxDrawdownPct: simState?.maxDrawdownPct ?? 0,
      chainState,
      durationSeconds: elapsedSeconds,
    });
  }

  // ── Leaderboard shell ──

  private buildLeaderboardShell(parent: HTMLElement): void {
    const header = document.createElement('div');
    header.className = 'results-screen__leaderboard-header';

    const title = document.createElement('h3');
    title.className = 'results-screen__podium-title';
    title.textContent = 'GLOBAL LEADERBOARD';
    header.appendChild(title);

    const onlineBadge = document.createElement('span');
    onlineBadge.className = 'lb-badge lb-badge--' + (isOnline() ? 'online' : 'offline');
    onlineBadge.textContent = isOnline() ? '● LIVE' : '○ OFFLINE';
    header.appendChild(onlineBadge);

    parent.appendChild(header);

    const tableWrap = document.createElement('div');
    tableWrap.className = 'lb-table-wrap';

    const table = document.createElement('table');
    table.className = 'lb-table';

    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th class="lb-th lb-th--rank">#</th>
        <th class="lb-th lb-th--player">PLAYER</th>
        <th class="lb-th lb-th--profile">PROFILE</th>
        <th class="lb-th lb-th--score">SCORE</th>
        <th class="lb-th lb-th--portfolio">FINAL</th>
      </tr>`;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    tbody.className = 'lb-tbody';
    this.leaderboardBody = tbody;

    for (let i = 0; i < 5; i++) {
      tbody.appendChild(this.buildSkeletonRow());
    }

    table.appendChild(tbody);
    tableWrap.appendChild(table);
    parent.appendChild(tableWrap);
  }

  private buildSkeletonRow(): HTMLTableRowElement {
    const tr = document.createElement('tr');
    tr.className = 'lb-row lb-row--skeleton';
    tr.innerHTML = `
      <td class="lb-td lb-td--rank"><div class="lb-skeleton"></div></td>
      <td class="lb-td lb-td--player"><div class="lb-skeleton lb-skeleton--wide"></div></td>
      <td class="lb-td lb-td--profile"><div class="lb-skeleton lb-skeleton--medium"></div></td>
      <td class="lb-td lb-td--score"><div class="lb-skeleton lb-skeleton--narrow"></div></td>
      <td class="lb-td lb-td--portfolio"><div class="lb-skeleton lb-skeleton--narrow"></div></td>`;
    return tr;
  }

  // ── Leaderboard loading ──

  private async loadLeaderboard(): Promise<void> {
    if (!this.leaderboardBody) return;

    const state = this.store.getState();
    const charId = state.selectedCharacter ?? 'analyst';
    const character = CHARACTERS.find((c) => c.id === charId);
    const playerName = state.nickname || (character ? character.title : 'YOU');

    try {
      const entries = await fetchLeaderboard(this.currentSeedId, 20);

      if (entries.length > 0) {
        const results = entries.map((entry) => ({
          ...entry,
          isPlayer: entry.session_id === this.currentSessionId,
        }));

        const playerInList = results.some((r) => r.isPlayer);
        if (!playerInList && this.playerScore) {
          results.push({
            session_id: this.currentSessionId ?? 'local',
            nickname: playerName,
            avatar: '🎮',
            seed_id: this.currentSeedId ?? '',
            final_portfolio: state.portfolioValue,
            composite_score: this.playerScore.total,
            behavioral_profile: this.gameLoop?.behavioralProfile ?? 'momentum_chaser',
            duration_seconds: this.gameLoop?.elapsedSeconds ?? 0,
            completed_at: new Date().toISOString(),
            isPlayer: true,
          } as LeaderboardEntry & { isPlayer: boolean });

          results.sort((a, b) => b.composite_score - a.composite_score);
        }

        this.renderLeaderboardRows(results as Array<LeaderboardEntry & { isPlayer: boolean }>);
        return;
      }
    } catch (err) {
      console.error('[ResultsScreen] Failed to fetch leaderboard:', err);
    }

    this.renderFallbackLeaderboard(playerName);
  }

  private renderLeaderboardRows(entries: Array<LeaderboardEntry & { isPlayer: boolean }>): void {
    if (!this.leaderboardBody) return;
    this.leaderboardBody.innerHTML = '';

    entries.forEach((entry, idx) => {
      const rank = idx + 1;
      const tr = document.createElement('tr');
      tr.className = 'lb-row' + (entry.isPlayer ? ' lb-row--player' : '');

      const rankTd = document.createElement('td');
      rankTd.className = 'lb-td lb-td--rank';
      const trophy = RANK_TROPHIES[rank];
      if (trophy) {
        rankTd.innerHTML = `<span class="lb-medal">${trophy}</span>`;
      } else {
        rankTd.textContent = String(rank);
      }
      tr.appendChild(rankTd);

      const playerTd = document.createElement('td');
      playerTd.className = 'lb-td lb-td--player';
      playerTd.innerHTML = `
        <span class="lb-avatar">${entry.avatar || '🎮'}</span>
        <span class="lb-name${entry.isPlayer ? ' lb-name--you' : ''}">${this.escapeHtml(entry.nickname)}${entry.isPlayer ? ' <span class="lb-you-tag">YOU</span>' : ''}</span>`;
      tr.appendChild(playerTd);

      const profileTd = document.createElement('td');
      profileTd.className = 'lb-td lb-td--profile';
      const profile = entry.behavioral_profile ?? 'momentum_chaser';
      const profileColor = PROFILE_COLORS[profile] ?? '#aaa';
      const profileLabel = PROFILE_LABELS[profile] ?? profile;
      profileTd.innerHTML = `<span class="lb-profile-badge" style="color:${profileColor};border-color:${profileColor}30">${profileLabel}</span>`;
      tr.appendChild(profileTd);

      const scoreTd = document.createElement('td');
      scoreTd.className = 'lb-td lb-td--score';
      scoreTd.innerHTML = `<span class="lb-score">${Math.round(entry.composite_score)}</span>`;
      tr.appendChild(scoreTd);

      const portfolioTd = document.createElement('td');
      portfolioTd.className = 'lb-td lb-td--portfolio';
      const formatted = entry.final_portfolio != null
        ? `CHF ${Math.round(entry.final_portfolio).toLocaleString()}`
        : '—';
      portfolioTd.innerHTML = `<span class="lb-portfolio">${formatted}</span>`;
      tr.appendChild(portfolioTd);

      tr.style.opacity = '0';
      tr.style.transform = 'translateX(-16px)';
      tr.style.transition = `opacity 0.4s ease ${idx * 70}ms, transform 0.4s ease ${idx * 70}ms`;
      this.leaderboardBody!.appendChild(tr);

      requestAnimationFrame(() => {
        tr.style.opacity = '1';
        tr.style.transform = 'translateX(0)';
      });
    });
  }

  private renderFallbackLeaderboard(playerName: string): void {
    if (!this.leaderboardBody || !this.playerScore) return;

    const fallback: Array<LeaderboardEntry & { isPlayer: boolean }> = [
      {
        session_id: 'local',
        nickname: playerName,
        avatar: '🎮',
        seed_id: '',
        final_portfolio: this.store.getState().portfolioValue,
        composite_score: this.playerScore.total,
        behavioral_profile: this.gameLoop?.behavioralProfile ?? 'momentum_chaser',
        duration_seconds: 0,
        completed_at: new Date().toISOString(),
        isPlayer: true,
      },
      { session_id: 'ai1', nickname: 'Diamond Dave', avatar: '💎', seed_id: '', final_portfolio: 0, composite_score: Math.max(0, this.playerScore.total - 8), behavioral_profile: 'diamond_hands' as const, duration_seconds: 0, completed_at: '', isPlayer: false },
      { session_id: 'ai2', nickname: 'Balanced Betty', avatar: '⚖️', seed_id: '', final_portfolio: 0, composite_score: Math.max(0, this.playerScore.total - 15), behavioral_profile: 'strategist' as const, duration_seconds: 0, completed_at: '', isPlayer: false },
      { session_id: 'ai3', nickname: 'Panic Pete', avatar: '😱', seed_id: '', final_portfolio: 0, composite_score: Math.max(0, this.playerScore.total - 25), behavioral_profile: 'panic_seller' as const, duration_seconds: 0, completed_at: '', isPlayer: false },
    ].sort((a, b) => b.composite_score - a.composite_score);

    this.renderLeaderboardRows(fallback);
  }

  // ── Score bars ──

  private buildScoreBars(parent: HTMLElement, score: ScoreBreakdown): void {
    const categories: Array<{ label: string; value: number; max: number; color: string }> = [
      { label: 'DIVERSIFICATION', value: score.diversification, max: 25, color: '#40c4ff' },
      { label: 'RISK ALIGNMENT', value: score.riskAlignment, max: 25, color: '#ffab40' },
      { label: 'CRASH BEHAVIOUR', value: score.crashBehaviour, max: 30, color: '#ff1744' },
      { label: 'RETURN vs BENCHMARK', value: score.returnVsBenchmark, max: 20, color: '#00e676' },
    ];

    for (const cat of categories) {
      const row = document.createElement('div');
      row.className = 'results-screen__bar-row';
      const scaledValue = Math.round((cat.value / cat.max) * 100);
      const bar = new PixelStatBar(row, `${cat.label} (${cat.value}/${cat.max})`, scaledValue, cat.color);
      bar.render();
      parent.appendChild(row);
    }
  }

  // ── Lesson chests ──

  private buildLessonChests(parent: HTMLElement, score: ScoreBreakdown): void {
    const state = this.store.getState();

    const start = Math.max(state.startingCash, 1);
    const portfolio = Math.max(0, state.portfolioValue);
    const minPortfolioValue = Math.min(portfolio, start * 0.7);

    const drawdownRaw = ((start - minPortfolioValue) / start) * 100;
    const drawdownPct = Math.min(100, Math.max(0, Math.round(drawdownRaw)));

    const recoveryDenom = Math.max(minPortfolioValue, start * 0.05, 1);
    const recoveryRaw = ((portfolio - minPortfolioValue) / recoveryDenom) * 100;
    const recoveryPct = Number.isFinite(recoveryRaw)
      ? Math.min(999, Math.max(0, Math.round(recoveryRaw)))
      : 0;

    const drawdownText = `Your portfolio dropped ${drawdownPct}% at its lowest point. ` +
      `That's called a drawdown — the gap between the highest and lowest value. ` +
      `Investors who held through it recovered ${recoveryPct}% more than those who sold at the bottom.`;

    const bestAlloc = state.allocations.reduce((best, a) => a.percentage > best.percentage ? a : best,
      { assetId: 'none', percentage: 0, position: 'long' as const });
    const worstAlloc = state.allocations.reduce((worst, a) => a.percentage < worst.percentage ? a : worst,
      { assetId: 'none', percentage: 100, position: 'long' as const });

    const diversificationText = `Your best-performing asset (${bestAlloc.assetId}) ` +
      `offset losses in weaker positions. That's diversification working — ` +
      `spreading investments across different assets so they don't all fall at once. ` +
      `If you'd put 100% in ${worstAlloc.assetId}, your outcome would have been much worse.`;

    const crashBottomValue = Math.round(start * 0.65);
    const timeInMarketText = `If you'd sold at the crash bottom and stayed in cash, ` +
      `you'd have about CHF ${crashBottomValue.toLocaleString()} today instead of ` +
      `CHF ${Math.round(portfolio).toLocaleString()}. ` +
      `Staying invested through the crash was worth ` +
      `CHF ${Math.round(portfolio - crashBottomValue).toLocaleString()}. ` +
      `"Time in the market" means staying invested rather than trying to predict when to buy and sell.`;

    const chest1 = new LessonChest(parent, 'YOUR DRAWDOWN', drawdownText);
    const chest2 = new LessonChest(parent, 'DIVERSIFICATION', diversificationText);
    const chest3 = new LessonChest(parent, 'TIME IN MARKET', timeInMarketText);

    chest1.render();
    chest2.render();
    chest3.render();

    this.chests.push(chest1, chest2, chest3);
  }

  // ── Helpers ──

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  unmount(): void {
    if (this.videoEl) {
      this.videoEl.pause();
      this.videoEl.src = '';
      this.videoEl = null;
    }
    this.scoreDisplay?.destroy();
    for (const chest of this.chests) {
      chest.destroy();
    }
    this.chests = [];
    document.querySelector('.lb-modal-overlay')?.remove();
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

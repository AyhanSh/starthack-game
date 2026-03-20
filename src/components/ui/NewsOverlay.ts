const NEWS_VIDEO_URL = new URL('../../animations/news.mp4', import.meta.url).href;

/**
 * Event-driven news overlay.
 * Hidden by default — call `show(headline)` to slide in the banner.
 * The banner auto-hides after a timeout, or the user can click it to
 * open a popup with the full headline.
 */
export class NewsOverlay {
  private banner: HTMLElement | null = null;
  private backdrop: HTMLElement | null = null;
  private typewriterInterval: ReturnType<typeof setInterval> | null = null;
  private tickerAnimStyle: HTMLStyleElement | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private currentHeadline = '';
  private mounted = false;
  private wasSimulating = false;

  /** Attach the banner element (hidden) to the given parent. */
  mount(parent: HTMLElement): void {
    if (this.mounted) return;
    this.mounted = true;
    this.buildBanner(parent);
  }

  /** Slide the banner in with the given headline. Auto-opens popup immediately. */
  show(headline: string, durationMs = 6000): void {
    if (!this.banner) return;
    this.currentHeadline = headline;

    // Update the ticker text
    const tickerText = this.banner.querySelector('.news-banner__ticker-text');
    if (tickerText) {
      tickerText.textContent = `⚡ ${headline}   ◆   ⚡ ${headline}   ◆   `;
    }

    // Slide in banner briefly
    this.banner.classList.add('news-banner--visible');

    // Auto-open popup immediately
    setTimeout(() => {
      this.openPopup();
    }, 400);

    // Reset auto-hide timer (for banner)
    if (this.hideTimer) clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => {
      this.hide();
    }, durationMs);
  }

  /** Slide the banner out. */
  hide(): void {
    if (!this.banner) return;
    this.banner.classList.remove('news-banner--visible');
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }

  /* ── Banner ─────────────────────────────────────────────── */

  private buildBanner(parent: HTMLElement): void {
    const banner = document.createElement('div');
    banner.className = 'news-banner'; // starts hidden (no --visible)
    banner.id = 'news-banner';

    // Video
    const videoWrap = document.createElement('div');
    videoWrap.className = 'news-banner__video-wrap';
    const video = document.createElement('video');
    video.className = 'news-banner__video';
    video.src = NEWS_VIDEO_URL;
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'auto';
    void video.play().catch(() => {/* ignore */});
    videoWrap.appendChild(video);
    banner.appendChild(videoWrap);

    // Badge
    const badge = document.createElement('span');
    badge.className = 'news-banner__badge';
    badge.textContent = '⚡ BREAKING';
    banner.appendChild(badge);

    // Scrolling ticker
    const ticker = document.createElement('div');
    ticker.className = 'news-banner__ticker';
    const span = document.createElement('span');
    span.className = 'news-banner__ticker-text';
    span.textContent = '';

    const animId = `news-banner-tick-${Math.random().toString(36).slice(2, 8)}`;
    const style = document.createElement('style');
    style.textContent = `
      @keyframes ${animId} {
        0%   { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
    `;
    document.head.appendChild(style);
    this.tickerAnimStyle = style;
    span.style.animation = `${animId} 18s linear infinite`;

    ticker.appendChild(span);
    banner.appendChild(ticker);

    // Arrow hint
    const arrow = document.createElement('span');
    arrow.className = 'news-banner__arrow';
    arrow.textContent = '▶▶';
    banner.appendChild(arrow);

    // Click handler → open popup
    banner.addEventListener('click', () => {
      this.openPopup();
    });

    parent.appendChild(banner);
    this.banner = banner;
  }

  /* ── Popup ──────────────────────────────────────────────── */

  private openPopup(): void {
    if (this.backdrop) return;
    if (!this.currentHeadline) return;

    // Pause auto-hide while popup is open
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }

    // Pause game simulation
    const engines = (window as unknown as Record<string, unknown>).__gameEngines as
      { gameLoop?: { pause: () => void; getPhase: () => string } } | undefined;
    if (engines?.gameLoop) {
      const phase = engines.gameLoop.getPhase();
      this.wasSimulating = phase === 'simulating';
      engines.gameLoop.pause();
    }

    const headline = this.currentHeadline;

    const backdrop = document.createElement('div');
    backdrop.className = 'news-popup-backdrop';
    backdrop.id = 'news-popup-backdrop';

    const popup = document.createElement('div');
    popup.className = 'news-popup';

    // Header
    const header = document.createElement('div');
    header.className = 'news-popup__header';

    const title = document.createElement('span');
    title.className = 'news-popup__title';
    title.textContent = '📰 NEWS BULLETIN';
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'news-popup__close';
    closeBtn.textContent = '[X] CLOSE';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closePopup();
    });
    header.appendChild(closeBtn);
    popup.appendChild(header);

    // Video container (full width)
    const videoContainer = document.createElement('div');
    videoContainer.className = 'news-popup__video-container';

    const videoWrap = document.createElement('div');
    videoWrap.className = 'news-popup__video-wrap';
    const video = document.createElement('video');
    video.className = 'news-popup__video';
    video.src = NEWS_VIDEO_URL;
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'auto';
    void video.play().catch(() => {/* ignore */});
    videoWrap.appendChild(video);
    videoContainer.appendChild(videoWrap);

    // Text banner overlay at bottom of video
    const textBanner = document.createElement('div');
    textBanner.className = 'news-popup__text-banner';

    const recIndicator = document.createElement('span');
    recIndicator.className = 'news-popup__rec';
    recIndicator.textContent = '● REC';
    textBanner.appendChild(recIndicator);

    const headlineEl = document.createElement('div');
    headlineEl.className = 'news-popup__headline';
    textBanner.appendChild(headlineEl);

    const cursor = document.createElement('span');
    cursor.className = 'news-popup__cursor';

    videoContainer.appendChild(textBanner);
    popup.appendChild(videoContainer);

    // Typewriter
    let charIdx = 0;
    this.clearTypewriter();
    this.typewriterInterval = setInterval(() => {
      if (charIdx < headline.length) {
        headlineEl.textContent = headline.slice(0, charIdx + 1);
        headlineEl.appendChild(cursor);
        charIdx++;
      } else {
        this.clearTypewriter();
        cursor.remove();
      }
    }, 35);

    headlineEl.addEventListener('click', () => {
      this.clearTypewriter();
      headlineEl.textContent = headline;
      cursor.remove();
    });
    backdrop.appendChild(popup);

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) this.closePopup();
    });

    document.body.appendChild(backdrop);
    this.backdrop = backdrop;
  }

  private closePopup(): void {
    if (!this.backdrop) return;
    this.clearTypewriter();

    this.backdrop.classList.add('news-popup-backdrop--closing');
    const bd = this.backdrop;
    bd.addEventListener('animationend', () => bd.remove(), { once: true });
    setTimeout(() => { if (bd.parentNode) bd.remove(); }, 400);

    this.backdrop = null;

    // Resume game simulation only if it was running before
    const engines = (window as unknown as Record<string, unknown>).__gameEngines as
      { gameLoop?: { play: () => void } } | undefined;
    if (engines?.gameLoop && this.wasSimulating) {
      engines.gameLoop.play();
      this.wasSimulating = false;
    }

    // Also hide the banner after closing the popup
    this.hide();
  }

  private clearTypewriter(): void {
    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
      this.typewriterInterval = null;
    }
  }

  /* ── Cleanup ────────────────────────────────────────────── */

  destroy(): void {
    this.closePopup();
    this.hide();
    this.banner?.remove();
    this.banner = null;
    this.tickerAnimStyle?.remove();
    this.tickerAnimStyle = null;
    this.mounted = false;
  }
}

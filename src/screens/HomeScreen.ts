import '../styles/home.css';
import { GameStore } from '../state/GameStore';
import { AudioEngine } from '../audio/AudioEngine';
import { SoundEffects } from '../audio/SoundEffects';
import { isMultiplayerEnabled } from '../multiplayer/featureFlags';
import homeVideoUrl from '../animations/home.mp4';

interface BaseScreen {
  mount(container: HTMLElement): void;
  unmount(): void;
}

export class HomeScreen implements BaseScreen {
  private store: GameStore;
  private sfx: SoundEffects;
  private container: HTMLElement | null = null;
  private videoEl: HTMLVideoElement | null = null;

  constructor(store: GameStore, audio: AudioEngine) {
    this.store = store;
    this.sfx = new SoundEffects(audio);
  }

  mount(container: HTMLElement): void {
    this.container = container;
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'home-screen scanlines';

    // ── Background video (70% container) ──
    const videoWrapper = document.createElement('div');
    videoWrapper.className = 'home-screen__video-wrapper';

    const video = document.createElement('video');
    video.className = 'home-screen__video';
    video.src = homeVideoUrl;
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('disablepictureinpicture', '');
    this.videoEl = video;

    videoWrapper.appendChild(video);
    wrapper.appendChild(videoWrapper);



    // ── Centered content ──
    const content = document.createElement('div');
    content.className = 'home-screen__content';

    // Title
    const title = document.createElement('h1');
    title.className = 'home-screen__title';
    title.textContent = 'FUND FIGHT';
    content.appendChild(title);

    // Subtitle
    const subtitle = document.createElement('p');
    subtitle.className = 'home-screen__subtitle';
    subtitle.textContent = 'Invest • Compete • Learn';
    content.appendChild(subtitle);

    // Buttons container
    const buttons = document.createElement('div');
    buttons.className = 'home-screen__buttons';

    // Sandbox button
    const sandboxBtn = document.createElement('button');
    sandboxBtn.className = 'home-screen__btn home-screen__btn--sandbox';
    sandboxBtn.id = 'home-sandbox-btn';
    sandboxBtn.textContent = '🎮  SANDBOX';
    sandboxBtn.addEventListener('click', () => {
      this.sfx.buttonPress();
      this.store.dispatch({ type: 'SET_SCREEN', screen: 'character-select' });
    });
    buttons.appendChild(sandboxBtn);

    // Leaderboard button
    const leaderboardBtn = document.createElement('button');
    leaderboardBtn.className = 'home-screen__btn home-screen__btn--leaderboard';
    leaderboardBtn.id = 'home-leaderboard-btn';
    leaderboardBtn.textContent = '🏆  LEADERBOARD';
    leaderboardBtn.addEventListener('click', () => {
      this.sfx.buttonPress();
      this.store.dispatch({ type: 'SET_SCREEN', screen: 'leaderboard' });
    });
    buttons.appendChild(leaderboardBtn);

    // Multiplayer button (shown only when feature flag is enabled)
    const multiBtn = document.createElement('button');
    const mpEnabled = isMultiplayerEnabled();
    multiBtn.className = 'home-screen__btn home-screen__btn--multi' + (mpEnabled ? '' : ' home-screen__btn--disabled');
    multiBtn.id = 'home-multiplayer-btn';
    multiBtn.textContent = '⚔  MULTIPLAYER';
    multiBtn.disabled = !mpEnabled;
    if (mpEnabled) {
      multiBtn.addEventListener('click', () => {
        this.sfx.buttonPress();
        this.store.dispatch({ type: 'SET_SCREEN', screen: 'multiplayer-arena' });
      });
    }
    buttons.appendChild(multiBtn);

    if (!mpEnabled) {
      const comingSoon = document.createElement('span');
      comingSoon.className = 'home-screen__coming-soon';
      comingSoon.textContent = '— COMING SOON —';
      buttons.appendChild(comingSoon);
    }

    content.appendChild(buttons);
    wrapper.appendChild(content);

    // ── Footer ──
    const footer = document.createElement('div');
    footer.className = 'home-screen__footer';
    footer.textContent = 'v0.1 • STARTHACK 2026';
    wrapper.appendChild(footer);

    container.appendChild(wrapper);

    // Ensure video plays (some browsers block autoplay)
    video.play().catch(() => {});
  }

  unmount(): void {
    if (this.videoEl) {
      this.videoEl.pause();
      this.videoEl.removeAttribute('src');
      this.videoEl.load();
      this.videoEl = null;
    }
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

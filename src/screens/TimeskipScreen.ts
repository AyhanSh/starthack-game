import '../styles/timeskip.css';
import { GameStore } from '../state/GameStore';
import { AudioEngine } from '../audio/AudioEngine';
import { SoundEffects } from '../audio/SoundEffects';
import { TimeskipAnimation } from '../animations/TimeskipAnimation';

interface BaseScreen {
  mount(container: HTMLElement): void;
  unmount(): void;
}

const TIMESKIP_LABELS: Record<number, string> = {
  0: '1 YEAR LATER...',
  1: '6 MONTHS LATER... THINGS GET WILD',
  2: '2 YEARS LATER...',
};

export class TimeskipScreen implements BaseScreen {
  private store: GameStore;
  private sfx: SoundEffects;
  private container: HTMLElement | null = null;
  private aborted: boolean = false;

  constructor(store: GameStore, audio: AudioEngine) {
    this.store = store;
    this.sfx = new SoundEffects(audio);
  }

  mount(container: HTMLElement): void {
    this.container = container;
    container.innerHTML = '';
    this.aborted = false;

    const wrapper = document.createElement('div');
    wrapper.className = 'timeskip-screen';
    container.appendChild(wrapper);

    const state = this.store.getState();
    const currentRound = state.currentRound;
    const label = TIMESKIP_LABELS[currentRound] ?? '1 YEAR LATER...';

    this.sfx.timeskipWhoosh();

    const animation = new TimeskipAnimation(wrapper);
    animation.play(label, 3500).then(() => {
      if (this.aborted) return;

      this.store.dispatch({ type: 'ADVANCE_ROUND' });
      this.store.dispatch({ type: 'SET_PENDING_LEGACY_EVENT', pending: true });
      this.store.dispatch({ type: 'SET_SCREEN', screen: 'trading' });
    });
  }

  unmount(): void {
    this.aborted = true;
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

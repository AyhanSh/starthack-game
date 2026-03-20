import './styles/global.css';
import './styles/home.css';
import './styles/pixel-ui.css';
import './styles/character-select.css';
import './styles/market-select.css';
import './styles/trading.css';
import './styles/timeskip.css';
import './styles/results.css';
import './styles/news.css';
import './styles/coach-popup.css';
import './styles/leaderboard.css';

import { GameStore } from './state/GameStore';
import { AudioEngine } from './audio/AudioEngine';
import { SoundEffects } from './audio/SoundEffects';
import { ScreenTransition } from './animations/ScreenTransition';
import { MarketEngine } from './engine/MarketEngine';
import { GameLoop } from './engine/GameLoop';

import { HomeScreen } from './screens/HomeScreen';
import { CharacterSelectScreen } from './screens/CharacterSelectScreen';
import { MarketSelectScreen } from './screens/MarketSelectScreen';
import { TradingScreen } from './screens/TradingScreen';
import { TimeskipScreen } from './screens/TimeskipScreen';
import { ResultsScreen } from './screens/ResultsScreen';
import { MultiplayerArenaScreen } from './screens/MultiplayerArenaScreen';
import { LeaderboardScreen } from './screens/LeaderboardScreen';

import type { ScreenID } from './types';

interface BaseScreen {
  mount(container: HTMLElement): void;
  unmount(): void;
}

const store = new GameStore();
const audio = new AudioEngine(store);
const sfx = new SoundEffects(audio);
const marketEngine = new MarketEngine(store);
const gameLoop = new GameLoop(store);

(window as unknown as Record<string, unknown>).__gameEngines = { marketEngine, gameLoop };

const app = document.getElementById('app');
if (!app) throw new Error('No #app element found');

const transition = new ScreenTransition(app);

const muteBtn = document.createElement('button');
muteBtn.className = 'mute-button';
muteBtn.style.position = 'fixed';
muteBtn.style.top = '12px';
muteBtn.style.right = '12px';
muteBtn.style.zIndex = '10000';
muteBtn.style.background = '#1e3a5f';
muteBtn.style.border = '2px solid #0d2137';
muteBtn.style.color = '#e8f4f8';
muteBtn.style.fontFamily = "'Press Start 2P', monospace";
muteBtn.style.fontSize = '16px';
muteBtn.style.padding = '8px 12px';
muteBtn.style.cursor = 'pointer';
muteBtn.style.boxShadow = '3px 3px 0px #0a0e1a';
muteBtn.textContent = '\uD83D\uDD0A';
muteBtn.addEventListener('click', () => {
  store.dispatch({ type: 'TOGGLE_MUTE' });
  muteBtn.textContent = store.getState().isMuted ? '\uD83D\uDD07' : '\uD83D\uDD0A';
  sfx.buttonPress();
});
document.body.appendChild(muteBtn);

let currentScreen: BaseScreen | null = null;
let isSwitching = false;

function createScreen(id: ScreenID): BaseScreen {
  switch (id) {
    case 'home': return new HomeScreen(store, audio);
    case 'character-select': return new CharacterSelectScreen(store, audio);
    case 'market-select': return new MarketSelectScreen(store, audio);
    case 'trading': return new TradingScreen(store, audio);
    case 'timeskip': return new TimeskipScreen(store, audio);
    case 'results': return new ResultsScreen(store, audio);
    case 'multiplayer-arena': return new MultiplayerArenaScreen(store, audio);
    case 'leaderboard': return new LeaderboardScreen(store, audio);
  }
}

async function switchScreen(newScreenId: ScreenID): Promise<void> {
  if (isSwitching) return;
  isSwitching = true;

  try {
    await transition.dissolveOut(300);

    if (currentScreen) {
      currentScreen.unmount();
    }

    currentScreen = createScreen(newScreenId);
    currentScreen.mount(app!);

    await transition.dissolveIn(300);
  } finally {
    isSwitching = false;
  }
}

store.subscribe('currentScreen', () => {
  const state = store.getState();
  switchScreen(state.currentScreen);
});

currentScreen = createScreen('home');
currentScreen.mount(app);

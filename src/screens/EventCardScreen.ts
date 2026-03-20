import '../styles/event-card.css';
import type { EventChoice, AnimationState, CharacterID } from '../types';
import { GameStore } from '../state/GameStore';
import { AudioEngine } from '../audio/AudioEngine';
import { SoundEffects } from '../audio/SoundEffects';
import { PixelButton } from '../components/ui/PixelButton';
import { CharacterPixiView } from '../rendering/pixi/CharacterPixiView';
import { SPRITE_FRAMES as AnalystFrames } from '../sprites/characters/AnalystSprite';
import { SPRITE_FRAMES as HustlerFrames } from '../sprites/characters/HustlerSprite';
import { SPRITE_FRAMES as RetireeFrames } from '../sprites/characters/RetireeSprite';
import { SPRITE_FRAMES as StudentFrames } from '../sprites/characters/StudentSprite';
import { GameLoop } from '../engine/GameLoop';

interface BaseScreen {
  mount(container: HTMLElement): void;
  unmount(): void;
}

type SpriteFrameMap = Record<AnimationState, string[][][]>;

export class EventCardScreen implements BaseScreen {
  private store: GameStore;
  private sfx: SoundEffects;
  private audio: AudioEngine;
  private container: HTMLElement | null = null;
  private characterView: CharacterPixiView | null = null;
  private typewriterInterval: ReturnType<typeof setInterval> | null = null;
  private unsubscribes: Array<() => void> = [];

  constructor(store: GameStore, audio: AudioEngine) {
    this.store = store;
    this.audio = audio;
    this.sfx = new SoundEffects(audio);
  }

  mount(container: HTMLElement): void {
    this.container = container;
    container.innerHTML = '';

    const state = this.store.getState();

    // Get the active event from GameLoop
    const engines = (window as unknown as Record<string, unknown>).__gameEngines as
      { gameLoop: GameLoop } | undefined;
    const gameLoop = engines?.gameLoop;
    const activeEvent = gameLoop?.activeEvent;
    const eventStats = gameLoop?.activeEventStats;

    // Determine what to show
    let eventTitle = 'MARKET EVENT';
    let eventSubtitle = 'Something is happening...';
    let eventBody = 'An event has occurred in the market.';
    let eventIcon = '📰';
    let optionALabel = 'OPTION A';
    let optionADesc = 'Choose this option.';
    let optionBLabel = 'OPTION B';
    let optionBDesc = 'Choose this option instead.';
    let emotion: AnimationState = 'excited';

    if (activeEvent) {
      // New backend life event
      eventTitle = activeEvent.title;
      eventSubtitle = activeEvent.chain.toUpperCase() + ' EVENT';
      eventBody = activeEvent.description;
      eventIcon = activeEvent.icon;
      optionALabel = activeEvent.optionA.label;
      optionADesc = activeEvent.optionA.hint;
      optionBLabel = activeEvent.optionB.label;
      optionBDesc = activeEvent.optionB.hint;
      emotion = activeEvent.chain === 'crisis' ? 'panic' : 'excited';
    } else {
      // Fallback for legacy flow
      const round = state.currentRound;
      if (round === 1) {
        eventTitle = 'MARKET RALLY';
        eventSubtitle = 'Your investments are up!';
        eventBody = 'The past year has been good to the markets. Your portfolio has grown. ' +
          'Do you lock in your gains, or stay the course?';
        emotion = 'excited';
        optionALabel = 'HOLD — STAY THE COURSE';
        optionADesc = 'Keep your current investments.';
        optionBLabel = 'TAKE PROFITS';
        optionBDesc = 'Sell half your positions and move to cash.';
      } else if (round === 2) {
        eventTitle = 'MARKET MELTDOWN';
        eventSubtitle = 'A crash shakes the markets!';
        eventBody = 'A sudden economic shock has sent markets tumbling. ' +
          'The urge to sell is overwhelming. But history shows that those who sell at the bottom miss the recovery.';
        emotion = 'panic';
        optionALabel = 'HOLD — STAY INVESTED';
        optionADesc = 'Ride out the storm.';
        optionBLabel = 'SELL EVERYTHING';
        optionBDesc = 'Move everything to cash.';
      } else {
        eventTitle = 'FINAL BELL';
        eventSubtitle = 'The market closes.';
        eventBody = 'Markets have recovered. Your journey is coming to an end. ' +
          'Do you hold until the end or take profits now?';
        emotion = 'typing';
        optionALabel = 'HOLD TO THE END';
        optionADesc = 'Maximum exposure to potential gains.';
        optionBLabel = 'TAKE PROFITS NOW';
        optionBDesc = 'Cash out with a guaranteed return.';
      }
    }

    this.store.dispatch({ type: 'SET_ANIMATION', animation: emotion });

    const overlay = document.createElement('div');
    overlay.className = 'event-card-overlay scanlines';

    const dialogueBox = document.createElement('div');
    dialogueBox.className = 'event-card__dialogue pixel-card';

    const spriteArea = document.createElement('div');
    spriteArea.className = 'event-card__sprite';

    const charContainer = document.createElement('div');
    charContainer.style.width = '128px';
    charContainer.style.height = '128px';

    const spriteMap: Record<CharacterID, SpriteFrameMap> = {
      analyst: AnalystFrames,
      hustler: HustlerFrames,
      retiree: RetireeFrames,
      student: StudentFrames,
    };
    const charId = state.selectedCharacter ?? 'analyst';
    this.characterView = new CharacterPixiView({
      parent: charContainer,
      width: 128,
      height: 128,
      scale: 8,
      frames: spriteMap[charId],
      initialState: emotion,
      cachePrefix: `event_${charId}_`,
      backgroundColor: 0x0d2137,
    });
    this.characterView.mount().catch(console.error);

    const unsub = this.store.subscribe('characterAnimation', () => {
      this.characterView?.setAnimationState(this.store.getState().characterAnimation);
    });
    this.unsubscribes.push(unsub);

    spriteArea.appendChild(charContainer);
    dialogueBox.appendChild(spriteArea);

    const contentArea = document.createElement('div');
    contentArea.className = 'event-card__content';

    const titleEl = document.createElement('h2');
    titleEl.className = 'event-card__title';
    titleEl.textContent = `${eventIcon} ${eventTitle}`;
    contentArea.appendChild(titleEl);

    const subtitleEl = document.createElement('p');
    subtitleEl.className = 'event-card__subtitle';
    subtitleEl.textContent = eventSubtitle;
    contentArea.appendChild(subtitleEl);

    const bodyEl = document.createElement('p');
    bodyEl.className = 'event-card__text-block';
    contentArea.appendChild(bodyEl);

    // Social proof bar (if stats available)
    const socialProof = document.createElement('div');
    socialProof.className = 'event-card__impact';
    socialProof.style.visibility = 'hidden';
    socialProof.dataset.reserved = 'true';
    contentArea.appendChild(socialProof);

    const choicesContainer = document.createElement('div');
    choicesContainer.className = 'event-card__choices';
    choicesContainer.style.visibility = 'hidden';
    choicesContainer.dataset.reserved = 'true';
    contentArea.appendChild(choicesContainer);

    // Typewriter effect
    let charIndex = 0;
    const fullText = eventBody;
    this.typewriterInterval = setInterval(() => {
      if (charIndex < fullText.length) {
        bodyEl.textContent = fullText.slice(0, charIndex + 1);
        charIndex++;
        this.sfx.typewriterTick();
      } else {
        if (this.typewriterInterval) {
          clearInterval(this.typewriterInterval);
          this.typewriterInterval = null;
        }
        this.showChoices(
          socialProof, choicesContainer,
          eventStats, activeEvent !== null,
          optionALabel, optionADesc, optionBLabel, optionBDesc,
          gameLoop,
        );
      }
    }, 40);

    bodyEl.addEventListener('click', () => {
      if (this.typewriterInterval) {
        clearInterval(this.typewriterInterval);
        this.typewriterInterval = null;
      }
      bodyEl.textContent = fullText;
      this.showChoices(
        socialProof, choicesContainer,
        eventStats, activeEvent !== null,
        optionALabel, optionADesc, optionBLabel, optionBDesc,
        gameLoop,
      );
    });

    dialogueBox.appendChild(contentArea);
    overlay.appendChild(dialogueBox);
    container.appendChild(overlay);
  }

  private showChoices(
    socialProof: HTMLElement,
    choicesContainer: HTMLElement,
    eventStats: { option_a_count: number; option_b_count: number } | null | undefined,
    isNewEvent: boolean,
    optionALabel: string,
    optionADesc: string,
    optionBLabel: string,
    optionBDesc: string,
    gameLoop: GameLoop | undefined,
  ): void {
    if (socialProof.dataset.filled === 'true') return;

    // Social proof
    if (eventStats) {
      const total = eventStats.option_a_count + eventStats.option_b_count;
      if (total > 0) {
        const aPct = Math.round((eventStats.option_a_count / total) * 100);
        const bPct = 100 - aPct;
        socialProof.innerHTML = '';
        const proofText = document.createElement('span');
        proofText.style.cssText = `
          font-family: 'VT323', monospace; font-size: 16px; color: #8899aa;
        `;
        proofText.textContent = `${total} players faced this:  ${aPct}% chose A  •  ${bPct}% chose B`;
        socialProof.appendChild(proofText);

        // Progress bar
        const bar = document.createElement('div');
        bar.style.cssText = `
          width: 100%; height: 8px; background: #1e3a5f; border-radius: 4px;
          overflow: hidden; margin-top: 4px;
        `;
        const fill = document.createElement('div');
        fill.style.cssText = `
          height: 100%; width: ${aPct}%; background: linear-gradient(90deg, #40c4ff, #00e676);
          transition: width 0.5s ease;
        `;
        bar.appendChild(fill);
        socialProof.appendChild(bar);
      }
    }
    socialProof.dataset.filled = 'true';
    socialProof.style.visibility = 'visible';

    // Choice buttons
    choicesContainer.innerHTML = '';

    // Option A
    const choiceA = document.createElement('div');
    choiceA.className = 'event-card__choice';
    const btnA = new PixelButton(optionALabel, () => {
      this.sfx.buttonPress();
      if (isNewEvent && gameLoop) {
        gameLoop.chooseEventOption('a');
        // After a short delay, go back to trading
        setTimeout(() => {
          this.store.dispatch({ type: 'SET_SCREEN', screen: 'trading' });
        }, 800);
      } else {
        this.handleLegacyChoice('hold');
      }
    }, 'default', false);
    choiceA.appendChild(btnA.getElement());
    const descA = document.createElement('p');
    descA.className = 'event-card__choice-desc';
    descA.textContent = optionADesc;
    choiceA.appendChild(descA);
    choicesContainer.appendChild(choiceA);

    // Option B
    const choiceB = document.createElement('div');
    choiceB.className = 'event-card__choice';
    const btnB = new PixelButton(optionBLabel, () => {
      this.sfx.buttonPress();
      if (isNewEvent && gameLoop) {
        gameLoop.chooseEventOption('b');
        setTimeout(() => {
          this.store.dispatch({ type: 'SET_SCREEN', screen: 'trading' });
        }, 800);
      } else {
        this.handleLegacyChoice('sell-everything');
      }
    }, 'red', false);
    choiceB.appendChild(btnB.getElement());
    const descB = document.createElement('p');
    descB.className = 'event-card__choice-desc';
    descB.textContent = optionBDesc;
    choiceB.appendChild(descB);
    choicesContainer.appendChild(choiceB);

    choicesContainer.style.visibility = 'visible';
  }

  private handleLegacyChoice(choice: EventChoice): void {
    const state = this.store.getState();
    const round = state.currentRound;
    this.store.dispatch({ type: 'RESOLVE_EVENT_CARD', choice });

    if (choice === 'sell-everything') {
      this.store.dispatch({ type: 'SET_ANIMATION', animation: 'panic' });
      this.sfx.crashBuzz();
    } else if (choice === 'buy-more') {
      this.store.dispatch({ type: 'SET_ANIMATION', animation: 'excited' });
      this.sfx.coinBlip();
    } else {
      this.store.dispatch({ type: 'SET_ANIMATION', animation: 'typing' });
    }

    if (round >= 3) {
      this.store.dispatch({ type: 'FINISH_GAME' });
    } else {
      this.store.dispatch({ type: 'SET_SCREEN', screen: 'trading' });
    }
  }

  unmount(): void {
    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
      this.typewriterInterval = null;
    }
    for (const unsub of this.unsubscribes) {
      unsub();
    }
    this.unsubscribes = [];
    this.characterView?.destroy();
    this.characterView = null;
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

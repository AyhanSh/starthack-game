import '../../styles/event-card.css';
import type { EventChoice, AnimationState, CharacterID } from '../../types';
import { GameStore } from '../../state/GameStore';
import { AudioEngine } from '../../audio/AudioEngine';
import { SoundEffects } from '../../audio/SoundEffects';
import { PixelButton } from './PixelButton';
import { CharacterPixiView } from '../../rendering/pixi/CharacterPixiView';
import { SPRITE_FRAMES as AnalystFrames } from '../../sprites/characters/AnalystSprite';
import { SPRITE_FRAMES as HustlerFrames } from '../../sprites/characters/HustlerSprite';
import { SPRITE_FRAMES as RetireeFrames } from '../../sprites/characters/RetireeSprite';
import { SPRITE_FRAMES as StudentFrames } from '../../sprites/characters/StudentSprite';
import { GameLoop } from '../../engine/GameLoop';

type SpriteFrameMap = Record<AnimationState, string[][][]>;

export interface EventPopupChoicePayload {
  chosen: 'a' | 'b';
  eventTitle?: string;
  chosenLabel?: string;
  optionALabel?: string;
  optionBLabel?: string;
  portfolioBefore: number;
  portfolioAfter: number;
  socialProofPct?: number;
}

export class EventPopup {
  private store: GameStore;
  private sfx: SoundEffects;
  private characterView: CharacterPixiView | null = null;
  private typewriterInterval: ReturnType<typeof setInterval> | null = null;
  private unsubscribes: Array<() => void> = [];
  private overlayEl: HTMLElement | null = null;
  private onDismiss: (() => void) | null = null;
  private onEventChoice?: (payload: EventPopupChoicePayload) => void;

  constructor(
    store: GameStore,
    audio: AudioEngine,
    options?: { onEventChoice?: (payload: EventPopupChoicePayload) => void },
  ) {
    this.store = store;
    this.sfx = new SoundEffects(audio);
    this.onEventChoice = options?.onEventChoice;
  }

  show(container: HTMLElement, onDismiss: () => void): void {
    this.onDismiss = onDismiss;

    const state = this.store.getState();

    const engines = (window as unknown as Record<string, unknown>).__gameEngines as
      { gameLoop: GameLoop } | undefined;
    const gameLoop = engines?.gameLoop;
    const activeEvent = gameLoop?.activeEvent;
    const eventStats = gameLoop?.activeEventStats;

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

    // Backdrop
    const overlay = document.createElement('div');
    overlay.className = 'event-popup-backdrop';
    this.overlayEl = overlay;

    // Popup window
    const popup = document.createElement('div');
    popup.className = 'event-popup pixel-card';

    // Pixel corner decorations
    const corners = ['tl', 'tr', 'bl', 'br'];
    for (const c of corners) {
      const corner = document.createElement('div');
      corner.className = `event-popup__corner event-popup__corner--${c}`;
      popup.appendChild(corner);
    }

    // Header bar
    const header = document.createElement('div');
    header.className = 'event-popup__header';

    const headerLeft = document.createElement('div');
    headerLeft.className = 'event-popup__header-left';

    const iconEl = document.createElement('span');
    iconEl.className = 'event-popup__icon';
    iconEl.textContent = eventIcon;
    headerLeft.appendChild(iconEl);

    const titleEl = document.createElement('h2');
    titleEl.className = 'event-popup__title';
    titleEl.textContent = eventTitle;
    headerLeft.appendChild(titleEl);

    header.appendChild(headerLeft);

    const subtitleEl = document.createElement('p');
    subtitleEl.className = 'event-popup__subtitle';
    subtitleEl.textContent = eventSubtitle;
    header.appendChild(subtitleEl);

    popup.appendChild(header);

    // Body: sprite + text
    const body = document.createElement('div');
    body.className = 'event-popup__body';

    const spriteArea = document.createElement('div');
    spriteArea.className = 'event-popup__sprite';

    const charContainer = document.createElement('div');
    charContainer.style.width = '96px';
    charContainer.style.height = '96px';

    const spriteMap: Record<CharacterID, SpriteFrameMap> = {
      analyst: AnalystFrames,
      hustler: HustlerFrames,
      retiree: RetireeFrames,
      student: StudentFrames,
    };
    const charId = state.selectedCharacter ?? 'analyst';
    this.characterView = new CharacterPixiView({
      parent: charContainer,
      width: 96,
      height: 96,
      scale: 6,
      frames: spriteMap[charId],
      initialState: emotion,
      cachePrefix: `popup_${charId}_`,
      backgroundColor: 0x0d2137,
    });
    this.characterView.mount().catch(console.error);

    const unsub = this.store.subscribe('characterAnimation', () => {
      this.characterView?.setAnimationState(this.store.getState().characterAnimation);
    });
    this.unsubscribes.push(unsub);

    spriteArea.appendChild(charContainer);
    body.appendChild(spriteArea);

    const textArea = document.createElement('div');
    textArea.className = 'event-popup__text-area';

    const bodyEl = document.createElement('p');
    bodyEl.className = 'event-popup__text';
    textArea.appendChild(bodyEl);

    const skipBtn = document.createElement('button');
    skipBtn.className = 'event-popup__skip-btn';
    skipBtn.textContent = '⏩ SKIP';
    skipBtn.style.display = 'none';
    textArea.appendChild(skipBtn);

    body.appendChild(textArea);
    popup.appendChild(body);

    // Social proof (reserved space)
    const socialProof = document.createElement('div');
    socialProof.className = 'event-popup__social';
    socialProof.style.visibility = 'hidden';
    socialProof.dataset.reserved = 'true';
    popup.appendChild(socialProof);

    // Choices (reserved space)
    const choicesContainer = document.createElement('div');
    choicesContainer.className = 'event-popup__choices';
    choicesContainer.style.visibility = 'hidden';
    choicesContainer.dataset.reserved = 'true';
    popup.appendChild(choicesContainer);

    overlay.appendChild(popup);
    container.appendChild(overlay);

    // Animate in
    requestAnimationFrame(() => {
      popup.classList.add('event-popup--visible');
    });

    // Typewriter
    let charIndex = 0;
    const fullText = eventBody;
    
    const skipTypewriter = () => {
      if (this.typewriterInterval) {
        clearInterval(this.typewriterInterval);
        this.typewriterInterval = null;
      }
      bodyEl.textContent = fullText;
      skipBtn.style.display = 'none';
      this.showChoices(
        socialProof, choicesContainer,
        eventStats, activeEvent !== null,
        optionALabel, optionADesc, optionBLabel, optionBDesc,
        gameLoop,
      );
    };

    skipBtn.style.display = 'block';
    skipBtn.addEventListener('click', () => {
      this.sfx.buttonPress();
      skipTypewriter();
    });

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
        skipBtn.style.display = 'none';
        this.showChoices(
          socialProof, choicesContainer,
          eventStats, activeEvent !== null,
          optionALabel, optionADesc, optionBLabel, optionBDesc,
          gameLoop,
        );
      }
    }, 40);

    bodyEl.addEventListener('click', skipTypewriter);
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

        const bar = document.createElement('div');
        bar.style.cssText = `
          width: 100%; height: 8px; background: #1e3a5f; border-radius: 0;
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

    choicesContainer.innerHTML = '';

    const choiceA = document.createElement('div');
    choiceA.className = 'event-popup__choice';
    const btnA = new PixelButton(optionALabel, async () => {
      this.sfx.buttonPress();
      if (isNewEvent && gameLoop) {
        const before = gameLoop.getState()?.totalPortfolio ?? 0;
        const selectedEvent = gameLoop.activeEvent;
        await gameLoop.chooseEventOption('a');
        const after = gameLoop.getState()?.totalPortfolio ?? before;
        this.onEventChoice?.({
          chosen: 'a',
          eventTitle: selectedEvent?.title,
          chosenLabel: selectedEvent?.optionA.label,
          optionALabel: selectedEvent?.optionA.label,
          optionBLabel: selectedEvent?.optionB.label,
          portfolioBefore: before,
          portfolioAfter: after,
          socialProofPct: eventStats
            ? Math.round((eventStats.option_a_count / (eventStats.option_a_count + eventStats.option_b_count || 1)) * 100)
            : undefined,
        });
        this.dismiss(() => {
          setTimeout(() => {
            // nothing — TradingScreen stays mounted
          }, 0);
        });
      } else {
        this.handleLegacyChoice('hold');
      }
    }, 'default', false);
    choiceA.appendChild(btnA.getElement());
    const descA = document.createElement('p');
    descA.className = 'event-popup__choice-desc';
    descA.textContent = optionADesc;
    choiceA.appendChild(descA);
    choicesContainer.appendChild(choiceA);

    const choiceB = document.createElement('div');
    choiceB.className = 'event-popup__choice';
    const btnB = new PixelButton(optionBLabel, async () => {
      this.sfx.buttonPress();
      if (isNewEvent && gameLoop) {
        const before = gameLoop.getState()?.totalPortfolio ?? 0;
        const selectedEvent = gameLoop.activeEvent;
        await gameLoop.chooseEventOption('b');
        const after = gameLoop.getState()?.totalPortfolio ?? before;
        this.onEventChoice?.({
          chosen: 'b',
          eventTitle: selectedEvent?.title,
          chosenLabel: selectedEvent?.optionB.label,
          optionALabel: selectedEvent?.optionA.label,
          optionBLabel: selectedEvent?.optionB.label,
          portfolioBefore: before,
          portfolioAfter: after,
          socialProofPct: eventStats
            ? Math.round((eventStats.option_b_count / (eventStats.option_a_count + eventStats.option_b_count || 1)) * 100)
            : undefined,
        });
        this.dismiss(() => {
          setTimeout(() => {
            // nothing — TradingScreen stays mounted
          }, 0);
        });
      } else {
        this.handleLegacyChoice('sell-everything');
      }
    }, 'red', false);
    choiceB.appendChild(btnB.getElement());
    const descB = document.createElement('p');
    descB.className = 'event-popup__choice-desc';
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
      this.dismiss(() => {
        this.store.dispatch({ type: 'FINISH_GAME' });
      });
    } else {
      this.dismiss();
    }
  }

  private dismiss(afterDismiss?: () => void): void {
    const popup = this.overlayEl?.querySelector('.event-popup');
    if (popup) {
      popup.classList.remove('event-popup--visible');
      popup.classList.add('event-popup--hiding');
    }
    setTimeout(() => {
      this.destroy();
      if (afterDismiss) afterDismiss();
      this.onDismiss?.();
    }, 250);
  }

  destroy(): void {
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
    this.overlayEl?.remove();
    this.overlayEl = null;
  }
}

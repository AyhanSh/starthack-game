import type { CoachTrigger } from '../../engine/coach-prompts';
import type { CoachState } from '../../lib/hooks/useCoach';

interface CoachController {
  subscribe: (listener: (state: Readonly<CoachState>) => void) => () => void;
  dismiss: () => void;
}

const TRIGGER_LABELS: Record<CoachTrigger, string> = {
  game_start: 'Game Start',
  game_end: 'Game Over',
  life_event_before: 'Life Event',
  life_event_after: 'Decision Made',
  market_crash: 'Market Alert',
  market_recovery: 'Market Update',
  panic_rebalance: 'Panic Detected',
  all_in_equity: 'All-In Equity',
  cash_heavy: 'Cash Heavy',
  milestone: 'Milestone',
};

export class CoachPopup {
  private root: HTMLElement | null = null;
  private headerLabel: HTMLElement | null = null;
  private bodyText: HTMLElement | null = null;
  private thinking: HTMLElement | null = null;
  private footer: HTMLElement | null = null;
  private unsubscribe: (() => void) | null = null;
  private controller: CoachController;

  constructor(controller: CoachController) {
    this.controller = controller;
  }

  mount(parent: HTMLElement = document.body): void {
    if (this.root) return;

    const root = document.createElement('div');
    root.className = 'coach-popup';
    root.style.display = 'none';

    const header = document.createElement('div');
    header.className = 'coach-popup__header';

    const title = document.createElement('div');
    title.className = 'coach-popup__title';
    title.textContent = 'AI Coach';
    header.appendChild(title);

    const label = document.createElement('div');
    label.className = 'coach-popup__label';
    header.appendChild(label);
    this.headerLabel = label;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'coach-popup__close';
    closeBtn.type = 'button';
    closeBtn.textContent = 'x';
    closeBtn.addEventListener('click', () => this.controller.dismiss());
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    body.className = 'coach-popup__body';

    const thinking = document.createElement('div');
    thinking.className = 'coach-popup__thinking';
    thinking.textContent = 'Thinking...';
    body.appendChild(thinking);
    this.thinking = thinking;

    const text = document.createElement('p');
    text.className = 'coach-popup__text';
    body.appendChild(text);
    this.bodyText = text;

    const footer = document.createElement('div');
    footer.className = 'coach-popup__footer';
    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'coach-popup__dismiss';
    dismissBtn.type = 'button';
    dismissBtn.textContent = 'Dismiss';
    dismissBtn.addEventListener('click', () => this.controller.dismiss());
    footer.appendChild(dismissBtn);
    this.footer = footer;

    root.appendChild(header);
    root.appendChild(body);
    root.appendChild(footer);
    parent.appendChild(root);
    this.root = root;

    this.unsubscribe = this.controller.subscribe((state) => this.render(state));
  }

  private render(state: Readonly<CoachState>): void {
    if (!this.root || !this.headerLabel || !this.bodyText || !this.thinking || !this.footer) return;
    if (!state.currentMessage && !state.isLoading) {
      this.root.style.display = 'none';
      return;
    }

    this.root.style.display = 'block';
    const trigger = state.currentMessage?.trigger;
    this.headerLabel.textContent = trigger ? TRIGGER_LABELS[trigger] : 'Coach';
    this.thinking.style.display = state.isLoading && !state.currentMessage?.text ? 'block' : 'none';
    this.bodyText.textContent = state.currentMessage?.text || '';
    this.footer.style.display = state.currentMessage && !state.currentMessage.isStreaming ? 'flex' : 'none';
  }

  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.root?.remove();
    this.root = null;
    this.headerLabel = null;
    this.bodyText = null;
    this.thinking = null;
    this.footer = null;
  }
}

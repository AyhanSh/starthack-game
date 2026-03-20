import { NEWS_HEADLINES } from '../../constants/market';

export class NewsTicker {
  private container: HTMLElement;
  private wrapper: HTMLElement;
  private animId: string;

  constructor(container: HTMLElement) {
    this.container = container;
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'news-ticker';
    this.animId = `ticker-${Math.random().toString(36).slice(2, 8)}`;
  }

  render(): void {
    const badge = document.createElement('span');
    badge.className = 'news-ticker__badge';
    badge.textContent = '● LIVE';

    const text = NEWS_HEADLINES.join('   ◆   ');
    const doubledText = `${text}   ◆   ${text}`;

    const span = document.createElement('span');
    span.className = 'news-ticker__content';
    span.textContent = doubledText;
    span.style.animation = `${this.animId} 50s linear infinite`;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes ${this.animId} {
        0%   { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
    `;
    document.head.appendChild(style);

    this.wrapper.appendChild(badge);
    this.wrapper.appendChild(span);
    this.container.appendChild(this.wrapper);
  }

  destroy(): void {
    this.wrapper.remove();
  }
}

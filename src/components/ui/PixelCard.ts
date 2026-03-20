export class PixelCard {
  private container: HTMLElement;
  private card: HTMLElement;
  private content: HTMLElement;
  private selected: boolean = false;
  private accentColor: string;

  constructor(container: HTMLElement, accentColor: string = '#40c4ff') {
    this.container = container;
    this.accentColor = accentColor;

    this.card = document.createElement('div');
    this.card.className = 'pixel-card';
    this.card.style.background = '#111b27';
    this.card.style.border = '3px solid #1e3a5f';
    this.card.style.padding = '16px';
    this.card.style.position = 'relative';
    this.card.style.transition = 'transform 0.15s, box-shadow 0.15s, border-color 0.15s';
    this.card.style.cursor = 'pointer';
    this.card.style.imageRendering = 'pixelated';

    this.content = document.createElement('div');
    this.content.className = 'pixel-card__content';
    this.card.appendChild(this.content);

    this.card.addEventListener('mouseenter', () => {
      if (!this.selected) {
        this.card.style.transform = 'translateY(-4px)';
        this.card.style.boxShadow = `0 0 12px ${this.accentColor}44, 4px 4px 0px #0d2137`;
        this.card.style.borderColor = this.accentColor;
      }
    });

    this.card.addEventListener('mouseleave', () => {
      if (!this.selected) {
        this.card.style.transform = 'translateY(0)';
        this.card.style.boxShadow = '4px 4px 0px #0d2137';
        this.card.style.borderColor = '#1e3a5f';
      }
    });
  }

  getContentElement(): HTMLElement {
    return this.content;
  }

  setSelected(selected: boolean): void {
    this.selected = selected;
    if (selected) {
      this.card.style.borderColor = this.accentColor;
      this.card.style.boxShadow = `0 0 20px ${this.accentColor}66, 4px 4px 0px #0d2137`;
      this.card.style.transform = 'translateY(-4px)';
    } else {
      this.card.style.borderColor = '#1e3a5f';
      this.card.style.boxShadow = '4px 4px 0px #0d2137';
      this.card.style.transform = 'translateY(0)';
    }
  }

  setAccentColor(color: string): void {
    this.accentColor = color;
    if (this.selected) {
      this.card.style.borderColor = color;
      this.card.style.boxShadow = `0 0 20px ${color}66, 4px 4px 0px #0d2137`;
    }
  }

  render(): void {
    this.card.style.boxShadow = '4px 4px 0px #0d2137';
    this.container.appendChild(this.card);
  }

  destroy(): void {
    this.card.remove();
  }
}

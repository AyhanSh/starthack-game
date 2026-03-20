const VARIANT_COLORS: Record<string, { bg: string; shadow: string; text: string }> = {
  default: { bg: '#546e7a', shadow: '#37474f', text: '#e8f4f8' },
  gold: { bg: '#ffd700', shadow: '#b8960f', text: '#0a0e1a' },
  red: { bg: '#ff1744', shadow: '#b2102f', text: '#e8f4f8' },
  blue: { bg: '#40c4ff', shadow: '#0091ea', text: '#0a0e1a' },
};

export class PixelButton {
  private el: HTMLButtonElement;

  constructor(
    text: string,
    onClick: () => void,
    variant: string = 'default',
    large: boolean = false
  ) {
    this.el = document.createElement('button');
    this.el.className = 'pixel-btn';
    this.el.textContent = text;

    const colors = VARIANT_COLORS[variant] ?? VARIANT_COLORS['default'];

    this.el.style.fontFamily = "'Press Start 2P', monospace";
    this.el.style.fontSize = large ? '16px' : '10px';
    this.el.style.padding = large ? '16px 32px' : '10px 20px';
    this.el.style.background = colors.bg;
    this.el.style.color = colors.text;
    this.el.style.border = 'none';
    this.el.style.borderRadius = '0';
    this.el.style.cursor = 'pointer';
    this.el.style.position = 'relative';
    this.el.style.boxShadow = `4px 4px 0px ${colors.shadow}`;
    this.el.style.transition = 'transform 0.05s, box-shadow 0.05s';
    this.el.style.imageRendering = 'pixelated';
    this.el.style.letterSpacing = '1px';
    this.el.style.textTransform = 'uppercase';
    this.el.style.outline = 'none';

    if (large) {
      this.el.classList.add('pixel-btn--large');
    }
    if (variant !== 'default') {
      this.el.classList.add(`pixel-btn--${variant}`);
    }

    this.el.addEventListener('mouseenter', () => {
      if (!this.el.disabled) {
        this.el.style.transform = 'translateY(2px)';
        this.el.style.boxShadow = `2px 2px 0px ${colors.shadow}`;
      }
    });

    this.el.addEventListener('mouseleave', () => {
      if (!this.el.disabled) {
        this.el.style.transform = 'translateY(0)';
        this.el.style.boxShadow = `4px 4px 0px ${colors.shadow}`;
      }
    });

    this.el.addEventListener('mousedown', () => {
      if (!this.el.disabled) {
        this.el.style.transform = 'translateY(4px)';
        this.el.style.boxShadow = 'none';
      }
    });

    this.el.addEventListener('mouseup', () => {
      if (!this.el.disabled) {
        this.el.style.transform = 'translateY(2px)';
        this.el.style.boxShadow = `2px 2px 0px ${colors.shadow}`;
      }
    });

    this.el.addEventListener('click', onClick);
  }

  getElement(): HTMLButtonElement {
    return this.el;
  }

  setDisabled(disabled: boolean): void {
    this.el.disabled = disabled;
    this.el.style.opacity = disabled ? '0.5' : '1';
    this.el.style.cursor = disabled ? 'not-allowed' : 'pointer';
  }

  setText(text: string): void {
    this.el.textContent = text;
  }

  destroy(): void {
    this.el.remove();
  }
}

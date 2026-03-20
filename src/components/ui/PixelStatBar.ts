export class PixelStatBar {
  private container: HTMLElement;
  private wrapper: HTMLElement;
  private fill: HTMLElement;
  private label: string;
  private value: number;
  private color: string;

  constructor(container: HTMLElement, label: string, value: number, color: string) {
    this.container = container;
    this.label = label;
    this.value = Math.max(0, Math.min(100, value));
    this.color = color;

    this.wrapper = document.createElement('div');
    this.wrapper.className = 'pixel-stat-bar';
    this.wrapper.style.marginBottom = '6px';

    this.fill = document.createElement('div');
  }

  render(): void {
    this.wrapper.innerHTML = '';

    const labelRow = document.createElement('div');
    labelRow.className = 'pixel-stat-bar__label-row';
    labelRow.style.display = 'flex';
    labelRow.style.justifyContent = 'space-between';
    labelRow.style.alignItems = 'flex-start';
    labelRow.style.gap = '8px';
    labelRow.style.marginBottom = '4px';

    const nameEl = document.createElement('span');
    nameEl.className = 'pixel-stat-bar__name';
    nameEl.textContent = this.label;
    nameEl.style.fontFamily = "'VT323', monospace";
    nameEl.style.fontSize = '16px';
    nameEl.style.color = '#e8f4f8';
    nameEl.style.flex = '1';
    nameEl.style.minWidth = '0';
    nameEl.style.lineHeight = '1.25';
    nameEl.style.wordBreak = 'break-word';
    nameEl.style.overflowWrap = 'anywhere';

    const valEl = document.createElement('span');
    valEl.className = 'pixel-stat-bar__value';
    valEl.textContent = String(this.value);
    valEl.style.fontFamily = "'Press Start 2P', monospace";
    valEl.style.fontSize = '8px';
    valEl.style.color = this.color;
    valEl.style.flexShrink = '0';
    valEl.style.lineHeight = '1.2';
    valEl.style.paddingTop = '2px';

    labelRow.appendChild(nameEl);
    labelRow.appendChild(valEl);

    const track = document.createElement('div');
    track.style.width = '100%';
    track.style.height = '10px';
    track.style.background = '#1e3a5f';
    track.style.border = '2px solid #0d2137';
    track.style.position = 'relative';
    track.style.overflow = 'hidden';
    track.style.imageRendering = 'pixelated';

    this.fill = document.createElement('div');
    this.fill.style.height = '100%';
    this.fill.style.width = `${this.value}%`;
    this.fill.style.background = this.color;
    this.fill.style.transition = 'width 0.6s ease-out';
    this.fill.style.position = 'relative';

    const shine = document.createElement('div');
    shine.style.position = 'absolute';
    shine.style.top = '0';
    shine.style.left = '0';
    shine.style.right = '0';
    shine.style.height = '3px';
    shine.style.background = 'rgba(255,255,255,0.25)';

    this.fill.appendChild(shine);
    track.appendChild(this.fill);

    this.wrapper.appendChild(labelRow);
    this.wrapper.appendChild(track);
    this.container.appendChild(this.wrapper);
  }

  setValue(value: number): void {
    this.value = Math.max(0, Math.min(100, value));
    this.fill.style.width = `${this.value}%`;
    const valDisplay = this.wrapper.querySelector('.pixel-stat-bar__value');
    if (valDisplay) {
      valDisplay.textContent = String(this.value);
    }
  }

  destroy(): void {
    this.wrapper.remove();
  }
}

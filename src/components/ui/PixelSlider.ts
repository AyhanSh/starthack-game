export class PixelSlider {
  private container: HTMLElement;
  private wrapper: HTMLElement;
  private input: HTMLInputElement;
  private valueLabel: HTMLSpanElement;
  private labelEl: HTMLSpanElement;
  private currentValue: number;
  private onChange: (val: number) => void;

  constructor(
    container: HTMLElement,
    label: string,
    min: number,
    max: number,
    value: number,
    onChange: (val: number) => void
  ) {
    this.container = container;
    this.currentValue = value;
    this.onChange = onChange;

    this.wrapper = document.createElement('div');
    this.wrapper.style.display = 'flex';
    this.wrapper.style.alignItems = 'center';
    this.wrapper.style.gap = '8px';
    this.wrapper.style.padding = '4px 0';

    this.labelEl = document.createElement('span');
    this.labelEl.textContent = label;
    this.labelEl.style.fontFamily = "'VT323', monospace";
    this.labelEl.style.fontSize = '18px';
    this.labelEl.style.color = '#e8f4f8';
    this.labelEl.style.minWidth = '60px';

    this.input = document.createElement('input');
    this.input.type = 'range';
    this.input.min = String(min);
    this.input.max = String(max);
    this.input.value = String(value);
    this.input.style.flex = '1';
    this.input.style.height = '8px';
    this.input.style.appearance = 'none';
    this.input.style.background = '#1e3a5f';
    this.input.style.outline = 'none';
    this.input.style.cursor = 'pointer';
    this.input.style.borderRadius = '0';
    this.input.style.imageRendering = 'pixelated';
    this.applyThumbStyle();

    this.valueLabel = document.createElement('span');
    this.valueLabel.textContent = `${value}%`;
    this.valueLabel.style.fontFamily = "'Press Start 2P', monospace";
    this.valueLabel.style.fontSize = '10px';
    this.valueLabel.style.color = '#ffd700';
    this.valueLabel.style.minWidth = '48px';
    this.valueLabel.style.textAlign = 'right';

    this.input.addEventListener('input', () => {
      this.currentValue = Number(this.input.value);
      this.valueLabel.textContent = `${this.currentValue}%`;
      this.onChange(this.currentValue);
    });

    this.wrapper.appendChild(this.labelEl);
    this.wrapper.appendChild(this.input);
    this.wrapper.appendChild(this.valueLabel);
  }

  private applyThumbStyle(): void {
    const style = document.createElement('style');
    const id = `slider-${Math.random().toString(36).slice(2, 8)}`;
    this.input.id = id;
    style.textContent = `
      #${id}::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 16px;
        height: 16px;
        background: #00e676;
        border: 2px solid #0a0e1a;
        cursor: pointer;
        box-shadow: 2px 2px 0px #00a152;
      }
      #${id}::-moz-range-thumb {
        width: 16px;
        height: 16px;
        background: #00e676;
        border: 2px solid #0a0e1a;
        cursor: pointer;
        box-shadow: 2px 2px 0px #00a152;
        border-radius: 0;
      }
      #${id}::-webkit-slider-runnable-track {
        height: 8px;
        background: #1e3a5f;
      }
      #${id}::-moz-range-track {
        height: 8px;
        background: #1e3a5f;
        border: none;
      }
    `;
    document.head.appendChild(style);
  }

  getValue(): number {
    return this.currentValue;
  }

  setValue(val: number): void {
    this.currentValue = val;
    this.input.value = String(val);
    this.valueLabel.textContent = `${val}%`;
  }

  render(): void {
    this.container.appendChild(this.wrapper);
  }

  destroy(): void {
    this.wrapper.remove();
  }
}

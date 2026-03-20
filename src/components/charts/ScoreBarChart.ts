export class ScoreBarChart {
  private container: HTMLElement;
  private wrapper: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.wrapper = document.createElement('div');
    this.wrapper.style.display = 'flex';
    this.wrapper.style.flexDirection = 'column';
    this.wrapper.style.gap = '8px';
    this.wrapper.style.width = '100%';
  }

  update(scores: Array<{ label: string; value: number; max: number; color: string }>): void {
    this.wrapper.innerHTML = '';

    for (const score of scores) {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '8px';

      const label = document.createElement('span');
      label.textContent = score.label;
      label.style.fontFamily = "'Press Start 2P', monospace";
      label.style.fontSize = '7px';
      label.style.color = '#e8f4f8';
      label.style.minWidth = '120px';
      label.style.textAlign = 'right';
      label.style.textTransform = 'uppercase';

      const barTrack = document.createElement('div');
      barTrack.style.flex = '1';
      barTrack.style.height = '14px';
      barTrack.style.background = '#1e3a5f';
      barTrack.style.border = '2px solid #0d2137';
      barTrack.style.position = 'relative';
      barTrack.style.overflow = 'hidden';

      const fillPct = score.max > 0 ? (score.value / score.max) * 100 : 0;
      const barFill = document.createElement('div');
      barFill.style.height = '100%';
      barFill.style.width = '0%';
      barFill.style.background = score.color;
      barFill.style.transition = 'width 1s ease-out';
      barFill.style.position = 'relative';

      const shine = document.createElement('div');
      shine.style.position = 'absolute';
      shine.style.top = '0';
      shine.style.left = '0';
      shine.style.right = '0';
      shine.style.height = '4px';
      shine.style.background = 'rgba(255,255,255,0.2)';
      barFill.appendChild(shine);

      barTrack.appendChild(barFill);

      const valLabel = document.createElement('span');
      valLabel.textContent = `${score.value}/${score.max}`;
      valLabel.style.fontFamily = "'Press Start 2P', monospace";
      valLabel.style.fontSize = '8px';
      valLabel.style.color = score.color;
      valLabel.style.minWidth = '56px';

      row.appendChild(label);
      row.appendChild(barTrack);
      row.appendChild(valLabel);
      this.wrapper.appendChild(row);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          barFill.style.width = `${fillPct}%`;
        });
      });
    }
  }

  render(): void {
    this.container.appendChild(this.wrapper);
  }

  destroy(): void {
    this.wrapper.remove();
  }
}

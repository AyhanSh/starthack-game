export class ScoreDisplay {
  private container: HTMLElement;
  private wrapper: HTMLElement;
  private scoreEl: HTMLSpanElement | null = null;
  private verdictEl: HTMLParagraphElement | null = null;
  private animFrameId: number = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    this.wrapper = document.createElement('div');
    this.wrapper.style.textAlign = 'center';
    this.wrapper.style.padding = '24px';
  }

  animateTo(score: number, verdict: string): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }

    const duration = 2000;
    const startTime = performance.now();
    let currentDisplay = 0;

    const tick = (now: number): void => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      currentDisplay = Math.round(eased * score);

      if (this.scoreEl) {
        this.scoreEl.textContent = String(currentDisplay);

        if (score >= 85) {
          this.scoreEl.style.color = '#ffd700';
        } else if (score >= 65) {
          this.scoreEl.style.color = '#00e676';
        } else if (score >= 40) {
          this.scoreEl.style.color = '#ffab40';
        } else {
          this.scoreEl.style.color = '#ff1744';
        }
      }

      if (progress < 1) {
        this.animFrameId = requestAnimationFrame(tick);
      } else {
        if (this.verdictEl) {
          this.verdictEl.style.opacity = '1';
          this.verdictEl.textContent = verdict;
        }
      }
    };

    this.animFrameId = requestAnimationFrame(tick);
  }

  render(): void {
    this.wrapper.innerHTML = '';

    const label = document.createElement('div');
    label.textContent = 'YOUR SCORE';
    label.style.fontFamily = "'Press Start 2P', monospace";
    label.style.fontSize = '10px';
    label.style.color = '#546e7a';
    label.style.marginBottom = '8px';
    label.style.letterSpacing = '2px';

    this.scoreEl = document.createElement('span');
    this.scoreEl.textContent = '0';
    this.scoreEl.style.fontFamily = "'Press Start 2P', monospace";
    this.scoreEl.style.fontSize = '64px';
    this.scoreEl.style.color = '#ffd700';
    this.scoreEl.style.display = 'block';
    this.scoreEl.style.marginBottom = '4px';
    this.scoreEl.style.textShadow = '4px 4px 0px #0d2137';

    const outOf = document.createElement('div');
    outOf.textContent = '/ 100';
    outOf.style.fontFamily = "'Press Start 2P', monospace";
    outOf.style.fontSize = '14px';
    outOf.style.color = '#546e7a';
    outOf.style.marginBottom = '16px';

    this.verdictEl = document.createElement('p');
    this.verdictEl.style.fontFamily = "'VT323', monospace";
    this.verdictEl.style.fontSize = '22px';
    this.verdictEl.style.color = '#e8f4f8';
    this.verdictEl.style.maxWidth = '500px';
    this.verdictEl.style.margin = '0 auto';
    this.verdictEl.style.lineHeight = '1.4';
    this.verdictEl.style.opacity = '0';
    this.verdictEl.style.transition = 'opacity 0.8s ease-in';

    this.wrapper.appendChild(label);
    this.wrapper.appendChild(this.scoreEl);
    this.wrapper.appendChild(outOf);
    this.wrapper.appendChild(this.verdictEl);

    this.container.appendChild(this.wrapper);
  }

  destroy(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.wrapper.remove();
  }
}

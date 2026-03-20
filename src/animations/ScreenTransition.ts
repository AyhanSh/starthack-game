export class ScreenTransition {
  private container: HTMLElement;
  private overlay: HTMLDivElement | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  async dissolveOut(duration = 500): Promise<void> {
    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 9999;
      background: #0a0e1a; opacity: 0;
      pointer-events: all;
    `;
    this.container.appendChild(this.overlay);

    const canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.cssText = 'position: absolute; inset: 0; width: 100%; height: 100%;';
    this.overlay.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pixelSize = 8;
    const cols = Math.ceil(canvas.width / pixelSize);
    const rows = Math.ceil(canvas.height / pixelSize);
    const totalPixels = cols * rows;
    const indices = Array.from({ length: totalPixels }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const pixelsPerFrame = Math.ceil(totalPixels / (duration / 16));
    let filled = 0;

    return new Promise((resolve) => {
      const animate = (): void => {
        ctx.fillStyle = '#0a0e1a';
        for (let i = 0; i < pixelsPerFrame && filled < totalPixels; i++, filled++) {
          const idx = indices[filled];
          const x = (idx % cols) * pixelSize;
          const y = Math.floor(idx / cols) * pixelSize;
          ctx.fillRect(x, y, pixelSize, pixelSize);
        }
        if (filled < totalPixels) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      requestAnimationFrame(animate);
    });
  }

  async dissolveIn(duration = 500): Promise<void> {
    if (!this.overlay) return;
    const canvas = this.overlay.querySelector('canvas');
    if (!canvas) {
      this.overlay.remove();
      this.overlay = null;
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pixelSize = 8;
    const cols = Math.ceil(canvas.width / pixelSize);
    const rows = Math.ceil(canvas.height / pixelSize);
    const totalPixels = cols * rows;
    const indices = Array.from({ length: totalPixels }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const pixelsPerFrame = Math.ceil(totalPixels / (duration / 16));
    let cleared = 0;

    return new Promise((resolve) => {
      const animate = (): void => {
        for (let i = 0; i < pixelsPerFrame && cleared < totalPixels; i++, cleared++) {
          const idx = indices[cleared];
          const x = (idx % cols) * pixelSize;
          const y = Math.floor(idx / cols) * pixelSize;
          ctx.clearRect(x, y, pixelSize, pixelSize);
        }
        if (cleared < totalPixels) {
          requestAnimationFrame(animate);
        } else {
          this.overlay?.remove();
          this.overlay = null;
          resolve();
        }
      };
      requestAnimationFrame(animate);
    });
  }

  async transition(callback: () => void, duration = 400): Promise<void> {
    await this.dissolveOut(duration);
    callback();
    await this.dissolveIn(duration);
  }
}

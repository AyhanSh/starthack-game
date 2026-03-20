export class TimeskipAnimation {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  async play(label: string, duration = 3500): Promise<void> {
    const overlay = document.createElement('div');
    overlay.className = 'timeskip-overlay';
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 10000;
      background: #0a0e1a; display: flex;
      flex-direction: column; align-items: center; justify-content: center;
      pointer-events: all;
    `;
    this.container.appendChild(overlay);

    await this.dissolvePhase(overlay, duration * 0.15);
    await this.clockPhase(overlay, duration * 0.25);
    await this.calendarPhase(overlay, duration * 0.2);
    await this.labelPhase(overlay, label, duration * 0.3);
    await this.dissolveOutPhase(overlay, duration * 0.1);

    overlay.remove();
  }

  private dissolvePhase(overlay: HTMLElement, duration: number): Promise<void> {
    const canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.cssText = 'position: absolute; inset: 0;';
    overlay.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return Promise.resolve();

    return new Promise((resolve) => {
      const start = performance.now();
      const animate = (now: number): void => {
        const progress = Math.min((now - start) / duration, 1);
        ctx.fillStyle = '#0a0e1a';
        const pixelSize = 6;
        const cols = Math.ceil(canvas.width / pixelSize);
        const count = Math.floor(cols * (canvas.height / pixelSize) * progress * 0.3);
        for (let i = 0; i < count; i++) {
          const x = Math.floor(Math.random() * canvas.width / pixelSize) * pixelSize;
          const y = Math.floor(Math.random() * canvas.height / pixelSize) * pixelSize;
          ctx.fillRect(x, y, pixelSize, pixelSize);
        }
        if (progress < 1) requestAnimationFrame(animate);
        else { canvas.remove(); resolve(); }
      };
      requestAnimationFrame(animate);
    });
  }

  private clockPhase(overlay: HTMLElement, duration: number): Promise<void> {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    canvas.style.cssText = 'image-rendering: pixelated;';
    overlay.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return Promise.resolve();

    return new Promise((resolve) => {
      const start = performance.now();
      const animate = (now: number): void => {
        const progress = Math.min((now - start) / duration, 1);
        ctx.clearRect(0, 0, 200, 200);

        ctx.fillStyle = '#1e3a5f';
        ctx.beginPath();
        ctx.arc(100, 100, 80, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0d2137';
        ctx.beginPath();
        ctx.arc(100, 100, 72, 0, Math.PI * 2);
        ctx.fill();

        for (let i = 0; i < 12; i++) {
          const angle = (i * Math.PI * 2) / 12 - Math.PI / 2;
          ctx.fillStyle = '#ffd700';
          ctx.fillRect(100 + Math.cos(angle) * 62, 100 + Math.sin(angle) * 62, 4, 4);
        }

        const handAngle = progress * Math.PI * 12 - Math.PI / 2;
        ctx.strokeStyle = '#e8f4f8';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(100, 100);
        ctx.lineTo(100 + Math.cos(handAngle) * 55, 100 + Math.sin(handAngle) * 55);
        ctx.stroke();

        const minuteAngle = progress * Math.PI * 120 - Math.PI / 2;
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(100, 100);
        ctx.lineTo(100 + Math.cos(minuteAngle) * 45, 100 + Math.sin(minuteAngle) * 45);
        ctx.stroke();

        if (progress < 1) requestAnimationFrame(animate);
        else { canvas.remove(); resolve(); }
      };
      requestAnimationFrame(animate);
    });
  }

  private calendarPhase(overlay: HTMLElement, duration: number): Promise<void> {
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

    return new Promise((resolve) => {
      let index = 0;
      const pageEl = document.createElement('div');
      pageEl.style.cssText = `
        font-family: 'Press Start 2P', monospace;
        font-size: 24px; color: #ffd700;
        text-align: center; transition: all 0.15s ease;
      `;
      overlay.appendChild(pageEl);

      const interval = setInterval(() => {
        pageEl.textContent = months[index % 12];
        pageEl.style.transform = `translateY(-${index * 5}px) rotate(${(Math.random() - 0.5) * 10}deg)`;
        pageEl.style.opacity = String(Math.max(0.3, 1 - (index % 12) * 0.05));
        index++;
        if (index * (duration / 24) >= duration) {
          clearInterval(interval);
          pageEl.remove();
          resolve();
        }
      }, duration / 24);
    });
  }

  private labelPhase(overlay: HTMLElement, label: string, duration: number): Promise<void> {
    const labelEl = document.createElement('div');
    labelEl.style.cssText = `
      font-family: 'Press Start 2P', monospace;
      font-size: 20px; color: #e8f4f8;
      text-align: center; white-space: pre;
      text-shadow: 0 0 20px rgba(64,196,255,0.5);
    `;
    overlay.appendChild(labelEl);

    return new Promise((resolve) => {
      let charIndex = 0;
      const charDelay = Math.min(80, (duration * 0.7) / label.length);
      const interval = setInterval(() => {
        labelEl.textContent = label.slice(0, charIndex + 1);
        charIndex++;
        if (charIndex >= label.length) {
          clearInterval(interval);
          setTimeout(() => {
            labelEl.remove();
            resolve();
          }, duration * 0.3);
        }
      }, charDelay);
    });
  }

  private dissolveOutPhase(overlay: HTMLElement, duration: number): Promise<void> {
    return new Promise((resolve) => {
      overlay.style.transition = `opacity ${duration}ms ease`;
      overlay.style.opacity = '0';
      setTimeout(resolve, duration);
    });
  }
}

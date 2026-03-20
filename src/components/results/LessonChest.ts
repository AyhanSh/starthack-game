export class LessonChest {
  private container: HTMLElement;
  private wrapper: HTMLElement;
  private title: string;
  private lessonText: string;
  private isOpen: boolean = false;

  constructor(container: HTMLElement, title: string, lessonText: string) {
    this.container = container;
    this.title = title;
    this.lessonText = lessonText;
    this.wrapper = document.createElement('div');
  }

  private drawChest(canvas: HTMLCanvasElement, open: boolean): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const s = 4;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const bodyColor = '#8B4513';
    const darkWood = '#5C2E00';
    const metalColor = '#ffd700';
    const metalDark = '#b8960f';
    const lockColor = '#C0C0C0';

    if (open) {
      ctx.fillStyle = darkWood;
      for (let x = 2; x <= 13; x++) ctx.fillRect(x * s, 2 * s, s, s);

      ctx.fillStyle = bodyColor;
      for (let y = 3; y <= 5; y++) {
        for (let x = 1; x <= 14; x++) ctx.fillRect(x * s, y * s, s, s);
      }
      ctx.fillStyle = darkWood;
      for (let x = 1; x <= 14; x++) ctx.fillRect(x * s, 3 * s, s, s);

      ctx.fillStyle = metalColor;
      ctx.fillRect(7 * s, 3 * s, s, s);
      ctx.fillRect(8 * s, 3 * s, s, s);

      ctx.fillStyle = '#ffd700';
      for (let x = 3; x <= 12; x++) {
        ctx.fillRect(x * s, 4 * s, s, s);
      }

      ctx.fillStyle = bodyColor;
      for (let y = 6; y <= 10; y++) {
        for (let x = 1; x <= 14; x++) ctx.fillRect(x * s, y * s, s, s);
      }

      ctx.fillStyle = metalColor;
      for (let x = 1; x <= 14; x++) ctx.fillRect(x * s, 6 * s, s, s);

      ctx.fillStyle = metalDark;
      ctx.fillRect(1 * s, 8 * s, s, s);
      ctx.fillRect(14 * s, 8 * s, s, s);

      ctx.fillStyle = lockColor;
      ctx.fillRect(7 * s, 7 * s, 2 * s, 2 * s);
    } else {
      ctx.fillStyle = bodyColor;
      for (let y = 4; y <= 6; y++) {
        for (let x = 1; x <= 14; x++) ctx.fillRect(x * s, y * s, s, s);
      }

      ctx.fillStyle = metalColor;
      for (let x = 1; x <= 14; x++) ctx.fillRect(x * s, 4 * s, s, s);

      ctx.fillStyle = darkWood;
      for (let x = 1; x <= 14; x++) ctx.fillRect(x * s, 5 * s, s, s);

      ctx.fillStyle = bodyColor;
      for (let y = 7; y <= 10; y++) {
        for (let x = 1; x <= 14; x++) ctx.fillRect(x * s, y * s, s, s);
      }

      ctx.fillStyle = metalColor;
      for (let x = 1; x <= 14; x++) ctx.fillRect(x * s, 7 * s, s, s);

      ctx.fillStyle = metalDark;
      ctx.fillRect(1 * s, 9 * s, s, s);
      ctx.fillRect(14 * s, 9 * s, s, s);

      ctx.fillStyle = lockColor;
      ctx.fillRect(7 * s, 8 * s, 2 * s, 2 * s);
    }
  }

  render(): void {
    this.wrapper.innerHTML = '';
    this.wrapper.className = 'lesson-chest';
    this.wrapper.style.perspective = '600px';
    this.wrapper.style.cursor = 'pointer';

    const flipper = document.createElement('div');
    flipper.className = 'lesson-chest__flipper';
    flipper.style.minHeight = '200px';

    const front = document.createElement('div');
    front.className = 'lesson-chest__face';
    front.style.padding = '12px';
    front.style.background = '#111b27';
    front.style.border = '3px solid #1e3a5f';
    front.style.boxShadow = '4px 4px 0px #0d2137';

    const closedCanvas = document.createElement('canvas');
    closedCanvas.width = 64;
    closedCanvas.height = 48;
    closedCanvas.style.width = '128px';
    closedCanvas.style.height = '96px';
    closedCanvas.style.imageRendering = 'pixelated';
    this.drawChest(closedCanvas, false);

    const frontTitle = document.createElement('div');
    frontTitle.textContent = this.title;
    frontTitle.style.fontFamily = "'Press Start 2P', monospace";
    frontTitle.style.fontSize = '8px';
    frontTitle.style.color = '#ffd700';
    frontTitle.style.marginTop = '8px';
    frontTitle.style.textAlign = 'center';

    const tapHint = document.createElement('div');
    tapHint.textContent = 'CLICK TO OPEN';
    tapHint.style.fontFamily = "'VT323', monospace";
    tapHint.style.fontSize = '14px';
    tapHint.style.color = '#546e7a';
    tapHint.style.marginTop = '6px';

    front.appendChild(closedCanvas);
    front.appendChild(frontTitle);
    front.appendChild(tapHint);

    const back = document.createElement('div');
    back.className = 'lesson-chest__face lesson-chest__face--back';
    back.style.padding = '12px';
    back.style.background = '#111b27';
    back.style.border = '3px solid #ffd700';
    back.style.boxShadow = '0 0 12px rgba(255, 215, 0, 0.3), 4px 4px 0px #0d2137';

    const openCanvas = document.createElement('canvas');
    openCanvas.width = 64;
    openCanvas.height = 48;
    openCanvas.style.width = '128px';
    openCanvas.style.height = '96px';
    openCanvas.style.imageRendering = 'pixelated';
    this.drawChest(openCanvas, true);

    const backTitle = document.createElement('div');
    backTitle.textContent = this.title;
    backTitle.style.fontFamily = "'Press Start 2P', monospace";
    backTitle.style.fontSize = '8px';
    backTitle.style.color = '#ffd700';
    backTitle.style.marginTop = '8px';
    backTitle.style.textAlign = 'center';

    const lessonEl = document.createElement('p');
    lessonEl.className = 'lesson-chest__lesson';
    lessonEl.textContent = this.lessonText;
    lessonEl.style.fontFamily = "'VT323', monospace";
    lessonEl.style.fontSize = '16px';
    lessonEl.style.color = '#e8f4f8';
    lessonEl.style.marginTop = '8px';
    lessonEl.style.lineHeight = '1.3';
    lessonEl.style.textAlign = 'center';
    lessonEl.style.opacity = '0';
    lessonEl.style.transition = 'opacity 0.5s ease-in 0.3s';

    back.appendChild(openCanvas);
    back.appendChild(backTitle);
    back.appendChild(lessonEl);

    flipper.appendChild(front);
    flipper.appendChild(back);

    this.wrapper.addEventListener('click', () => {
      if (!this.isOpen) {
        this.isOpen = true;
        flipper.style.transform = 'rotateY(180deg)';
        lessonEl.style.opacity = '1';
      }
    });

    this.wrapper.appendChild(flipper);
    this.container.appendChild(this.wrapper);

    const syncFlipperHeight = (): void => {
      const minH = 200;
      const h = Math.max(minH, front.scrollHeight, back.scrollHeight);
      flipper.style.minHeight = `${h}px`;
      flipper.style.height = `${h}px`;
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(syncFlipperHeight);
    });
  }

  destroy(): void {
    this.wrapper.remove();
  }
}

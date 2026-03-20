import { PixelRenderer } from '../rendering/PixelRenderer';

export class RoomAnimations {
  private steamParticles: Array<{ x: number; y: number; opacity: number; speed: number }> = [];
  private monitorFlicker = 1.0;
  private clockAngle = 0;

  constructor() {
    for (let i = 0; i < 3; i++) {
      this.steamParticles.push({
        x: 42 + (Math.random() - 0.5) * 2,
        y: 50 - i * 3,
        opacity: 1 - i * 0.3,
        speed: 0.3 + Math.random() * 0.2,
      });
    }
  }

  update(deltaMs: number): void {
    for (const p of this.steamParticles) {
      p.y -= p.speed * (deltaMs / 50);
      p.opacity -= 0.01 * (deltaMs / 50);
      p.x += (Math.random() - 0.5) * 0.3;

      if (p.opacity <= 0 || p.y < 40) {
        p.y = 50;
        p.x = 42 + (Math.random() - 0.5) * 2;
        p.opacity = 1;
      }
    }

    this.monitorFlicker = 0.85 + Math.random() * 0.15;
    this.clockAngle += (deltaMs / 1000) * Math.PI * 2 / 60;
  }

  drawSteam(renderer: PixelRenderer): void {
    for (const p of this.steamParticles) {
      if (p.opacity > 0) {
        const alpha = Math.floor(p.opacity * 255);
        const hex = alpha.toString(16).padStart(2, '0');
        renderer.drawCell(Math.floor(p.x), Math.floor(p.y), `#e8f4f8${hex}`);
      }
    }
  }

  drawMonitorGlow(renderer: PixelRenderer, mx: number, my: number, mw: number, mh: number): void {
    const brightness = Math.floor(this.monitorFlicker * 40);
    const glow = `#00e676${brightness.toString(16).padStart(2, '0')}`;
    renderer.drawRect(mx + 1, my + 1, mw - 2, mh - 2, glow);
  }

  drawClockHands(renderer: PixelRenderer, cx: number, cy: number, radius: number): void {
    const hourAngle = this.clockAngle;
    const minuteAngle = this.clockAngle * 12;

    const hx = cx + Math.round(Math.cos(hourAngle - Math.PI / 2) * (radius * 0.5));
    const hy = cy + Math.round(Math.sin(hourAngle - Math.PI / 2) * (radius * 0.5));
    renderer.drawCell(hx, hy, '#e8f4f8');

    const mx = cx + Math.round(Math.cos(minuteAngle - Math.PI / 2) * (radius * 0.7));
    const my = cy + Math.round(Math.sin(minuteAngle - Math.PI / 2) * (radius * 0.7));
    renderer.drawCell(mx, my, '#ffd700');

    renderer.drawCell(cx, cy, '#ff1744');
  }

  getMonitorFlicker(): number {
    return this.monitorFlicker;
  }
}

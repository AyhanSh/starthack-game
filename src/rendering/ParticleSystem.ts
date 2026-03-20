import { PixelRenderer } from './PixelRenderer';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
  gravity: number;
  bounce: number;
}

type ParticleType = 'coins' | 'crash' | 'confetti' | 'rain' | 'steam';

export class ParticleSystem {
  private particles: Particle[] = [];
  private renderer: PixelRenderer;

  constructor(renderer: PixelRenderer) {
    this.renderer = renderer;
  }

  emit(type: ParticleType, x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle(type, x, y));
    }
  }

  private createParticle(type: ParticleType, x: number, y: number): Particle {
    switch (type) {
      case 'coins':
        return {
          x, y,
          vx: (Math.random() - 0.5) * 3,
          vy: -Math.random() * 4 - 2,
          color: Math.random() > 0.5 ? '#ffd700' : '#ffab40',
          life: 0, maxLife: 60, size: 2,
          gravity: 0.1, bounce: 0.5,
        };
      case 'crash':
        return {
          x, y,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.5) * 6,
          color: Math.random() > 0.5 ? '#ff1744' : '#ff5252',
          life: 0, maxLife: 40, size: 1,
          gravity: 0, bounce: 0,
        };
      case 'confetti':
        return {
          x: x + (Math.random() - 0.5) * 100,
          y: y - 20,
          vx: (Math.random() - 0.5) * 2,
          vy: Math.random() * 1.5 + 0.5,
          color: ['#ff1744', '#00e676', '#40c4ff', '#ffd700', '#ce93d8', '#ffab40'][Math.floor(Math.random() * 6)],
          life: 0, maxLife: 120, size: 1,
          gravity: 0.02, bounce: 0,
        };
      case 'rain':
        return {
          x: x + Math.random() * 120,
          y: y - 10,
          vx: -0.3,
          vy: Math.random() * 1.5 + 1,
          color: '#546e7a',
          life: 0, maxLife: 80, size: 1,
          gravity: 0, bounce: 0,
        };
      case 'steam':
        return {
          x: x + (Math.random() - 0.5) * 3,
          y,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -Math.random() * 0.5 - 0.3,
          color: '#e8f4f8',
          life: 0, maxLife: 30, size: 1,
          gravity: 0, bounce: 0,
        };
    }
  }

  update(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.life++;

      if (p.bounce > 0 && p.y > 80) {
        p.vy = -p.vy * p.bounce;
        p.y = 80;
      }

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(): void {
    for (const p of this.particles) {
      const alpha = 1 - p.life / p.maxLife;
      if (alpha <= 0) continue;
      const r = parseInt(p.color.slice(1, 3), 16);
      const g = parseInt(p.color.slice(3, 5), 16);
      const b = parseInt(p.color.slice(5, 7), 16);
      const fadedColor = `rgba(${r},${g},${b},${alpha})`;
      const ctx = this.renderer.getContext();
      const cs = this.renderer.getCellSize();
      ctx.fillStyle = fadedColor;
      ctx.fillRect(p.x * cs, p.y * cs, p.size * cs, p.size * cs);
    }
  }

  clear(): void {
    this.particles = [];
  }

  hasParticles(): boolean {
    return this.particles.length > 0;
  }
}

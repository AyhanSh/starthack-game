import { Chart, registerables } from 'chart.js';
import type { ProjectionResult } from '../../types';

Chart.register(...registerables);

function formatCHF(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return v.toFixed(0);
}

export class ProjectionChart {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private chart: Chart | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
  }

  render(): void {
    this.container.appendChild(this.canvas);
  }

  update(projection: ProjectionResult): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    this.canvas.remove();
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.container.appendChild(this.canvas);

    const { p5, p25, p50, p75, p95 } = projection.percentiles;
    const len = p50.length;
    if (len === 0) return;

    const labels = Array.from({ length: len }, (_, i) =>
      i % 3 === 0 ? `Y${Math.floor(i / 12) + 1}` : '',
    );

    this.chart = new Chart(this.canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'P95',
            data: p95,
            borderColor: 'transparent',
            backgroundColor: 'rgba(0,255,135,0.04)',
            pointRadius: 0,
            fill: '+1',
            tension: 0.3,
          },
          {
            label: 'P75',
            data: p75,
            borderColor: 'transparent',
            backgroundColor: 'rgba(0,255,135,0.08)',
            pointRadius: 0,
            fill: '+1',
            tension: 0.3,
          },
          {
            label: 'P50 (Median)',
            data: p50,
            borderColor: '#00ff87',
            borderWidth: 2,
            backgroundColor: 'rgba(0,255,135,0.15)',
            pointRadius: 0,
            fill: '+1',
            tension: 0.3,
          },
          {
            label: 'P25',
            data: p25,
            borderColor: 'transparent',
            backgroundColor: 'rgba(0,255,135,0.08)',
            pointRadius: 0,
            fill: '+1',
            tension: 0.3,
          },
          {
            label: 'P5',
            data: p5,
            borderColor: 'transparent',
            backgroundColor: 'rgba(0,255,135,0.04)',
            pointRadius: 0,
            fill: 'origin',
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            titleFont: { family: "'VT323', monospace", size: 16 },
            bodyFont: { family: "'VT323', monospace", size: 14 },
            backgroundColor: '#111b27',
            borderColor: '#1e3a5f',
            borderWidth: 2,
            callbacks: {
              label(ctx) {
                const val = ctx.parsed?.y ?? 0;
                return `${ctx.dataset.label}: CHF ${formatCHF(val)}`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: {
              font: { family: "'VT323', monospace", size: 11 },
              color: '#4a6580',
              maxTicksLimit: 12,
            },
            grid: { color: 'rgba(26, 51, 85, 0.3)', lineWidth: 1 },
          },
          y: {
            ticks: {
              font: { family: "'VT323', monospace", size: 11 },
              color: '#4a6580',
              callback(value) {
                return `CHF ${formatCHF(Number(value))}`;
              },
            },
            grid: { color: 'rgba(26, 51, 85, 0.3)', lineWidth: 1 },
          },
        },
      },
    });
  }

  destroy(): void {
    this.chart?.destroy();
    this.chart = null;
    this.canvas.remove();
  }
}

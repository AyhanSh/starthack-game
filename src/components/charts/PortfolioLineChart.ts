import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export class PortfolioLineChart {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private chart: Chart | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.imageRendering = 'pixelated';
  }

  update(portfolioData: number[], benchmarkData: number[], labels: string[]): void {
    if (this.chart) {
      this.chart.data.labels = labels;
      this.chart.data.datasets[0].data = portfolioData;
      this.chart.data.datasets[1].data = benchmarkData;
      this.chart.update('none');
      return;
    }

    this.chart = new Chart(this.canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Your Portfolio',
            data: portfolioData,
            borderColor: '#00e676',
            backgroundColor: 'rgba(0, 230, 118, 0.1)',
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: '#00e676',
            fill: true,
            tension: 0.1,
          },
          {
            label: 'Benchmark (60/40)',
            data: benchmarkData,
            borderColor: '#546e7a',
            borderWidth: 2,
            borderDash: [6, 4],
            pointRadius: 0,
            fill: false,
            tension: 0.1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        plugins: {
          legend: {
            labels: {
              font: { family: "'Press Start 2P', monospace", size: 8 },
              color: '#e8f4f8',
              padding: 12,
            },
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
                return `${ctx.dataset.label}: CHF ${val.toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: {
              font: { family: "'VT323', monospace", size: 12 },
              color: '#546e7a',
              maxTicksLimit: 8,
            },
            grid: { color: 'rgba(30, 58, 95, 0.4)' },
          },
          y: {
            ticks: {
              font: { family: "'VT323', monospace", size: 12 },
              color: '#546e7a',
              callback(value) {
                return `${Number(value).toLocaleString('en-US')}`;
              },
            },
            grid: { color: 'rgba(30, 58, 95, 0.4)' },
          },
        },
      },
    });
  }

  render(): void {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.width = '100%';
    wrapper.style.height = '200px';
    wrapper.style.background = '#0c1821';
    wrapper.style.border = '2px solid #1e3a5f';
    wrapper.style.padding = '8px';
    wrapper.appendChild(this.canvas);
    this.container.appendChild(wrapper);
  }

  destroy(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
    this.canvas.remove();
  }
}

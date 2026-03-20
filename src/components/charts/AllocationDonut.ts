import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export class AllocationDonut {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private chart: Chart | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.canvas.style.imageRendering = 'pixelated';
  }

  update(data: Array<{ label: string; value: number; color: string }>): void {
    const labels = data.map((d) => d.label);
    const values = data.map((d) => d.value);
    const colors = data.map((d) => d.color);

    if (this.chart) {
      this.chart.data.labels = labels;
      this.chart.data.datasets[0].data = values;
      this.chart.data.datasets[0].backgroundColor = colors;
      this.chart.update('none');
      return;
    }

    this.chart = new Chart(this.canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: colors,
            borderColor: '#0a0e1a',
            borderWidth: 3,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '55%',
        animation: { animateRotate: true, duration: 400 },
        plugins: {
          legend: {
            position: 'right',
            labels: {
              font: { family: "'Press Start 2P', monospace", size: 7 },
              color: '#e8f4f8',
              padding: 8,
              boxWidth: 12,
              boxHeight: 12,
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
                const val = ctx.parsed;
                return `${ctx.label}: ${val.toFixed(1)}%`;
              },
            },
          },
        },
      },
    });
  }

  render(): void {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.width = '100%';
    wrapper.style.maxWidth = '280px';
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

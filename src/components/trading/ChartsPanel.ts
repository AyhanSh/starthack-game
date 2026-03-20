import { Chart, registerables } from 'chart.js';
import { CandlestickChart } from '../charts/CandlestickChart';
import { AllocationDonut } from '../charts/AllocationDonut';
import { ProjectionChart } from '../charts/ProjectionChart';
import type { ProjectionResult } from '../../types';

Chart.register(...registerables);

type ChartView = 'area' | 'candlestick' | 'bar' | 'allocation' | 'projection';

interface ChartsPanelData {
  portfolioHistory: number[];
  benchmarkHistory: number[];
  positionBreakdown: Array<{ label: string; value: number; color: string }>;
  weeklyReturns: number[];
  projection?: ProjectionResult | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  cash: '#546e7a',
  stocks: '#40c4ff',
  fx: '#ffb74d',
  crypto: '#ce93d8',
  bonds: '#00e676',
  gold: '#ffd700',
};

export class ChartsPanel {
  private container: HTMLElement;
  private wrapper: HTMLElement;
  private activeView: ChartView = 'area';
  private chartHost: HTMLElement;
  private tabBar: HTMLElement;

  private areaChart: Chart | null = null;
  private areaCanvas: HTMLCanvasElement;
  private barChart: Chart | null = null;
  private barCanvas: HTMLCanvasElement;
  private candlestickChart: CandlestickChart | null = null;
  private allocationDonut: AllocationDonut | null = null;
  private projectionChart: ProjectionChart | null = null;

  private lastData: ChartsPanelData | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'charts-panel';

    this.tabBar = document.createElement('div');
    this.tabBar.className = 'charts-panel__tabs';

    this.chartHost = document.createElement('div');
    this.chartHost.className = 'charts-panel__host';

    this.areaCanvas = document.createElement('canvas');
    this.areaCanvas.style.width = '100%';
    this.areaCanvas.style.height = '100%';

    this.barCanvas = document.createElement('canvas');
    this.barCanvas.style.width = '100%';
    this.barCanvas.style.height = '100%';
  }

  render(): void {
    this.buildTabs();
    this.wrapper.appendChild(this.tabBar);
    this.wrapper.appendChild(this.chartHost);
    this.container.appendChild(this.wrapper);
    this.showView(this.activeView);
  }

  update(data: ChartsPanelData): void {
    this.lastData = data;
    this.renderActiveChart();
  }

  private buildTabs(): void {
    const views: Array<{ id: ChartView; label: string; icon: string }> = [
      { id: 'area', label: 'AREA', icon: '📈' },
      { id: 'projection', label: 'PROJ', icon: '🔮' },
      { id: 'candlestick', label: 'CANDLE', icon: '🕯️' },
      { id: 'bar', label: 'RETURNS', icon: '📊' },
      { id: 'allocation', label: 'ALLOC', icon: '🍩' },
    ];

    this.tabBar.innerHTML = '';
    for (const v of views) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'charts-panel__tab' + (v.id === this.activeView ? ' charts-panel__tab--active' : '');
      btn.innerHTML = `<span class="charts-panel__tab-icon">${v.icon}</span>${v.label}`;
      btn.addEventListener('click', () => this.showView(v.id));
      this.tabBar.appendChild(btn);
    }
  }

  private showView(view: ChartView): void {
    this.activeView = view;
    this.buildTabs();
    this.chartHost.innerHTML = '';

    this.renderActiveChart();
  }

  private renderActiveChart(): void {
    this.chartHost.innerHTML = '';

    const canvasWrapper = document.createElement('div');
    canvasWrapper.className = 'charts-panel__canvas-wrapper';

    switch (this.activeView) {
      case 'area':
        this.renderAreaChart(canvasWrapper);
        break;
      case 'candlestick':
        this.renderCandlestickChart(canvasWrapper);
        break;
      case 'bar':
        this.renderBarChart(canvasWrapper);
        break;
      case 'allocation':
        this.renderAllocationChart(canvasWrapper);
        break;
      case 'projection':
        this.renderProjectionChart(canvasWrapper);
        break;
    }

    this.chartHost.appendChild(canvasWrapper);
  }

  private renderAreaChart(host: HTMLElement): void {
    if (this.areaChart) {
      this.areaChart.destroy();
      this.areaChart = null;
    }

    this.areaCanvas = document.createElement('canvas');
    this.areaCanvas.style.width = '100%';
    this.areaCanvas.style.height = '100%';
    host.appendChild(this.areaCanvas);

    const data = this.lastData;
    if (!data || data.portfolioHistory.length === 0) return;

    const labels = data.portfolioHistory.map((_, i) => {
      const year = Math.floor(i / 52) + 1;
      const week = (i % 52) + 1;
      return i % 10 === 0 ? `Y${year}` : '';
    });

    this.areaChart = new Chart(this.areaCanvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Portfolio',
            data: data.portfolioHistory,
            borderColor: '#00e676',
            backgroundColor: 'rgba(0, 230, 118, 0.15)',
            borderWidth: 2,
            pointRadius: 0,
            fill: true,
            tension: 0.3,
          },
          {
            label: 'Benchmark',
            data: data.benchmarkHistory,
            borderColor: '#546e7a',
            borderWidth: 1.5,
            borderDash: [6, 4],
            pointRadius: 0,
            fill: false,
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
            labels: {
              font: { family: "'Press Start 2P', monospace", size: 7 },
              color: '#e8f4f8',
              padding: 10,
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
                return `${ctx.dataset.label}: CHF ${Math.round(val).toLocaleString()}`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: {
              font: { family: "'VT323', monospace", size: 11 },
              color: '#546e7a',
              maxTicksLimit: 10,
            },
            grid: { color: 'rgba(30, 58, 95, 0.3)' },
          },
          y: {
            ticks: {
              font: { family: "'VT323', monospace", size: 11 },
              color: '#546e7a',
              callback(value) {
                return `${Number(value).toLocaleString()}`;
              },
            },
            grid: { color: 'rgba(30, 58, 95, 0.3)' },
          },
        },
      },
    });
  }

  private renderCandlestickChart(host: HTMLElement): void {
    const data = this.lastData;
    if (!data || data.portfolioHistory.length === 0) {
      host.innerHTML = '<div style="color:#546e7a;font-family:\'VT323\',monospace;font-size:18px;text-align:center;padding:40px;">Waiting for data...</div>';
      return;
    }

    const candleHost = document.createElement('div');
    candleHost.style.width = '100%';
    candleHost.style.display = 'flex';
    candleHost.style.justifyContent = 'center';

    const chartWidth = Math.min(480, host.clientWidth || 480);
    const chartHeight = 200;

    this.candlestickChart = new CandlestickChart(candleHost, chartWidth, chartHeight);
    this.candlestickChart.update(data.portfolioHistory);
    this.candlestickChart.render();

    const label = document.createElement('div');
    label.style.cssText = "font-family:'Press Start 2P',monospace;font-size:7px;color:#546e7a;text-align:center;margin-top:8px;letter-spacing:1px;";
    label.textContent = 'PORTFOLIO CANDLESTICK';

    host.appendChild(candleHost);
    host.appendChild(label);
  }

  private renderBarChart(host: HTMLElement): void {
    if (this.barChart) {
      this.barChart.destroy();
      this.barChart = null;
    }

    this.barCanvas = document.createElement('canvas');
    this.barCanvas.style.width = '100%';
    this.barCanvas.style.height = '100%';
    host.appendChild(this.barCanvas);

    const data = this.lastData;
    if (!data || data.portfolioHistory.length < 2) return;

    const weeklyReturns: number[] = [];
    const labels: string[] = [];
    const colors: string[] = [];

    const groupSize = Math.max(1, Math.floor(data.portfolioHistory.length / 30));

    for (let i = groupSize; i < data.portfolioHistory.length; i += groupSize) {
      const prev = data.portfolioHistory[i - groupSize];
      const cur = data.portfolioHistory[i];
      const ret = prev > 0 ? ((cur - prev) / prev) * 100 : 0;
      weeklyReturns.push(ret);
      const year = Math.floor(i / 52) + 1;
      labels.push(`Y${year}`);
      colors.push(ret >= 0 ? 'rgba(0, 230, 118, 0.7)' : 'rgba(255, 23, 68, 0.7)');
    }

    this.barChart = new Chart(this.barCanvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Period Return %',
            data: weeklyReturns,
            backgroundColor: colors,
            borderColor: colors.map((c) => c.replace('0.7', '1')),
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: {
            labels: {
              font: { family: "'Press Start 2P', monospace", size: 7 },
              color: '#e8f4f8',
              padding: 10,
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
                return `Return: ${val.toFixed(2)}%`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: {
              font: { family: "'VT323', monospace", size: 10 },
              color: '#546e7a',
              maxTicksLimit: 15,
            },
            grid: { display: false },
          },
          y: {
            ticks: {
              font: { family: "'VT323', monospace", size: 10 },
              color: '#546e7a',
              callback(value) {
                return `${Number(value).toFixed(1)}%`;
              },
            },
            grid: { color: 'rgba(30, 58, 95, 0.3)' },
          },
        },
      },
    });
  }

  private renderAllocationChart(host: HTMLElement): void {
    const data = this.lastData;
    if (!data || data.positionBreakdown.length === 0) {
      host.innerHTML = '<div style="color:#546e7a;font-family:\'VT323\',monospace;font-size:18px;text-align:center;padding:40px;">No allocation data yet</div>';
      return;
    }

    const donutHost = document.createElement('div');
    donutHost.style.display = 'flex';
    donutHost.style.justifyContent = 'center';

    this.allocationDonut = new AllocationDonut(donutHost);
    this.allocationDonut.render();
    this.allocationDonut.update(data.positionBreakdown);

    host.appendChild(donutHost);
  }

  private renderProjectionChart(host: HTMLElement): void {
    const data = this.lastData;
    if (!data?.projection || data.projection.percentiles.p50.length === 0) {
      host.innerHTML = '<div style="color:#546e7a;font-family:\'VT323\',monospace;font-size:18px;text-align:center;padding:40px;">Waiting for projection data...</div>';
      return;
    }

    const projHost = document.createElement('div');
    projHost.style.width = '100%';
    projHost.style.height = '100%';

    this.projectionChart = new ProjectionChart(projHost);
    this.projectionChart.render();
    this.projectionChart.update(data.projection);

    const label = document.createElement('div');
    label.style.cssText = "font-family:'Press Start 2P',monospace;font-size:7px;color:#546e7a;text-align:center;margin-top:8px;letter-spacing:1px;";
    label.textContent = 'MONTE CARLO PROJECTION';

    host.appendChild(projHost);
    host.appendChild(label);
  }

  private getCategoryColor(assetId: string): string {
    if (assetId === 'cash') return CATEGORY_COLORS.cash;
    if (['btc', 'eth', 'sol', 'mooninu'].includes(assetId)) return CATEGORY_COLORS.crypto;
    if (assetId.includes('bond') || assetId.includes('ch_bond')) return CATEGORY_COLORS.bonds;
    if (assetId.includes('gold')) return CATEGORY_COLORS.gold;
    if (assetId.includes('chf') || assetId.includes('eur') || assetId.includes('usd')) return CATEGORY_COLORS.fx;
    return CATEGORY_COLORS.stocks;
  }

  destroy(): void {
    if (this.areaChart) { this.areaChart.destroy(); this.areaChart = null; }
    if (this.barChart) { this.barChart.destroy(); this.barChart = null; }
    this.candlestickChart?.destroy();
    this.allocationDonut?.destroy();
    this.projectionChart?.destroy();
    this.wrapper.remove();
  }
}

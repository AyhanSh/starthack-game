let activeTooltip: HTMLElement | null = null;

export class PixelTooltip {
  static show(target: HTMLElement, text: string): void {
    PixelTooltip.hide();

    const tooltip = document.createElement('div');
    tooltip.className = 'pixel-tooltip';
    tooltip.textContent = text;
    tooltip.style.position = 'absolute';
    tooltip.style.fontFamily = "'VT323', monospace";
    tooltip.style.fontSize = '18px';
    tooltip.style.color = '#0a0e1a';
    tooltip.style.background = '#e8f4f8';
    tooltip.style.padding = '6px 10px';
    tooltip.style.border = '2px solid #0d2137';
    tooltip.style.boxShadow = '3px 3px 0px #546e7a';
    tooltip.style.zIndex = '9999';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.whiteSpace = 'nowrap';
    tooltip.style.imageRendering = 'pixelated';
    tooltip.style.maxWidth = '260px';
    tooltip.style.wordWrap = 'break-word';

    const arrow = document.createElement('div');
    arrow.style.position = 'absolute';
    arrow.style.bottom = '-8px';
    arrow.style.left = '12px';
    arrow.style.width = '0';
    arrow.style.height = '0';
    arrow.style.borderLeft = '6px solid transparent';
    arrow.style.borderRight = '6px solid transparent';
    arrow.style.borderTop = '8px solid #e8f4f8';
    tooltip.appendChild(arrow);

    document.body.appendChild(tooltip);

    const rect = target.getBoundingClientRect();
    tooltip.style.left = `${rect.left + window.scrollX}px`;
    tooltip.style.top = `${rect.top + window.scrollY - tooltip.offsetHeight - 6}px`;

    activeTooltip = tooltip;
  }

  static hide(): void {
    if (activeTooltip) {
      activeTooltip.remove();
      activeTooltip = null;
    }
  }
}

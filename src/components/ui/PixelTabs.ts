export class PixelTabs {
  private container: HTMLElement;
  private tabs: Array<{ id: string; label: string }>;
  private onSelect: (id: string) => void;
  private activeId: string;
  private tabBar: HTMLElement;

  constructor(
    container: HTMLElement,
    tabs: Array<{ id: string; label: string }>,
    onSelect: (id: string) => void
  ) {
    this.container = container;
    this.tabs = tabs;
    this.onSelect = onSelect;
    this.activeId = tabs.length > 0 ? tabs[0].id : '';

    this.tabBar = document.createElement('div');
    this.tabBar.className = 'pixel-tabs pixel-tabs--browser';
  }

  setActive(id: string): void {
    this.activeId = id;
    this.renderButtons();
  }

  private renderButtons(): void {
    this.tabBar.innerHTML = '';

    for (const tab of this.tabs) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = tab.label;
      btn.className = `pixel-tab pixel-tab--browser pixel-tab--${tab.id}`;

      const isActive = tab.id === this.activeId;
      if (isActive) btn.classList.add('pixel-tab--active');

      btn.addEventListener('mouseenter', () => {
        if (tab.id !== this.activeId) {
          btn.classList.add('pixel-tab--hover');
        }
      });

      btn.addEventListener('mouseleave', () => {
        if (tab.id !== this.activeId) {
          btn.classList.remove('pixel-tab--hover');
        }
      });

      btn.addEventListener('click', () => {
        this.activeId = tab.id;
        this.renderButtons();
        this.onSelect(tab.id);
      });

      this.tabBar.appendChild(btn);
    }
  }

  render(): void {
    this.renderButtons();
    this.container.appendChild(this.tabBar);
  }

  destroy(): void {
    this.tabBar.remove();
  }
}

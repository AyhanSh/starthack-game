import '../../styles/tutorial.css';

interface TutorialSlide {
  title: string;
  description: string;
  image: string;
  badge?: string;
}

const SLIDES: TutorialSlide[] = [
  {
    title: 'TRADING TERMINAL',
    badge: 'WELCOME',
    description:
      'This is your command center. Buy and sell stocks, forex, and crypto using the allocation sliders. Track prices, view charts, and manage your portfolio — all from one retro terminal.',
    image: '/tutorial/terminal.png',
  },
  {
    title: 'AI COACH',
    badge: 'GUIDANCE',
    description:
      'Your personal AI wealth coach watches your moves and gives real-time advice. Pay attention to its tips — it will warn you about risky decisions and celebrate your smart plays.',
    image: '/tutorial/ai-coach.png',
  },
  {
    title: 'NEWS BULLETINS',
    badge: 'INFORMATION',
    description:
      'Breaking news flashes on screen when major market events happen. These headlines move prices — read them carefully to anticipate crashes, rallies, and sector shifts.',
    image: '/tutorial/news.png',
  },
  {
    title: 'LIFE EVENTS',
    badge: 'DECISIONS',
    description:
      'Random life events will test your resolve. Career changes, windfalls, and crises force you to make tough financial choices. Each decision has real consequences for your portfolio.',
    image: '/tutorial/events.png',
  },
];

export class TutorialCarousel {
  private overlay: HTMLElement | null = null;
  private currentSlide = 0;
  private onComplete: () => void;
  private dotEls: HTMLElement[] = [];
  private slideTrack: HTMLElement | null = null;
  private prevBtn: HTMLButtonElement | null = null;
  private nextBtn: HTMLButtonElement | null = null;
  private counterEl: HTMLElement | null = null;

  constructor(onComplete: () => void) {
    this.onComplete = onComplete;
  }

  show(container: HTMLElement): void {
    this.currentSlide = 0;

    const overlay = document.createElement('div');
    overlay.className = 'tutorial-overlay';

    const backdrop = document.createElement('div');
    backdrop.className = 'tutorial-backdrop';
    overlay.appendChild(backdrop);

    const modal = document.createElement('div');
    modal.className = 'tutorial-modal';

    // Header
    const header = document.createElement('div');
    header.className = 'tutorial-header';
    const headerTitle = document.createElement('div');
    headerTitle.className = 'tutorial-header__title';
    headerTitle.textContent = '📖 HOW TO PLAY';
    const counter = document.createElement('div');
    counter.className = 'tutorial-header__counter';
    this.counterEl = counter;
    header.appendChild(headerTitle);
    header.appendChild(counter);
    modal.appendChild(header);

    // Slide viewport
    const viewport = document.createElement('div');
    viewport.className = 'tutorial-viewport';

    const track = document.createElement('div');
    track.className = 'tutorial-track';
    this.slideTrack = track;

    for (const slide of SLIDES) {
      track.appendChild(this.buildSlide(slide));
    }

    viewport.appendChild(track);
    modal.appendChild(viewport);

    // Dots
    const dotsRow = document.createElement('div');
    dotsRow.className = 'tutorial-dots';
    this.dotEls = [];
    for (let i = 0; i < SLIDES.length; i++) {
      const dot = document.createElement('button');
      dot.className = 'tutorial-dot';
      dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
      const idx = i;
      dot.addEventListener('click', () => this.goTo(idx));
      dotsRow.appendChild(dot);
      this.dotEls.push(dot);
    }
    modal.appendChild(dotsRow);

    // Footer with nav buttons
    const footer = document.createElement('div');
    footer.className = 'tutorial-footer';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'tutorial-btn tutorial-btn--prev';
    prevBtn.textContent = '← PREV';
    prevBtn.addEventListener('click', () => this.prev());
    this.prevBtn = prevBtn;

    const nextBtn = document.createElement('button');
    nextBtn.className = 'tutorial-btn tutorial-btn--next';
    nextBtn.textContent = 'NEXT →';
    nextBtn.addEventListener('click', () => this.next());
    this.nextBtn = nextBtn;

    footer.appendChild(prevBtn);
    footer.appendChild(nextBtn);
    modal.appendChild(footer);

    overlay.appendChild(modal);
    container.appendChild(overlay);
    this.overlay = overlay;

    this.updateSlide();

    // Entrance animation
    requestAnimationFrame(() => {
      overlay.classList.add('tutorial-overlay--visible');
    });
  }

  private buildSlide(slide: TutorialSlide): HTMLElement {
    const el = document.createElement('div');
    el.className = 'tutorial-slide';

    const imgWrap = document.createElement('div');
    imgWrap.className = 'tutorial-slide__img-wrap';
    const img = document.createElement('img');
    img.className = 'tutorial-slide__img';
    img.src = slide.image;
    img.alt = slide.title;
    img.draggable = false;
    imgWrap.appendChild(img);
    el.appendChild(imgWrap);

    const content = document.createElement('div');
    content.className = 'tutorial-slide__content';

    if (slide.badge) {
      const badge = document.createElement('span');
      badge.className = 'tutorial-slide__badge';
      badge.textContent = slide.badge;
      content.appendChild(badge);
    }

    const title = document.createElement('div');
    title.className = 'tutorial-slide__title';
    title.textContent = slide.title;
    content.appendChild(title);

    const desc = document.createElement('div');
    desc.className = 'tutorial-slide__desc';
    desc.textContent = slide.description;
    content.appendChild(desc);

    el.appendChild(content);
    return el;
  }

  private goTo(index: number): void {
    this.currentSlide = Math.max(0, Math.min(SLIDES.length - 1, index));
    this.updateSlide();
  }

  private prev(): void {
    if (this.currentSlide > 0) {
      this.currentSlide--;
      this.updateSlide();
    }
  }

  private next(): void {
    if (this.currentSlide < SLIDES.length - 1) {
      this.currentSlide++;
      this.updateSlide();
    } else {
      this.dismiss();
    }
  }

  private updateSlide(): void {
    if (this.slideTrack) {
      this.slideTrack.style.transform = `translateX(-${this.currentSlide * 100}%)`;
    }

    for (let i = 0; i < this.dotEls.length; i++) {
      this.dotEls[i].classList.toggle('tutorial-dot--active', i === this.currentSlide);
    }

    if (this.prevBtn) {
      this.prevBtn.style.visibility = this.currentSlide === 0 ? 'hidden' : 'visible';
    }

    if (this.nextBtn) {
      const isLast = this.currentSlide === SLIDES.length - 1;
      this.nextBtn.textContent = isLast ? 'START TRADING →' : 'NEXT →';
      this.nextBtn.classList.toggle('tutorial-btn--start', isLast);
    }

    if (this.counterEl) {
      this.counterEl.textContent = `${this.currentSlide + 1} / ${SLIDES.length}`;
    }
  }

  private dismiss(): void {
    if (!this.overlay) return;
    this.overlay.classList.remove('tutorial-overlay--visible');
    this.overlay.classList.add('tutorial-overlay--exit');
    setTimeout(() => {
      this.overlay?.remove();
      this.overlay = null;
      this.onComplete();
    }, 300);
  }

  destroy(): void {
    this.overlay?.remove();
    this.overlay = null;
  }
}

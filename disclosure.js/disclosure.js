class Disclosure {
  constructor(root, options) {
    this.root = root;
    this.defaults = {
      animation: {
        duration: 300,
        easing: 'ease',
      },
    };
    this.settings = {
      animation: { ...this.defaults.animation, ...options?.animation },
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) this.settings.animation.duration = 0;
    const NOT_NESTED = ':not(:scope summary + * *)';
    this.details = this.root.querySelectorAll(`details${NOT_NESTED}`);
    this.summaries = this.root.querySelectorAll(`summary${NOT_NESTED}`);
    this.contents = this.root.querySelectorAll(`summary${NOT_NESTED} + *`);
    if (!this.details.length || !this.details.length || !this.contents.length) return;
    this.initialize();
  }

  initialize() {
    this.summaries.forEach(summary => {
      summary.addEventListener('click', event => this.handleClick(event));
      summary.addEventListener('keydown', event => this.handleKeyDown(event));
    });
    this.root.setAttribute('data-disclosure-initialized', '');
  }

  toggle(details, isOpen) {
    const root = this.root;
    root.setAttribute('data-disclosure-animating', '');
    const name = details.getAttribute('name');
    if (name) {
      details.removeAttribute('name');
      const opened = document.querySelector(`details[name="${name}"][open]`);
      if (isOpen && opened && opened !== details) this.close(opened);
    }
    if (isOpen) {
      details.setAttribute('open', '');
    } else {
      details.setAttribute('data-disclosure-closing', '');
    }
    const summary = details.querySelector('summary');
    const content = summary.nextElementSibling;
    const height = `${content.scrollHeight}px`;
    content.style.setProperty('overflow', 'clip');
    content.style.setProperty('will-change', [...new Set(window.getComputedStyle(content).getPropertyValue('will-change').split(',')).add('max-height').values()].filter(value => value !== 'auto').join(','));
    content.animate({ maxHeight: [isOpen ? '0' : height, isOpen ? height : '0'] }, { duration: this.settings.animation.duration, easing: this.settings.animation.easing }).addEventListener('finish', () => {
      root.removeAttribute('data-disclosure-animating');
      if (name) details.setAttribute('name', name);
      if (!isOpen) {
        details.removeAttribute('open');
        details.removeAttribute('data-disclosure-closing');
      }
      ['max-height', 'overflow', 'will-change'].forEach(name => content.style.removeProperty(name));
    });
  }

  handleClick(event) {
    event.preventDefault();
    if (this.root.hasAttribute('data-disclosure-animating')) return;
    const details = event.currentTarget.parentElement;
    this.toggle(details, !details.hasAttribute('open'));
  }

  handleKeyDown(event) {
    const { key } = event;
    if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(key)) return;
    event.preventDefault();
    const focusables = [...this.summaries].filter(summary => !summary.hasAttribute('aria-disabled'));
    const currentIndex = focusables.indexOf(document.activeElement);
    const length = focusables.length;
    let newIndex = currentIndex;
    switch (key) {
      case 'ArrowUp':
        newIndex = (currentIndex - 1 + length) % length;
        break;
      case 'ArrowDown':
        newIndex = (currentIndex + 1) % length;
        break;
      case 'Home':
        newIndex = 0;
        break;
      case 'End':
        newIndex = length - 1;
        break;
    }
    focusables[newIndex].focus();
  }

  open(details) {
    this.toggle(details, true);
  }

  close(details) {
    this.toggle(details, false);
  }
}

export default Disclosure;

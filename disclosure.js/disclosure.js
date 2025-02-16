class Disclosure {
  constructor(element, options) {
    this.element = element;
    this.options = {
      animation: {
        duration: 300,
        easing: 'ease',
        ...options?.animation,
      },
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.options.animation.duration = 0;
    }
    const NOT_NESTED = ':not(:scope summary + * *)';
    this.summaries = this.element.querySelectorAll(`summary${NOT_NESTED}:not([aria-disabled="true"])`);
    this.initialize();
  }

  initialize() {
    this.summaries.forEach(summary => {
      summary.addEventListener('click', event => this.handleClick(event));
      summary.addEventListener('keydown', event => this.handleKeyDown(event));
    });
  }

  toggle(details, isOpen) {
    const element = this.element;
    element.setAttribute('data-disclosure-animating', '');
    const name = details.name;
    if (name) {
      details.removeAttribute('name');
      const opened = document.querySelector(`details[name="${name}"][open]`);
      if (isOpen && opened && opened !== details) this.close(opened);
    }
    if (isOpen) {
      details.open = true;
    } else {
      details.setAttribute('data-disclosure-closing', '');
    }
    const summary = details.querySelector('summary');
    const content = summary.nextElementSibling;
    const height = `${content.scrollHeight}px`;
    content.style.cssText += `
      overflow: clip;
      will-change: max-height;
    `;
    content.animate({ maxHeight: [isOpen ? '0' : height, isOpen ? height : '0'] }, { duration: this.options.animation.duration, easing: this.options.animation.easing }).addEventListener('finish', () => {
      element.removeAttribute('data-disclosure-animating');
      if (name) details.name = name;
      if (!isOpen) {
        details.open = false;
        details.removeAttribute('data-disclosure-closing');
      }
      content.style.maxHeight = content.style.overflow = content.style.willChange = '';
    });
  }

  handleClick(event) {
    event.preventDefault();
    if (this.element.hasAttribute('data-disclosure-animating')) return;
    const details = event.currentTarget.parentElement;
    this.toggle(details, !details.open);
  }

  handleKeyDown(event) {
    const { key } = event;
    if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(key)) return;
    event.preventDefault();
    const index = [...this.summaries].indexOf(document.activeElement);
    const length = this.summaries.length;
    this.summaries[key === 'ArrowUp' ? (index - 1 < 0 ? length - 1 : index - 1) : key === 'ArrowDown' ? (index + 1) % length : key === 'Home' ? 0 : length - 1].focus();
  }

  open(details) {
    this.toggle(details, true);
  }

  close(details) {
    this.toggle(details, false);
  }
}

export default Disclosure;

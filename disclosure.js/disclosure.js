class Disclosure {
  constructor(element, props) {
    this.element = element;
    this.props = {
      animation: {
        duration: 300,
        easing: 'ease',
        ...props?.animation,
      },
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) this.props.animation.duration = 0;
    const NOT_NESTED = ':not(:scope summary + * *)';
    this.summaries = this.element.querySelectorAll(`summary${NOT_NESTED}:not([aria-disabled="true"])`);
    if (!this.summaries.length) return;
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
    content.animate({ maxHeight: [isOpen ? '0' : height, isOpen ? height : '0'] }, { duration: this.props.animation.duration, easing: this.props.animation.easing }).addEventListener('finish', () => {
      element.removeAttribute('data-disclosure-animating');
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
    if (this.element.hasAttribute('data-disclosure-animating')) return;
    const details = event.currentTarget.parentElement;
    this.toggle(details, !details.hasAttribute('open'));
  }

  handleKeyDown(event) {
    const { key } = event;
    if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(key)) return;
    event.preventDefault();
    const position = [...this.summaries].indexOf(document.activeElement);
    const length = this.summaries.length;
    let index = position;
    switch (key) {
      case 'ArrowUp':
        index = (position - 1 + length) % length;
        break;
      case 'ArrowDown':
        index = (position + 1) % length;
        break;
      case 'Home':
        index = 0;
        break;
      case 'End':
        index = length - 1;
        break;
    }
    this.summaries[index].focus();
  }

  open(details) {
    this.toggle(details, true);
  }

  close(details) {
    this.toggle(details, false);
  }
}

export default Disclosure;

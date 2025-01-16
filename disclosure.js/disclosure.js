class Disclosure {
  constructor(element) {
    this.element = element;
    const NOT_NESTED = ':not(:scope summary + * *)';
    this.summaries = this.element.querySelectorAll(`summary${NOT_NESTED}`);
    this.initialize();
  }
  initialize() {
    this.summaries.forEach(summary => {
      summary.addEventListener('click', e => {
        this.handleClick(e);
      });
      summary.addEventListener('keydown', e => {
        this.handleKeyDown(e);
      });
    });
  }
  toggle(details, isOpen) {
    details.setAttribute('data-disclosure-transitioning', '');
    const name = details.getAttribute('name');
    if (name) {
      details.removeAttribute('name');
      const opened = document.querySelector(`details[name="${name}"][open]`);
      if (isOpen && opened && opened !== details) {
        this.toggle(opened, false);
      }
    }
    if (isOpen) {
      details.setAttribute('open', '');
    } else {
      details.setAttribute('data-disclosure-closing', '');
    }
    const summary = details.querySelector('summary');
    const content = summary.nextElementSibling;
    const height = `${content.scrollHeight}px`;
    content.addEventListener('transitionend', function once(e) {
      if (e.propertyName !== 'max-height') {
        return;
      }
      details.removeAttribute('data-disclosure-transitioning');
      if (name) {
        details.setAttribute('name', name);
      }
      if (!isOpen) {
        details.removeAttribute('open');
        details.removeAttribute('data-disclosure-closing');
      }
      content.style.maxHeight = content.style.overflow = '';
      this.removeEventListener('transitionend', once);
    });
    content.style.maxHeight = isOpen ? 0 : height;
    content.style.overflow = 'clip';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        content.style.maxHeight = isOpen ? height : 0;
      });
    });
  }
  handleClick(e) {
    e.preventDefault();
    if (this.element.querySelector('[data-disclosure-transitioning]')) {
      return;
    }
    const detail = e.currentTarget.parentElement;
    this.toggle(detail, !detail.hasAttribute('open'));
  }
  handleKeyDown(e) {
    const { key } = e;
    if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(key)) {
      return;
    }
    e.preventDefault();
    const index = [...this.summaries].indexOf(document.activeElement);
    const length = this.summaries.length;
    this.summaries[key === 'ArrowUp' ? (index - 1 < 0 ? length - 1 : index - 1) : key === 'ArrowDown' ? (index + 1) % length : key === 'Home' ? 0 : length - 1].focus();
  }
}

export default Disclosure;

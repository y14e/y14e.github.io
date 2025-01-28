class Disclosure {
  constructor(element) {
    this.element = element;
    const NOT_NESTED = ':not(:scope summary + * *)';
    this.summaries = this.element.querySelectorAll(`summary${NOT_NESTED}`);
    this.initialize();
  }

  initialize() {
    this.summaries.forEach(summary => {
      summary.addEventListener('click', event => {
        this.handleClick(event);
      });
      summary.addEventListener('keydown', event => {
        this.handleKeyDown(event);
      });
    });
  }

  state(details, isOpen) {
    details.dataset.disclosureTransitioning = '';
    const name = details.name;
    if (name) {
      details.removeAttribute('name');
      const opened = document.querySelector(`details[name="${name}"][open]`);
      if (isOpen && opened && opened !== details) {
        this.close(opened);
      }
    }
    if (isOpen) {
      details.open = true;
    } else {
      details.dataset.disclosureClosing = '';
    }
    const summary = details.querySelector('summary');
    const content = summary.nextElementSibling;
    const height = `${content.scrollHeight}px`;
    content.addEventListener('transitionend', function handleTransitionEnd(event) {
      if (event.propertyName !== 'max-height') {
        return;
      }
      delete details.dataset.disclosureTransitioning;
      if (name) {
        details.name = name;
      }
      if (!isOpen) {
        details.open = false;
        delete details.dataset.disclosureClosing;
      }
      content.style.maxHeight = content.style.overflow = '';
      this.removeEventListener('transitionend', handleTransitionEnd);
    });
    content.style.maxHeight = isOpen ? '0' : height;
    content.style.overflow = 'clip';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        content.style.maxHeight = isOpen ? height : '0';
      });
    });
  }

  handleClick(event) {
    event.preventDefault();
    if (this.element.querySelector('[data-disclosure-transitioning]')) {
      return;
    }
    this.toggle(event.currentTarget.parentElement);
  }

  handleKeyDown(event) {
    const { key } = event;
    if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(key)) {
      return;
    }
    event.preventDefault();
    const index = [...this.summaries].indexOf(document.activeElement);
    const length = this.summaries.length;
    this.summaries[key === 'ArrowUp' ? (index - 1 < 0 ? length - 1 : index - 1) : key === 'ArrowDown' ? (index + 1) % length : key === 'Home' ? 0 : length - 1].focus();
  }

  open(details) {
    this.state(details, true);
  }

  close(details) {
    this.state(details, false);
  }

  toggle(details) {
    this.state(details, !details.open);
  }
}

export default Disclosure;

class Disclosure {
  constructor(element) {
    this.element = element;
    const NOT_NESTED = ':not(:scope summary + * *)';
    this.details = this.element.querySelectorAll(`details${NOT_NESTED}`);
    this.summaries = this.element.querySelectorAll(`summary${NOT_NESTED}`);
    this.contents = this.element.querySelectorAll(`summary${NOT_NESTED} + *`);
    if (!this.details.length || !this.details.length || !this.contents.length) return;
    this.initialize();
  }

  initialize() {
    this.summaries.forEach(summary => summary.addEventListener('keydown', event => this.handleKeyDown(event)));
    this.element.setAttribute('data-disclosure-initialized', '');
  }

  toggle(details, isOpen) {
    if (isOpen) {
      details.setAttribute('open', '');
    } else {
      details.removeAttribute('open');
    }
  }

  handleKeyDown(event) {
    const { key } = event;
    if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(key)) return;
    event.preventDefault();
    const summaries = [...this.summaries].filter(summary => !summary.hasAttribute('aria-disabled'));
    const position = summaries.indexOf(document.activeElement);
    const length = summaries.length;
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
    summaries[index].focus();
  }

  open(details) {
    this.toggle(details, true);
  }

  close(details) {
    this.toggle(details, false);
  }
}

export default Disclosure;

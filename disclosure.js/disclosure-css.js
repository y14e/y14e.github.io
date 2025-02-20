class Disclosure {
  constructor(element) {
    this.element = element;
    const NOT_NESTED = ':not(:scope summary + * *)';
    this.summaries = this.element.querySelectorAll(`summary${NOT_NESTED}:not([aria-disabled="true"])`);
    if (!this.summaries.length) return;
    this.initialize();
  }

  initialize() {
    this.summaries.forEach(summary => summary.addEventListener('keydown', event => this.handleKeyDown(event)));
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

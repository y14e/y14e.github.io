class Disclosure {
  constructor(root) {
    this.root = root;
    const NOT_NESTED = ':not(:scope summary + * *)';
    this.detailses = this.root.querySelectorAll(`details${NOT_NESTED}`);
    this.summaries = this.root.querySelectorAll(`summary${NOT_NESTED}`);
    this.contents = this.root.querySelectorAll(`summary${NOT_NESTED} + *`);
    if (!this.detailses.length || !this.summaries.length || !this.contents.length) return;
    this.initialize();
  }

  initialize() {
    this.summaries.forEach(summary => summary.addEventListener('keydown', event => this.handleKeyDown(event)));
    this.root.setAttribute('data-disclosure-initialized', '');
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
    const focusables = [...this.summaries].filter(summary => summary.getAttribute('aria-disabled') !== 'true');
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

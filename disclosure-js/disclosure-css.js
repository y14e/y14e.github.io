export class Disclosure {
  constructor(root) {
    if (!root) {
      return;
    }
    this.rootElement = root;
    const NOT_NESTED = ':not(:scope summary + * *)';
    this.detailsElements = [...this.rootElement.querySelectorAll(`details${NOT_NESTED}`)];
    this.summaryElements = [...this.rootElement.querySelectorAll(`summary${NOT_NESTED}`)];
    this.contentElements = [...this.rootElement.querySelectorAll(`summary${NOT_NESTED} + *`)];
    this.handleSummaryKeyDown = this.handleSummaryKeyDown.bind(this);
    this.initialize();
  }

  initialize() {
    if (!this.detailsElements.length || !this.summaryElements.length || !this.contentElements.length) {
      return;
    }
    this.summaryElements.forEach(summary => {
      if (!this.isFocusable(summary.parentElement)) {
        summary.tabIndex = -1;
        summary.style.setProperty('pointer-events', 'none');
      }
      summary.addEventListener('keydown', this.handleSummaryKeyDown);
    });
    this.rootElement.setAttribute('data-disclosure-initialized', '');
  }

  isFocusable(element) {
    return element.ariaDisabled !== 'true';
  }

  toggle(details, open) {
    if (open === details.open) {
      return;
    }
    details.open = open;
  }

  handleSummaryKeyDown(event) {
    const { key } = event;
    if (!['End', 'Home', 'ArrowUp', 'ArrowDown'].includes(key)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const focusables = this.summaryElements.filter(summary => this.isFocusable(summary.parentElement));
    const length = focusables.length;
    const active = document.activeElement;
    const current = active instanceof HTMLElement ? active : null;
    if (!current) {
      return;
    }
    const currentIndex = focusables.indexOf(current);
    let newIndex;
    switch (key) {
      case 'End':
        newIndex = length - 1;
        break;
      case 'Home':
        newIndex = 0;
        break;
      case 'ArrowUp':
        newIndex = (currentIndex - 1 + length) % length;
        break;
      case 'ArrowDown':
        newIndex = (currentIndex + 1) % length;
        break;
    }
    focusables[newIndex].focus();
  }

  open(details) {
    if (!this.detailsElements.includes(details)) {
      return;
    }
    this.toggle(details, true);
  }

  close(details) {
    if (!this.detailsElements.includes(details)) {
      return;
    }
    this.toggle(details, false);
  }
}

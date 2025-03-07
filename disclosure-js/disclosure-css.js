class Disclosure {
  constructor(root) {
    this.rootElement = root;
    let NOT_NESTED = ':not(:scope summary + * *)';
    this.detailsElements = this.rootElement.querySelectorAll(`details${NOT_NESTED}`);
    this.summaryElements = this.rootElement.querySelectorAll(`summary${NOT_NESTED}`);
    this.contentElements = this.rootElement.querySelectorAll(`summary${NOT_NESTED} + *`);
    if (!this.detailsElements.length || !this.summaryElements.length || !this.contentElements.length) return;
    this.initialize();
  }

  initialize() {
    this.summaryElements.forEach(summary => {
      if (!this.isFocusable(summary)) {
        summary.setAttribute('tabindex', '-1');
        summary.style.setProperty('pointer-events', 'none');
      }
      summary.addEventListener('keydown', event => this.handleSummaryKeyDown(event));
    });
    this.contentElements.forEach(content => {
      if (!this.isFocusable(content.previousElementSibling)) content.setAttribute('hidden', '');
    });
    this.rootElement.setAttribute('data-disclosure-initialized', '');
  }

  isFocusable(summary) {
    return summary.parentElement.getAttribute('aria-disabled') !== 'true';
  }

  toggle(details, isOpen) {
    if (details.hasAttribute('open') === isOpen) return;
    if (isOpen) {
      details.setAttribute('open', '');
    } else {
      details.removeAttribute('open');
    }
  }

  handleSummaryKeyDown(event) {
    let { key } = event;
    if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(key)) return;
    event.preventDefault();
    let focusableSummaries = [...this.summaryElements].filter(this.isFocusable);
    let currentIndex = focusableSummaries.indexOf(document.activeElement);
    let length = focusableSummaries.length;
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
    focusableSummaries[newIndex].focus();
  }

  open(details) {
    this.toggle(details, true);
  }

  close(details) {
    this.toggle(details, false);
  }
}

export default Disclosure;

/**
 * disclosure-css.ts
 *
 * @version 1.0.4
 * @author Yusuke Kamiyamane
 * @license MIT
 * @copyright Copyright (c) Yusuke Kamiyamane
 * @see {@link https://github.com/y14e/disclosure-ts}
 */
// -----------------------------------------------------------------------------
// APIs
// -----------------------------------------------------------------------------
export default class Disclosure {
  #rootElement;
  #detailsElements;
  #summaryElements;
  #contentElements;
  #bindings = new WeakMap();
  #controller = new AbortController();
  #isDestroyed = false;
  constructor(root) {
    if (!(root instanceof HTMLElement)) {
      throw new TypeError('Invalid root element');
    }
    this.#rootElement = root;
    const NOT_NESTED = ':not(:scope summary + * *)';
    this.#detailsElements = [
      ...this.#rootElement.querySelectorAll(`details${NOT_NESTED}`),
    ];
    if (!this.#detailsElements.length) {
      console.warn('Missing <details> elements');
      return;
    }
    this.#summaryElements = [
      ...this.#rootElement.querySelectorAll(`summary${NOT_NESTED}`),
    ];
    if (!this.#summaryElements.length) {
      console.warn('Missing <summary> elements');
      return;
    }
    this.#contentElements = [
      ...this.#rootElement.querySelectorAll(`summary${NOT_NESTED} + *`),
    ];
    if (!this.#contentElements.length) {
      console.warn('Missing content elements');
      return;
    }
    this.#initialize();
  }
  open(details) {
    if (this.#isDestroyed) {
      return;
    }
    if (
      !(details instanceof HTMLDetailsElement) ||
      !this.#bindings?.has(details)
    ) {
      console.warn('Invalid <details> element');
      return;
    }
    this.#toggle(details, true);
  }
  close(details) {
    if (this.#isDestroyed) {
      return;
    }
    if (
      !(details instanceof HTMLDetailsElement) ||
      !this.#bindings?.has(details)
    ) {
      console.warn('Invalid <details> element');
      return;
    }
    this.#toggle(details, false);
  }
  destroy() {
    if (this.#isDestroyed) {
      return;
    }
    this.#isDestroyed = true;
    this.#controller?.abort();
    this.#controller = null;
    this.#rootElement.removeAttribute('data-disclosure-initialized');
    this.#detailsElements = null;
    this.#summaryElements = null;
    this.#contentElements = null;
    this.#bindings = null;
  }
  #initialize() {
    const { signal } = this.#controller;
    this.#detailsElements?.forEach((details, i) => {
      const summary = this.#summaryElements?.[i];
      if (!summary) {
        throw new Error('Unreachable');
      }
      if (!this.#isFocusable(details)) {
        summary.setAttribute('aria-disabled', 'true');
        summary.setAttribute('tabindex', '-1');
        summary.style.setProperty('pointer-events', 'none');
      }
      summary.addEventListener('keydown', this.#onSummaryKeyDown, { signal });
      const content = this.#contentElements?.[i];
      if (!content) {
        throw new Error('Unreachable');
      }
      const binding = this.#createBinding(details, summary, content);
      if (!this.#bindings) {
        throw new Error('Unreachable');
      }
      this.#bindings.set(details, binding);
      this.#bindings.set(summary, binding);
      this.#bindings.set(content, binding);
    });
    this.#rootElement.setAttribute('data-disclosure-initialized', '');
  }
  #onSummaryKeyDown = (event) => {
    const { key } = event;
    if (!['End', 'Home', 'ArrowUp', 'ArrowDown'].includes(key)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const focusables = this.#summaryElements.filter(this.#isFocusable);
    const active = this.#getActiveElement();
    const currentIndex = focusables.indexOf(active);
    let newIndex = currentIndex;
    switch (key) {
      case 'End':
        newIndex = -1;
        break;
      case 'Home':
        newIndex = 0;
        break;
      case 'ArrowUp':
        newIndex = currentIndex - 1;
        break;
      case 'ArrowDown':
        newIndex = (currentIndex + 1) % focusables.length;
        break;
    }
    focusables.at(newIndex)?.focus();
  };
  #toggle(details, isOpen) {
    if (details.open !== isOpen) {
      details.open = isOpen;
    }
  }
  #createBinding(details, summary, content) {
    return { details, summary, content };
  }
  #getActiveElement() {
    function walk(node) {
      if (!node) {
        return null;
      }
      const active = node.shadowRoot?.activeElement;
      return active ? walk(active) : node;
    }
    return walk(document.activeElement);
  }
  #isFocusable(element) {
    return element.getAttribute('tabindex') !== '-1';
  }
}

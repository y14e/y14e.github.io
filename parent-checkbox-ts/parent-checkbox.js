/**
 * parent-checkbox.ts
 *
 * @version 1.0.4
 * @author Yusuke Kamiyamane
 * @license MIT
 * @copyright Copyright (c) Yusuke Kamiyamane
 * @see {@link https://github.com/y14e/parent-checkbox-ts}
 */
// -----------------------------------------------------------------------------
// APIs
// -----------------------------------------------------------------------------
export default class ParentCheckbox {
  #rootElement;
  #childElements;
  #controller = new AbortController();
  #isDestroyed = false;
  constructor(root) {
    if (!(root instanceof HTMLInputElement)) {
      throw new TypeError('Invalid root element');
    }
    this.#rootElement = root;
    const ids = root.getAttribute('aria-controls')?.trim() ?? '';
    if (!ids) {
      console.warn('Invalid aria-controls attribute');
    }
    this.#childElements = ids
      .split(/\s+/)
      .map((id) => document.getElementById(id))
      .filter((element) => element instanceof HTMLInputElement);
    if (!this.#childElements.length) {
      console.warn('Missing child elements');
    }
    this.#initialize();
  }
  destroy() {
    if (this.#isDestroyed) {
      return;
    }
    this.#isDestroyed = true;
    this.#controller?.abort();
    this.#controller = null;
    this.#childElements.length = 0;
    this.#rootElement.removeAttribute('data-parent-checkbox-initialized');
  }
  #initialize() {
    const { signal } = this.#controller ?? new AbortController();
    this.#rootElement.addEventListener('change', this.#onRootChange, {
      signal,
    });
    this.#childElements.forEach((child) => {
      child.addEventListener('change', this.#onChildChange, { signal });
    });
    this.#update();
    this.#rootElement.setAttribute('data-parent-checkbox-initialized', '');
  }
  #update() {
    const isAllChecked = this.#childElements.every((child) => child.checked);
    this.#rootElement.checked = isAllChecked;
    this.#rootElement.indeterminate =
      !isAllChecked && this.#childElements.some((child) => child.checked);
  }
  #onRootChange = () => {
    this.#rootElement.indeterminate = false;
    const isChecked = this.#rootElement.checked;
    this.#childElements.forEach((child) => {
      child.checked = isChecked;
    });
  };
  #onChildChange = () => {
    this.#update();
  };
}

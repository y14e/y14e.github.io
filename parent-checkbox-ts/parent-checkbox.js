export default class ParentCheckbox {
  #rootElement;
  #childElements;
  #controller = new AbortController();
  #isDestroyed = false;
  constructor(root) {
    if (!root) {
      throw new Error('Root element missing.');
    }
    this.#rootElement = root;
    const ids = root.getAttribute('aria-controls')?.trim() ?? '';
    if (ids === '') {
      console.warn('Child element IDs missing.');
    }
    const children = ids
      .split(/\s+/)
      .map((id) => document.getElementById(id))
      .filter((element) => element instanceof HTMLInputElement);
    if (children.length === 0) {
      console.warn('Child element missing.');
    }
    this.#childElements = children;
    this.#initialize();
  }
  destroy() {
    if (this.#isDestroyed) {
      return;
    }
    this.#isDestroyed = true;
    this.#controller?.abort();
    this.#controller = null;
    this.#rootElement.removeAttribute('data-parent-checkbox-initialized');
    this.#childElements = null;
  }
  #initialize() {
    if (!this.#childElements || !this.#controller) {
      return;
    }
    const { signal } = this.#controller;
    this.#rootElement.addEventListener('change', this.#onRootChange, { signal });
    this.#childElements.forEach((child) => {
      child.addEventListener('change', this.#onChildChange, { signal });
    });
    this.#update();
    this.#rootElement.setAttribute('data-parent-checkbox-initialized', '');
  }
  #update() {
    if (!this.#childElements) {
      return;
    }
    const isAllChecked = this.#childElements.every((child) => child.checked);
    this.#rootElement.checked = isAllChecked;
    this.#rootElement.indeterminate = !isAllChecked && this.#childElements.some((child) => child.checked);
  }
  #onRootChange = () => {
    if (!this.#childElements) {
      return;
    }
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

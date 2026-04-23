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
      .map((id) => {
        return document.getElementById(id);
      })
      .filter((element) => {
        return element instanceof HTMLInputElement;
      });
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
    for (const child of this.#childElements) {
      child.addEventListener('change', this.#onChildChange, { signal });
    }
    this.#update();
    this.#rootElement.setAttribute('data-parent-checkbox-initialized', '');
  }
  #update() {
    if (!this.#childElements) {
      return;
    }
    let count = 0;
    for (const child of this.#childElements) {
      if (child.checked) {
        count++;
      }
    }
    const isAllChecked = count === this.#childElements.length;
    this.#rootElement.checked = isAllChecked;
    this.#rootElement.indeterminate = !isAllChecked && count > 0;
  }
  #onRootChange = () => {
    if (!this.#childElements) {
      return;
    }
    this.#rootElement.indeterminate = false;
    const isChecked = this.#rootElement.checked;
    for (const child of this.#childElements) {
      child.checked = isChecked;
    }
  };
  #onChildChange = () => {
    this.#update();
  };
}

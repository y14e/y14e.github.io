export default class ParentCheckbox {
  #childElements;
  #controller = new AbortController();

  constructor(root) {
    if (!root) {
      throw new Error('Root element missing.');
    }
    this.rootElement = root;
    const ids = this.rootElement.getAttribute('aria-controls')?.trim() ?? '';
    if (!ids) {
      console.warn('Child element IDs missing.');
    }
    this.#childElements = ids
      .split(/\s+/)
      .map((id) => {
        return document.getElementById(id);
      })
      .filter((element) => {
        return element instanceof HTMLInputElement;
      });
    if (this.#childElements.length === 0) {
      console.warn('Child elements missing.');
    }
    this.destroyed = false;
    this.initialize();
  }

  destroy() {
    if (this.destroyed || !this.#childElements) {
      return;
    }
    this.destroyed = true;
    this.#controller?.abort();
    this.#controller = null;
    this.rootElement.removeAttribute('data-parent-checkbox-initialized');
    this.#childElements = null;
  }

  initialize() {
    if (!this.#childElements || !this.#controller) {
      return;
    }
    const { signal } = this.#controller;
    this.rootElement.addEventListener('change', this.handleRootChange, { signal });
    for (const child of this.#childElements) {
      child.addEventListener('change', this.handleChildChange, { signal });
    }
    this.update();
    this.rootElement.setAttribute('data-parent-checkbox-initialized', '');
  }

  handleRootChange = () => {
    if (!this.#childElements) {
      return;
    }
    const { checked } = this.rootElement;
    this.rootElement.indeterminate = false;
    for (const child of this.#childElements) {
      child.checked = checked;
    }
  };

  handleChildChange = () => {
    this.update();
  };

  update() {
    if (!this.#childElements) {
      return;
    }
    let count = 0;
    for (const child of this.#childElements) {
      if (child.checked) {
        count++;
      }
    }
    const allChecked = count === this.#childElements.length;
    this.rootElement.checked = allChecked;
    this.rootElement.indeterminate = !allChecked && count > 0;
  }
}

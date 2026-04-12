export default class ParentCheckbox {
  #rootElement;
  #childElements;
  #controller = new AbortController();
  #destroyed = false;
  constructor(rootElement) {
    if (!rootElement) throw new Error('RootElement element missing.');
    this.#rootElement = rootElement;
    const ids = rootElement.getAttribute('aria-controls')?.trim() ?? '';
    if (ids === '') console.warn('Child element IDs missing.');
    const children = ids
      .split(/\s+/)
      .map((id) => document.getElementById(id))
      .filter((element) => element instanceof HTMLInputElement);
    if (children.length === 0) console.warn('Child elements missing.');
    this.#childElements = children;
    this.#initialize();
  }
  destroy() {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#controller?.abort();
    this.#controller = null;
    this.#rootElement.removeAttribute('data-parent-checkbox-initialized');
    this.#childElements = null;
  }
  #initialize() {
    if (!this.#childElements || !this.#controller) return;
    const { signal } = this.#controller;
    this.#rootElement.addEventListener('change', this.#onRootChange, { signal });
    for (const child of this.#childElements) {
      child.addEventListener('change', this.#onChildChange, { signal });
    }
    this.#update();
    this.#rootElement.setAttribute('data-parent-checkbox-initialized', '');
  }
  #update() {
    if (!this.#childElements) return;
    let count = 0;
    for (const child of this.#childElements) {
      if (child.checked) count++;
    }
    const all = count === this.#childElements.length;
    this.#rootElement.checked = all;
    this.#rootElement.indeterminate = !all && count > 0;
  }
  #onRootChange = () => {
    if (!this.#childElements) return;
    this.#rootElement.indeterminate = false;
    const checked = this.#rootElement.checked;
    for (const child of this.#childElements) {
      child.checked = checked;
    }
  };
  #onChildChange = () => this.#update();
}

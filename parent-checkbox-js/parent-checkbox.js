export default class ParentCheckbox {
  constructor(root) {
    if (!root) return;
    this.rootElement = root;
    this.childElements =
      this.rootElement
        .getAttribute('aria-controls')
        ?.split(' ')
        .map((id) => document.getElementById(id))
        .filter((element) => element instanceof HTMLInputElement) ?? [];
    if (!this.childElements.length) return;
    this.controller = new AbortController();
    this.destroyed = false;
    this.handleRootChange = this.handleRootChange.bind(this);
    this.handleChildChange = this.handleChildChange.bind(this);
    this.initialize();
  }

  initialize() {
    const { signal } = this.controller;
    this.rootElement.addEventListener('change', this.handleRootChange, { signal });
    this.childElements.forEach((child) => child.addEventListener('change', this.handleChildChange, { signal }));
    this.update();
    this.rootElement.setAttribute('data-parent-checkbox-initialized', '');
  }

  update() {
    const checked = this.childElements.every((child) => child.checked);
    this.rootElement.checked = checked;
    this.rootElement.indeterminate = !checked && this.childElements.some((child) => child.checked);
  }

  handleRootChange() {
    const { checked } = this.rootElement;
    this.childElements.forEach((child) => {
      child.checked = checked;
    });
  }

  handleChildChange() {
    this.update();
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.rootElement.removeAttribute('data-parent-checkbox-initialized');
    this.controller.abort();
  }
}

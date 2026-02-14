export default class CheckboxParent {
  constructor(root) {
    if (!root) return;
    this.rootElement = root;
    this.childElements =
      this.rootElement
        .getAttribute('aria-controls')
        ?.split(' ')
        .map(id => document.getElementById(id))
        .filter(Boolean) || [];
    if (!this.childElements.length) return;
    this.eventController = new AbortController();
    this.destroyed = false;
    this.handleRootChange = this.handleRootChange.bind(this);
    this.handleChildChange = this.handleChildChange.bind(this);
    this.initialize();
  }

  initialize() {
    const { signal } = this.eventController;
    this.rootElement.addEventListener('change', this.handleRootChange, { signal });
    this.childElements.forEach(child => child.addEventListener('change', this.handleChildChange, { signal }));
    this.update();
    this.rootElement.setAttribute('data-checkbox-parent-initialized', '');
  }

  update() {
    const checked = this.childElements.every(child => child.checked);
    Object.assign(this.rootElement, {
      checked: checked,
      indeterminate: !checked && this.childElements.some(child => child.checked),
    });
  }

  handleRootChange() {
    const checked = this.rootElement.checked;
    this.childElements.forEach(child => (child.checked = checked));
  }

  handleChildChange() {
    this.update();
  }

  destroy() {
    if (this.destroyed) return;
    this.rootElement.removeAttribute('data-checkbox-parent-initialized');
    this.eventController.abort();
    this.destroyed = true;
  }
}

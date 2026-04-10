export default class ParentCheckbox {
  constructor(root) {
    if (!root) {
      throw new Error('Root element missing');
    }
    this.rootElement = root;
    const ids = this.rootElement.getAttribute('aria-controls')?.trim() ?? '';
    if (!ids) {
      console.warn('aria-controls attribute missing');
    }
    this.childElements = ids
      .split(/\s+/)
      .map((id) => {
        return document.getElementById(id);
      })
      .filter((element) => {
        return element instanceof HTMLInputElement;
      });
    if (this.childElements.length === 0) {
      console.warn('Child elements missing');
    }
    this.eventController = new AbortController();
    this.destroyed = false;
    this.initialize();
  }

  destroy() {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.eventController.abort();
    this.rootElement.removeAttribute('data-parent-checkbox-initialized');
  }

  initialize() {
    const { signal } = this.eventController;
    this.rootElement.addEventListener('change', this.handleRootChange, { signal });
    for (const child of this.childElements) {
      child.addEventListener('change', this.handleChildChange, { signal });
    }
    this.update();
    this.rootElement.setAttribute('data-parent-checkbox-initialized', '');
  }

  handleRootChange = () => {
    const { checked } = this.rootElement;
    this.rootElement.indeterminate = false;
    for (const child of this.childElements) {
      child.checked = checked;
    }
  };

  handleChildChange = () => {
    this.update();
  };

  update() {
    let count = 0;
    for (const child of this.childElements) {
      if (child.checked) {
        count++;
      }
    }
    const every = count === this.childElements.length;
    this.rootElement.checked = every;
    this.rootElement.indeterminate = !every && count > 0;
  }
}

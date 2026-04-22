export default class Disclosure {
  #rootElement;
  #defaults = {
    animation: {
      duration: 300,
      easing: 'ease',
    },
  };
  #settings;
  #detailsElements;
  #summaryElements;
  #contentElements;
  #bindings = new WeakMap();
  #controller = new AbortController();
  #observers = [];
  #destroyed = false;
  constructor(root, options = {}) {
    if (!root) {
      throw new Error('Root element missing.');
    }
    this.#rootElement = root;
    this.#settings = {
      animation: { ...this.#defaults.animation, ...(options.animation ?? {}) },
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      Object.assign(this.#settings.animation, { duration: 0 });
    }
    const NOT_NESTED = ':not(:scope summary + * *)';
    this.#detailsElements = this.#rootElement.querySelectorAll(`details${NOT_NESTED}`);
    this.#summaryElements = this.#rootElement.querySelectorAll(`summary${NOT_NESTED}`);
    this.#contentElements = this.#rootElement.querySelectorAll(`summary${NOT_NESTED} + *`);
    if (
      this.#detailsElements.length === 0 ||
      this.#summaryElements.length === 0 ||
      this.#contentElements.length === 0
    ) {
      throw new Error('Details, summary or content element missing.');
    }
    this.#initialize();
  }
  open(details) {
    if (!this.#destroyed && this.#bindings?.has(details)) {
      this.#toggle(details, true);
    }
  }
  close(details) {
    if (!this.#destroyed && this.#bindings?.has(details)) {
      this.#toggle(details, false);
    }
  }
  async destroy(force = false) {
    if (this.#destroyed || !this.#detailsElements || !this.#bindings) {
      return;
    }
    this.#destroyed = true;
    this.#controller?.abort();
    this.#controller = null;
    if (this.#observers) {
      for (const observer of this.#observers) {
        observer.disconnect();
      }
      this.#observers = null;
    }
    for (const details of this.#detailsElements) {
      const binding = this.#bindings.get(details);
      if (!binding) {
        continue;
      }
      const { timer } = binding;
      if (timer !== undefined) {
        cancelAnimationFrame(timer);
        binding.timer = undefined;
      }
    }
    this.#rootElement.removeAttribute('data-disclosure-initialized');
    for (const details of this.#detailsElements) {
      details.removeAttribute('data-disclosure-name');
      details.removeAttribute('data-disclosure-open');
    }
    if (!force) {
      const promises = [];
      for (const details of this.#detailsElements) {
        const animation = this.#bindings.get(details)?.animation;
        if (animation) {
          promises.push(this.#waitAnimation(animation));
        }
      }
      await Promise.allSettled(promises);
    }
    for (const details of this.#detailsElements) {
      this.#bindings.get(details)?.animation?.cancel();
    }
    this.#detailsElements = null;
    this.#summaryElements = null;
    this.#contentElements = null;
    this.#bindings = null;
  }
  #initialize() {
    if (
      !this.#detailsElements ||
      !this.#summaryElements ||
      !this.#contentElements ||
      !this.#bindings ||
      !this.#controller
    ) {
      return;
    }
    const { signal } = this.#controller;
    for (const details of this.#detailsElements) {
      if (details.name) {
        details.setAttribute('data-disclosure-name', details.name);
      }
      const sync = () => {
        details.toggleAttribute('data-disclosure-open', details.open);
      };
      const observer = new MutationObserver(sync);
      observer.observe(details, { attributeFilter: ['open'] });
      this.#observers?.push(observer);
      sync();
    }
    for (let i = 0, l = this.#summaryElements.length; i < l; i++) {
      const summary = this.#summaryElements[i];
      if (!this.#isFocusable(this.#detailsElements[i])) {
        summary.setAttribute('tabindex', '-1');
        summary.style.setProperty('pointer-events', 'none');
      }
      summary.addEventListener('click', this.#onSummaryClick, { signal });
      summary.addEventListener('keydown', this.#onSummaryKeyDown, { signal });
    }
    for (let i = 0, l = this.#detailsElements.length; i < l; i++) {
      const details = this.#detailsElements[i];
      const summary = this.#summaryElements[i];
      const content = this.#contentElements[i];
      if (!summary || !content) {
        continue;
      }
      const binding = this.#createBinding(details, summary, content);
      this.#bindings.set(details, binding);
      this.#bindings.set(summary, binding);
      this.#bindings.set(content, binding);
    }
    this.#rootElement.setAttribute('data-disclosure-initialized', '');
  }
  #onSummaryClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const summary = event.currentTarget;
    if (!(summary instanceof HTMLElement)) {
      return;
    }
    const binding = this.#bindings?.get(summary);
    if (!binding) {
      return;
    }
    const { details } = binding;
    this.#toggle(details, !details.hasAttribute('data-disclosure-open'));
  };
  #onSummaryKeyDown = (event) => {
    if (!this.#summaryElements) {
      return;
    }
    const { key } = event;
    if (!['End', 'Home', 'ArrowUp', 'ArrowDown'].includes(key)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const focusables = [];
    for (const summary of this.#summaryElements) {
      const binding = this.#bindings?.get(summary);
      if (binding && this.#isFocusable(binding.details)) {
        focusables.push(summary);
      }
    }
    const active = this.#getActiveElement();
    if (!active) {
      return;
    }
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
  #toggle(details, open) {
    if (!this.#detailsElements) {
      return;
    }
    const binding = this.#bindings?.get(details);
    if (!binding || open === details.hasAttribute('data-disclosure-open')) {
      return;
    }
    const name = details.getAttribute('data-disclosure-name');
    if (name && open) {
      for (const d of this.#detailsElements) {
        if (
          d !== details &&
          d.getAttribute('data-disclosure-name') === name &&
          d.hasAttribute('data-disclosure-open')
        ) {
          this.close(d);
          break;
        }
      }
    }
    const { content, timer } = binding;
    const startSize = details.open ? content.offsetHeight : 0;
    binding.animation?.cancel();
    if (open) {
      details.open = true;
    }
    const endSize = open ? content.scrollHeight : 0;
    if (timer) {
      cancelAnimationFrame(timer);
    }
    binding.timer = requestAnimationFrame(() => {
      binding.timer = undefined;
      details.toggleAttribute('data-disclosure-open', open);
    });
    content.style.setProperty('overflow', 'clip');
    const { duration, easing } = this.#settings.animation;
    const animation = content.animate({ blockSize: [`${startSize}px`, `${endSize}px`] }, { duration, easing });
    binding.animation = animation;
    const cleanup = () => {
      if (binding.animation === animation) {
        binding.animation = null;
      }
    };
    if (!this.#controller) {
      return;
    }
    const { signal } = this.#controller;
    animation.addEventListener('cancel', cleanup, { once: true, signal });
    animation.addEventListener(
      'finish',
      () => {
        cleanup();
        if (name) {
          details.setAttribute('name', details.getAttribute('data-disclosure-name') ?? '');
        }
        if (!open) {
          details.open = false;
        }
        const { style } = content;
        style.removeProperty('block-size');
        style.removeProperty('overflow');
      },
      { once: true, signal },
    );
  }
  #createBinding(details, summary, content) {
    return { details, summary, content, timer: undefined, animation: null };
  }
  #getActiveElement() {
    let active = document.activeElement;
    while (active instanceof HTMLElement && active.shadowRoot?.activeElement) {
      active = active.shadowRoot.activeElement;
    }
    return active instanceof HTMLElement ? active : null;
  }
  #isFocusable(element) {
    return element.getAttribute('aria-disabled') !== 'true';
  }
  #waitAnimation(animation) {
    const { playState } = animation;
    if (playState === 'idle' || playState === 'finished') {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const done = () => {
        resolve();
      };
      animation.addEventListener('cancel', done, { once: true });
      animation.addEventListener('finish', done, { once: true });
    });
  }
}

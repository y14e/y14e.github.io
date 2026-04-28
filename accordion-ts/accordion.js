export default class Accordion {
  #rootElement;
  #defaults = {
    animation: { duration: 300, easing: 'ease' },
    selector: {
      content: ':has(> [data-accordion-trigger]) + *',
      trigger: '[data-accordion-trigger]',
    },
  };
  #settings;
  #triggerElements;
  #contentElements;
  #bindings = new WeakMap();
  #controller = new AbortController();
  #isDestroyed = false;
  constructor(root, options = {}) {
    if (!root) {
      throw new Error('Root element missing');
    }
    this.#rootElement = root;
    this.#settings = {
      animation: { ...this.#defaults.animation, ...(options.animation ?? {}) },
      selector: { ...this.#defaults.selector, ...(options.selector ?? {}) },
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      Object.assign(this.#settings.animation, { duration: 0 });
    }
    const { trigger, content } = this.#settings.selector;
    const NOT_NESTED = `:not(:scope ${content} *)`;
    this.#triggerElements = [...this.#rootElement.querySelectorAll(`${trigger}${NOT_NESTED}`)];
    this.#contentElements = [...this.#rootElement.querySelectorAll(`${content}${NOT_NESTED}`)];
    if (this.#triggerElements.length === 0 || this.#contentElements.length === 0) {
      throw new Error('Trigger or content element missing');
    }
    this.#initialize();
  }
  open(trigger) {
    if (!this.#isDestroyed && this.#bindings?.has(trigger)) {
      this.#toggle(trigger, true);
    }
  }
  close(trigger) {
    if (!this.#isDestroyed && this.#bindings?.has(trigger)) {
      this.#toggle(trigger, false);
    }
  }
  async destroy(isForce = false) {
    if (this.#isDestroyed || !this.#triggerElements || !this.#bindings) {
      return;
    }
    this.#isDestroyed = true;
    this.#controller?.abort();
    this.#controller = null;
    this.#rootElement.removeAttribute('data-accordion-initialized');
    if (!isForce) {
      const promises = [];
      this.#triggerElements.forEach((trigger) => {
        const animation = this.#bindings?.get(trigger)?.animation;
        if (animation) {
          promises.push(this.#waitAnimation(animation));
        }
      });
      await Promise.allSettled(promises);
    }
    this.#triggerElements.forEach((trigger) => {
      this.#bindings?.get(trigger)?.animation?.cancel();
    });
    this.#triggerElements = null;
    this.#contentElements = null;
    this.#bindings = null;
  }
  #initialize() {
    if (!this.#triggerElements || !this.#controller) {
      return;
    }
    const { signal } = this.#controller;
    this.#triggerElements.forEach((trigger, i) => {
      const id = Math.random().toString(36).slice(-8);
      const content = this.#contentElements?.[i];
      if (!content || !this.#bindings) {
        return;
      }
      content.id ||= `accordion-content-${id}`;
      trigger.setAttribute('aria-controls', content.id);
      trigger.setAttribute('aria-expanded', trigger.getAttribute('aria-expanded') ?? 'false');
      trigger.id ||= `accordion-trigger-${id}`;
      if (!this.#isFocusable(trigger)) {
        trigger.setAttribute('aria-disabled', 'true');
        trigger.setAttribute('tabindex', '-1');
        trigger.style.setProperty('pointer-events', 'none');
      }
      trigger.addEventListener('click', this.#onTriggerClick, { signal });
      trigger.addEventListener('keydown', this.#onTriggerKeyDown, { signal });
      content.setAttribute('aria-labelledby', `${content.getAttribute('aria-labelledby') ?? ''} ${trigger.id}`.trim());
      content.setAttribute('role', 'region');
      content.addEventListener('beforematch', this.#onContentBeforeMatch, { signal });
      const binding = this.#createBinding(trigger, content);
      this.#bindings.set(trigger, binding);
      this.#bindings.set(content, binding);
    });
    this.#rootElement.setAttribute('data-accordion-initialized', '');
  }
  #onTriggerClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const trigger = event.currentTarget;
    if (trigger instanceof HTMLElement) {
      this.#toggle(trigger, trigger.getAttribute('aria-expanded') === 'false');
    }
  };
  #onTriggerKeyDown = (event) => {
    if (!this.#triggerElements) {
      return;
    }
    const { key } = event;
    if (!['Enter', ' ', 'End', 'Home', 'ArrowUp', 'ArrowDown'].includes(key)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const focusables = this.#triggerElements.filter(this.#isFocusable);
    const active = this.#getActiveElement();
    if (!active) {
      return;
    }
    const currentIndex = focusables.indexOf(active);
    let newIndex = currentIndex;
    switch (key) {
      case 'Enter':
      case ' ':
        active.click();
        return;
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
  #onContentBeforeMatch = (event) => {
    const content = event.currentTarget;
    if (!(content instanceof HTMLElement)) {
      return;
    }
    const binding = this.#bindings?.get(content);
    if (!binding) {
      return;
    }
    if (binding.trigger.getAttribute('aria-expanded') === 'false') {
      this.#toggle(binding.trigger, true, true);
    }
  };
  #toggle(trigger, isOpen, isMatch = false) {
    if (!this.#triggerElements) {
      return;
    }
    const binding = this.#bindings?.get(trigger);
    if (!binding || String(isOpen) === trigger.getAttribute('aria-expanded')) {
      return;
    }
    const name = trigger.getAttribute('data-accordion-name');
    if (name && isOpen) {
      const opened = this.#triggerElements.find(
        (t) =>
          t !== trigger && t.getAttribute('data-accordion-name') === name && t.getAttribute('aria-expanded') === 'true',
      );
      if (opened) {
        this.#toggle(opened, false, isMatch);
      }
    }
    trigger.setAttribute(
      'aria-label',
      trigger.getAttribute(`data-accordion-${isOpen ? 'expanded' : 'collapsed'}-label`) ??
        trigger.getAttribute('aria-label') ??
        '',
    );
    const { content } = binding;
    const startSize = content.hidden ? 0 : content.offsetHeight;
    if (content.hidden) {
      content.hidden = false;
    }
    const endSize = isOpen ? content.scrollHeight : 0;
    binding.animation?.cancel();
    content.style.setProperty('overflow', 'clip');
    const { duration, easing } = this.#settings.animation;
    const animation = content.animate(
      { blockSize: [`${startSize}px`, `${endSize}px`] },
      { duration: isMatch ? 0 : duration, easing },
    );
    binding.animation = animation;
    trigger.setAttribute('aria-expanded', String(isOpen));
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
        if (!isOpen) {
          content.setAttribute('hidden', 'until-found');
        }
        const { style } = content;
        style.removeProperty('block-size');
        style.removeProperty('overflow');
      },
      { once: true, signal },
    );
  }
  #createBinding(trigger, content) {
    return { trigger, content, animation: null };
  }
  #getActiveElement() {
    let active = document.activeElement;
    while (active instanceof HTMLElement && active.shadowRoot?.activeElement) {
      active = active.shadowRoot.activeElement;
    }
    return active instanceof HTMLElement ? active : null;
  }
  #isFocusable(element) {
    return !element.hasAttribute('disabled') && element.getAttribute('tabindex') !== '-1';
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

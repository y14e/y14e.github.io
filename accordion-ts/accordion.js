/**
 * accordion.ts
 *
 * @version 1.0.6
 * @author Yusuke Kamiyamane
 * @license MIT
 * @copyright Copyright (c) Yusuke Kamiyamane
 * @see {@link https://github.com/y14e/accordion-ts}
 */
// -----------------------------------------------------------------------------
// APIs
// -----------------------------------------------------------------------------
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
    if (!(root instanceof HTMLElement)) {
      throw new TypeError('Invalid root element');
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
    this.#triggerElements = [
      ...this.#rootElement.querySelectorAll(`${trigger}${NOT_NESTED}`),
    ];
    if (!this.#triggerElements.length) {
      console.warn('Missing trigger elements');
      return;
    }
    this.#contentElements = [
      ...this.#rootElement.querySelectorAll(`${content}${NOT_NESTED}`),
    ];
    if (!this.#contentElements.length) {
      console.warn('Missing content elements');
      return;
    }
    this.#initialize();
  }
  open(trigger) {
    if (this.#isDestroyed) {
      return;
    }
    if (!(trigger instanceof HTMLElement) || !this.#bindings?.has(trigger)) {
      console.warn('Invalid trigger element');
      return;
    }
    this.#toggle(trigger, true);
  }
  close(trigger) {
    if (this.#isDestroyed) {
      return;
    }
    if (!(trigger instanceof HTMLElement) || !this.#bindings?.has(trigger)) {
      console.warn('Invalid trigger element');
      return;
    }
    this.#toggle(trigger, false);
  }
  async destroy(force = false) {
    if (this.#isDestroyed) {
      return;
    }
    this.#isDestroyed = true;
    this.#rootElement.removeAttribute('data-accordion-initialized');
    if (!force) {
      const promises = [];
      this.#triggerElements?.forEach((trigger) => {
        const animation = this.#bindings?.get(trigger)?.animation;
        if (animation) {
          promises.push(waitAnimation(animation));
        }
      });
      await Promise.allSettled(promises);
    }
    this.#triggerElements?.forEach((trigger) => {
      this.#bindings?.get(trigger)?.animation?.cancel();
    });
    this.#controller?.abort();
    this.#controller = null;
    this.#triggerElements = null;
    this.#contentElements = null;
    this.#bindings = null;
  }
  #initialize() {
    if (!this.#controller) {
      throw new Error('Unreachable');
    }
    const { signal } = this.#controller;
    this.#triggerElements?.forEach((trigger, i) => {
      const id = Math.random().toString(36).slice(-8);
      const content = this.#contentElements?.[i];
      if (!content) {
        throw new Error('Unreachable');
      }
      content.id ||= `accordion-content-${id}`;
      trigger.setAttribute('aria-controls', content.id);
      trigger.setAttribute(
        'aria-expanded',
        trigger.getAttribute('aria-expanded') ?? 'false',
      );
      trigger.id ||= `accordion-trigger-${id}`;
      if (!isFocusable(trigger)) {
        trigger.setAttribute('aria-disabled', 'true');
        trigger.setAttribute('tabindex', '-1');
        trigger.style.setProperty('pointer-events', 'none');
      }
      trigger.addEventListener('click', this.#onTriggerClick, { signal });
      trigger.addEventListener('keydown', this.#onTriggerKeyDown, { signal });
      content.setAttribute(
        'aria-labelledby',
        `${content.getAttribute('aria-labelledby') ?? ''} ${trigger.id}`.trim(),
      );
      content.setAttribute('role', 'region');
      content.addEventListener('beforematch', this.#onContentBeforeMatch, {
        signal,
      });
      const binding = createBinding(trigger, content);
      this.#bindings?.set(trigger, binding);
      this.#bindings?.set(content, binding);
    });
    this.#rootElement.setAttribute('data-accordion-initialized', '');
  }
  #onTriggerClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const trigger = event.currentTarget;
    if (!(trigger instanceof HTMLElement)) {
      throw new Error('Unreachable');
    }
    this.#toggle(trigger, trigger.getAttribute('aria-expanded') === 'false');
  };
  #onTriggerKeyDown = (event) => {
    const { key } = event;
    if (!['Enter', ' ', 'End', 'Home', 'ArrowUp', 'ArrowDown'].includes(key)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (!this.#triggerElements) {
      throw new Error('Unreachable');
    }
    const focusables = this.#triggerElements.filter(isFocusable);
    const active = getActiveElement();
    if (!(active instanceof HTMLElement)) {
      throw new Error('Unreachable');
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
    const target = event.currentTarget;
    if (!(target instanceof HTMLElement)) {
      throw new Error('Unreachable');
    }
    const binding = this.#bindings?.get(target);
    if (!binding) {
      throw new Error('Unreachable');
    }
    if (binding.trigger.getAttribute('aria-expanded') === 'false') {
      this.#toggle(binding.trigger, true, true);
    }
  };
  #toggle(trigger, isOpen, isMatch = false) {
    if (trigger.getAttribute('aria-expanded') === String(isOpen)) {
      return;
    }
    const name = trigger.getAttribute('data-accordion-name');
    if (name && isOpen) {
      const opened = this.#triggerElements?.find(
        (t) =>
          t !== trigger &&
          t.getAttribute('data-accordion-name') === name &&
          t.getAttribute('aria-expanded') === 'true',
      );
      if (opened) {
        this.#toggle(opened, false, isMatch);
      }
    }
    trigger.setAttribute(
      'aria-label',
      trigger.getAttribute(
        `data-accordion-${isOpen ? 'expanded' : 'collapsed'}-label`,
      ) ??
        trigger.getAttribute('aria-label') ??
        '',
    );
    const binding = this.#bindings?.get(trigger);
    if (!binding) {
      throw new Error('Unreachable');
    }
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
    function cleanup() {
      if (binding?.animation === animation) {
        binding.animation = null;
      }
    }
    if (!this.#controller) {
      throw new Error('Unreachable');
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
}
// -----------------------------------------------------------------------------
// Utils
// -----------------------------------------------------------------------------
function createBinding(trigger, content) {
  return { trigger, content, animation: null };
}
function getActiveElement() {
  let current = document.activeElement;
  while (current?.shadowRoot?.activeElement) {
    current = current.shadowRoot.activeElement;
  }
  return current;
}
function isFocusable(element) {
  const index = element.getAttribute('tabindex');
  return !element.hasAttribute('disabled') && (!index || Number(index) >= 0);
}
function waitAnimation(animation) {
  const { playState } = animation;
  if (playState === 'idle' || playState === 'finished') {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    function done() {
      resolve();
    }
    animation.addEventListener('cancel', done, { once: true });
    animation.addEventListener('finish', done, { once: true });
  });
}

/**
 * accordion.ts
 *
 * @version 1.2.0
 * @author Yusuke Kamiyamane
 * @license MIT
 * @copyright Copyright (c) Yusuke Kamiyamane
 * @see {@link https://github.com/y14e/accordion-ts}
 */
// -----------------------------------------------------------------------------
// APIs
// -----------------------------------------------------------------------------
export default class Accordion {
  static defaults;
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
  #eventController = new AbortController();
  #animationController = new AbortController();
  #isDestroyed = false;
  constructor(root, options = {}) {
    if (!(root instanceof HTMLElement)) {
      throw new TypeError('Invalid root element');
    }
    this.#rootElement = root;
    this.#defaults = {
      animation: {
        ...this.#defaults.animation,
        ...(Accordion.defaults?.animation ?? {}),
      },
      selector: {
        ...this.#defaults.selector,
        ...(Accordion.defaults?.selector ?? {}),
      },
    };
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
    if (!(trigger instanceof HTMLElement) || !this.#bindings.has(trigger)) {
      console.warn('Invalid trigger element');
      return;
    }
    this.#toggle(trigger, true);
  }
  close(trigger) {
    if (this.#isDestroyed) {
      return;
    }
    if (!(trigger instanceof HTMLElement) || !this.#bindings.has(trigger)) {
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
    this.#eventController?.abort();
    this.#eventController = null;
    if (!force) {
      await this.#waitAnimationsFinish();
    }
    this.#contentElements.forEach((content) => {
      if (force) {
        this.#bindings.get(content)?.animation?.finish();
      }
      this.#onAnimationFinish(content);
    });
    this.#animationController?.abort();
    this.#animationController = null;
    this.#triggerElements.length = 0;
    this.#contentElements.length = 0;
    this.#rootElement.removeAttribute('data-accordion-initialized');
  }
  #initialize() {
    const { signal } = this.#eventController ?? new AbortController();
    this.#triggerElements.forEach((trigger, i) => {
      const id = Math.random().toString(36).slice(-8);
      const content = this.#contentElements[i];
      if (!content) {
        return;
      }
      content.id ||= `accordion-content-${id}`;
      addTokenToAttribute(trigger, 'aria-controls', content.id);
      trigger.setAttribute(
        'aria-expanded',
        trigger.ariaExpanded === 'true' ? 'true' : 'false',
      );
      trigger.id ||= `accordion-trigger-${id}`;
      if (!isFocusable(trigger)) {
        trigger.setAttribute('aria-disabled', 'true');
        trigger.setAttribute('tabindex', '-1');
        trigger.style.setProperty('pointer-events', 'none');
      }
      trigger.addEventListener('click', this.#onTriggerClick, { signal });
      trigger.addEventListener('keydown', this.#onTriggerKeyDown, { signal });
      addTokenToAttribute(content, 'aria-labelledby', trigger.id);
      content.setAttribute('role', 'region');
      content.addEventListener('beforematch', this.#onContentBeforeMatch, {
        signal,
      });
      const binding = createBinding(trigger, content);
      this.#bindings.set(trigger, binding);
      this.#bindings.set(content, binding);
    });
    this.#rootElement.setAttribute('data-accordion-initialized', '');
  }
  #onTriggerClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const trigger = event.currentTarget;
    if (!(trigger instanceof HTMLElement)) {
      return;
    }
    this.#toggle(trigger, trigger.ariaExpanded !== 'true');
  };
  #onTriggerKeyDown = (event) => {
    const { key } = event;
    if (!['Enter', ' ', 'End', 'Home', 'ArrowUp', 'ArrowDown'].includes(key)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const focusables = this.#triggerElements.filter(isFocusable);
    const active = getActiveElement();
    if (!(active instanceof HTMLElement)) {
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
    const binding = this.#bindings.get(content);
    if (!binding) {
      return;
    }
    if (binding.trigger.ariaExpanded !== 'true') {
      this.#toggle(binding.trigger, true, true);
    }
  };
  #toggle(trigger, isOpen, isMatch = false) {
    if (trigger.ariaExpanded === String(isOpen)) {
      return;
    }
    const name = trigger.getAttribute('data-accordion-name');
    if (name && isOpen) {
      const opened = this.#triggerElements.find(
        (t) =>
          t !== trigger &&
          t.getAttribute('data-accordion-name') === name &&
          t.ariaExpanded === 'true',
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
        trigger.ariaLabel ??
        '',
    );
    const binding = this.#bindings.get(trigger);
    if (!binding) {
      return;
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
    const { signal } = this.#animationController ?? new AbortController();
    animation.addEventListener('cancel', cleanup, { once: true, signal });
    animation.addEventListener(
      'finish',
      () => {
        this.#onAnimationFinish(content);
        cleanup();
      },
      { once: true, signal },
    );
  }
  #onAnimationFinish(content) {
    const trigger = this.#bindings.get(content)?.trigger;
    if (!trigger) {
      return;
    }
    if (trigger.ariaExpanded === 'false') {
      content.setAttribute('hidden', 'until-found');
    }
    const { style } = content;
    style.removeProperty('block-size');
    style.removeProperty('overflow');
  }
  async #waitAnimationsFinish() {
    const promises = [];
    this.#triggerElements.forEach((trigger) => {
      const animation = this.#bindings.get(trigger)?.animation;
      if (animation) {
        promises.push(waitAnimationFinish(animation));
      }
    });
    await Promise.allSettled(promises);
  }
}
// -----------------------------------------------------------------------------
// Utils
// -----------------------------------------------------------------------------
function addTokenToAttribute(element, attribute, token) {
  const tokens = new Set(
    element.getAttribute(attribute)?.trim().split(/\s+/) ?? [],
  );
  tokens.add(token);
  element.setAttribute(attribute, [...tokens].join(' '));
}
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
  return !element.hasAttribute('disabled') && element.tabIndex >= 0;
}
function waitAnimationFinish(animation) {
  const { playState } = animation;
  if (playState === 'idle' || playState === 'finished') {
    return Promise.resolve();
  }
  return new Promise((resolve) =>
    animation.addEventListener('finish', () => resolve(), { once: true }),
  );
}

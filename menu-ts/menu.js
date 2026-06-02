/**
 * menu.ts
 *
 * @version 1.3.8
 * @author Yusuke Kamiyamane
 * @license MIT
 * @copyright Copyright (c) Yusuke Kamiyamane
 * @see {@link https://github.com/y14e/menu-ts}
 */
// -----------------------------------------------------------------------------
// Imports
// -----------------------------------------------------------------------------
import {
  arrow,
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
} from 'https://esm.sh/@floating-ui/dom';
import {
  addTokenToAttribute,
  restoreAttributes,
  saveAttributes,
} from 'https://esm.sh/@y14e/attributes-utils';
import { createPortal } from 'https://esm.sh/@y14e/portal';
// -----------------------------------------------------------------------------
// APIs
// -----------------------------------------------------------------------------
export default class Menu {
  static defaults = {};
  static #menus = [];
  #rootElement;
  #defaults = {
    animation: { duration: 300 },
    delay: 200,
    popover: {
      menu: {
        arrow: true,
        middleware: [flip(), offset(), shift()],
        placement: 'bottom-start',
      },
      submenu: {
        arrow: true,
        middleware: [flip(), offset(), shift()],
        placement: 'right-start',
      },
      transformOrigin: true,
    },
    selector: {
      checkboxItem: '[role="menuitemcheckbox"]',
      group: '[role="group"]',
      item: '[role^="menuitem"]',
      list: '[role="menu"]',
      radioItem: '[role="menuitemradio"]',
      trigger: '[data-menu-trigger]',
    },
  };
  #settings;
  #isSubmenu;
  #isPortal;
  #triggerElement;
  #listElement;
  #itemElements;
  #itemElementsByFirstChar = new Map();
  #checkboxItemElements = [];
  #radioItemElements = [];
  #radioItemElementsByGroup = new WeakMap();
  #arrowElement;
  #controller = null;
  #animation = null;
  #submenus = [];
  #submenuTimer;
  #isDestroyed = false;
  #cleanupPortal = null;
  #cleanupPopover = null;
  constructor(root, options = {}, _internal = {}) {
    if (!(root instanceof HTMLElement)) {
      throw new TypeError('Invalid root element');
    }
    if (root.hasAttribute('data-menu-initialized')) {
      console.warn('Already initialized');
      return;
    }
    this.#rootElement = root;
    this.#defaults = this.#mergeOptions(this.#defaults, Menu.defaults);
    this.#settings = this.#mergeOptions(this.#defaults, options);
    matchMedia('(prefers-reduced-motion: reduce)').matches &&
      Object.assign(this.#settings.animation, { duration: 0 });
    const { isSubmenu = false, isPortal = false } = _internal;
    this.#isSubmenu = isSubmenu;
    this.#isPortal = isPortal;
    const { selector } = this.#settings;
    this.#triggerElement = this.#rootElement.querySelector(
      selector[!this.#isSubmenu ? 'trigger' : 'item'],
    );
    this.#listElement = this.#rootElement.querySelector(selector.list);
    if (!this.#listElement) {
      console.warn('Missing list element');
      return;
    }
    this.#itemElements = [
      ...this.#listElement.querySelectorAll(
        `${selector.item}:not(:scope ${selector.list} *)`,
      ),
    ];
    if (!this.#itemElements.length) {
      console.warn('Missing item elements');
      return;
    }
    this.#itemElements.forEach((item) => {
      const value = item.ariaKeyShortcuts;
      const keys = (value?.split(/\s+/) ?? [item.textContent?.trim()[0] ?? ''])
        .filter((key) => /^\S$/i.test(key))
        .map((key) => key.toLowerCase());
      keys.forEach((key) => {
        const items = this.#itemElementsByFirstChar.get(key) ?? [];
        items.push(item);
        this.#itemElementsByFirstChar.set(key, items);
      });
      const first = keys[0];
      if (!value && first) {
        saveAttributes([item], ['aria-keyshortcuts']);
        item.setAttribute('aria-keyshortcuts', first);
      }
      const role = item.role;
      if (role === 'menuitemcheckbox') {
        this.#checkboxItemElements.push(item);
      } else if (role === 'menuitemradio') {
        this.#radioItemElements.push(item);
      }
    });
    this.#radioItemElements.forEach((item) => {
      let group = item.closest(selector.group);
      if (!group || !this.#rootElement.contains(group)) {
        group = this.#rootElement;
      }
      const items = this.#radioItemElementsByGroup.get(group) ?? [];
      items.push(item);
      this.#radioItemElementsByGroup.set(group, items);
    });
    const settings =
      this.#settings.popover[!this.#isSubmenu ? 'menu' : 'submenu'];
    if (settings.arrow) {
      this.#arrowElement = document.createElement('div');
      this.#arrowElement.setAttribute('data-menu-arrow', '');
      this.#listElement.appendChild(this.#arrowElement);
      const index = settings.middleware.findIndex((m) => m.name === 'arrow');
      const option = arrow({ element: this.#arrowElement });
      if (index !== -1) {
        settings.middleware.splice(index, 1);
      }
      settings.middleware.push(option);
    } else {
      this.#arrowElement = null;
    }
    this.#initialize();
  }
  open() {
    this.#toggle(true);
  }
  close() {
    this.#toggle(false);
  }
  async destroy(force = false) {
    if (this.#isDestroyed) {
      return;
    }
    this.#isDestroyed = true;
    this.#controller?.abort();
    this.#controller = null;
    this.#cleanupPortal?.();
    this.#cleanupPortal = null;
    this.#cleanupPopover?.();
    this.#cleanupPopover = null;
    this.#clearSubmenuTimer();
    Menu.#menus = Menu.#menus.filter((menu) => menu !== this);
    this.#submenus &&
      (await Promise.all(this.#submenus.map((submenu) => submenu.destroy())));
    if (!force) {
      try {
        await this.#animation?.finished;
      } catch {}
    }
    this.#animation?.cancel();
    this.#animation = null;
    restoreAttributes([
      this.#triggerElement,
      this.#listElement,
      ...this.#itemElements,
    ]);
    this.#triggerElement = null;
    this.#listElement = null;
    this.#itemElements.length = 0;
    this.#itemElementsByFirstChar.clear();
    this.#checkboxItemElements.length = 0;
    this.#radioItemElements.length = 0;
    this.#arrowElement = null;
    this.#rootElement.removeAttribute('data-menu-initialized');
  }
  #initialize() {
    this.#controller = new AbortController();
    const { signal } = this.#controller;
    document.addEventListener('pointerdown', this.#onOutsidePointerDown, {
      capture: true,
      signal,
    });
    this.#rootElement.addEventListener('focusin', this.#onRootFocusIn, {
      signal,
    });
    this.#rootElement.addEventListener('focusout', this.#onRootFocusOut, {
      signal,
    });
    if (!this.#listElement) {
      throw new Error('Unreachable');
    }
    saveAttributes([this.#listElement], ['aria-labelledby', 'id', 'role']);
    if (this.#triggerElement) {
      saveAttributes(
        [this.#triggerElement],
        [
          'aria-controls',
          'aria-disabled',
          'aria-expanded',
          'aria-haspopup',
          'id',
          'tabindex',
        ],
      );
      const id = Math.random().toString(36).slice(-8);
      this.#listElement.id ||= `menu-list-${id}`;
      addTokenToAttribute(
        this.#triggerElement,
        'aria-controls',
        this.#listElement.id,
      );
      this.#triggerElement.setAttribute('aria-expanded', 'false');
      this.#triggerElement.setAttribute('aria-haspopup', 'true');
      this.#triggerElement.id ||= `menu-trigger-${id}`;
      this.#triggerElement.setAttribute(
        'tabindex',
        isFocusable(this.#triggerElement) && !this.#isSubmenu ? '0' : '-1',
      );
      if (!isFocusable(this.#triggerElement)) {
        this.#triggerElement.setAttribute('aria-disabled', 'true');
        this.#triggerElement.style.setProperty('pointer-events', 'none');
      }
      this.#triggerElement.addEventListener('click', this.#onTriggerClick, {
        signal,
      });
      this.#triggerElement.addEventListener('keydown', this.#onTriggerKeyDown, {
        signal,
      });
      addTokenToAttribute(
        this.#listElement,
        'aria-labelledby',
        this.#triggerElement.id,
      );
    }
    this.#listElement.setAttribute('role', 'menu');
    this.#listElement.addEventListener('keydown', this.#onListKeyDown, {
      signal,
    });
    saveAttributes(this.#itemElements, [
      'aria-disabled',
      'data-menu-disabled',
      'role',
      'style',
      'tabindex',
    ]);
    this.#itemElements.forEach((item) => {
      const parent = item.parentElement;
      if (parent?.querySelector(this.#settings.selector.list)) {
        this.#submenus.push(
          new Menu(parent, this.#settings, {
            isSubmenu: true,
            isPortal: !!this.#triggerElement,
          }),
        );
      } else if (item.hasAttribute('disabled') || item.tabIndex < 0) {
        item.setAttribute('aria-disabled', 'true');
        item.setAttribute('data-menu-disabled', '');
        item.style.setProperty('pointer-events', 'none');
      }
      [this.#checkboxItemElements, this.#radioItemElements].every(
        (list) => !list.includes(item),
      ) && item.setAttribute('role', 'menuitem');
      item.addEventListener('blur', this.#onItemBlur, { signal });
      item.addEventListener('focus', this.#onItemFocus, { signal });
      item.addEventListener('pointerenter', this.#onItemPointerEnter, {
        signal,
      });
      item.addEventListener('pointerleave', this.#onItemPointerLeave, {
        signal,
      });
    });
    this.#checkboxItemElements.forEach((item) => {
      item.setAttribute('role', 'menuitemcheckbox');
      item.addEventListener('click', this.#onCheckboxItemClick, { signal });
    });
    this.#radioItemElements.forEach((item) => {
      item.setAttribute('role', 'menuitemradio');
      item.addEventListener('click', this.#onRadioItemClick, { signal });
    });
    this.#resetTabIndex();
    !this.#isSubmenu &&
      this.#rootElement.setAttribute('data-menu-initialized', '');
    Menu.#menus.push(this);
  }
  #onOutsidePointerDown = (event) => {
    if (!this.#triggerElement || this.#includesRoot(event)) {
      return;
    }
    this.#resetTabIndex();
    this.close();
  };
  #onRootFocusIn = (event) => {
    const target = event.currentTarget;
    const active = getActiveElement();
    if (!(target instanceof HTMLElement) || !(active instanceof HTMLElement)) {
      return;
    }
    !this.#containsRoot(target) &&
      !this.#containsRoot(active) &&
      this.#resetTabIndex(true);
  };
  #onRootFocusOut = (event) => {
    const target = event.relatedTarget;
    if (
      !(target instanceof HTMLElement) || // Not a type guard
      !this.#containsRoot(target)
    ) {
      this.#resetTabIndex();
      this.close();
    }
  };
  #onTriggerClick = (event) => {
    event.preventDefault();
    this.#toggle(
      !this.#isSubmenu
        ? this.#triggerElement?.ariaExpanded !== 'true'
        : event.currentTarget === this.#triggerElement,
    );
  };
  #onTriggerKeyDown = (event) => {
    const { key } = event;
    if (
      ![
        'Enter',
        ' ',
        ...(!this.#isSubmenu ? ['ArrowUp', 'ArrowDown'] : ['ArrowRight']),
      ].includes(key)
    ) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (key !== 'Enter' && key !== ' ') {
      this.open();
    }
    const focusables = this.#itemElements.filter(isFocusable);
    let index = 0;
    switch (key) {
      case 'Enter':
      case ' ':
        this.#triggerElement?.click();
        return;
      case 'ArrowUp':
        index = -1;
        break;
      case 'ArrowRight':
        return;
      case 'ArrowDown':
        index = 0;
        break;
    }
    focusables.at(index)?.focus();
  };
  #onListKeyDown = (event) => {
    const { shiftKey, key } = event;
    if (key === 'Tab' && ((!this.#triggerElement && shiftKey) || !shiftKey)) {
      return;
    }
    if (shiftKey && key === 'Tab') {
      this.close();
      requestAnimationFrame(() => this.#triggerElement?.focus());
      return;
    }
    console.log;
    if (
      ![
        'Enter',
        'Escape',
        ' ',
        'End',
        'Home',
        ...(this.#isSubmenu ? ['ArrowLeft'] : []),
        'ArrowUp',
        'ArrowDown',
      ].includes(key)
    ) {
      const isChar = /^\S$/i.test(key);
      if (
        !isChar ||
        !this.#itemElementsByFirstChar.get(key.toLowerCase())?.some(isFocusable)
      ) {
        isChar && event.stopPropagation();
        return;
      }
    }
    event.preventDefault();
    event.stopPropagation();
    const focusables = this.#itemElements.filter(isFocusable);
    const active = getActiveElement();
    if (!(active instanceof HTMLElement)) {
      return;
    }
    const currentIndex = focusables.indexOf(active);
    let newIndex = currentIndex;
    let target = focusables;
    switch (key) {
      case 'Tab':
      case 'Escape':
      case 'ArrowLeft':
        this.close();
        return;
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
      default: {
        target =
          this.#itemElementsByFirstChar
            .get(key.toLowerCase())
            ?.filter(isFocusable) ?? [];
        const foundIndex = target.findIndex(
          (focusable) => focusables.indexOf(focusable) > currentIndex,
        );
        newIndex = foundIndex !== -1 ? foundIndex : 0;
      }
    }
    target.at(newIndex)?.focus();
  };
  #onItemBlur = (event) => {
    const item = event.currentTarget;
    if (!(item instanceof HTMLElement)) {
      return;
    }
    item.setAttribute('tabindex', '-1');
  };
  #onItemFocus = (event) => {
    const item = event.currentTarget;
    if (!(item instanceof HTMLElement)) {
      return;
    }
    item.setAttribute('tabindex', '0');
  };
  #onItemPointerEnter = (event) => {
    this.#clearSubmenuTimer();
    const item = event.currentTarget;
    if (!(item instanceof HTMLElement)) {
      return;
    }
    this.#submenuTimer = setTimeout(() => {
      this.#submenus.forEach((submenu) => {
        submenu.#toggle(submenu.#triggerElement === item);
      });
      item.setAttribute('tabindex', '0');
      item.focus();
    }, this.#settings.delay);
  };
  #onItemPointerLeave = () => {
    this.#clearSubmenuTimer();
  };
  #onCheckboxItemClick = (event) => {
    const item = event.currentTarget;
    if (!(item instanceof HTMLElement)) {
      return;
    }
    item.setAttribute('aria-checked', String(item.ariaChecked !== 'true'));
  };
  #onRadioItemClick = (event) => {
    const item = event.currentTarget;
    if (!(item instanceof HTMLElement)) {
      return;
    }
    const group =
      item.closest(this.#settings.selector.group) ?? this.#rootElement;
    this.#radioItemElementsByGroup.get(group)?.forEach((i) => {
      i.setAttribute('aria-checked', String(i === item));
    });
  };
  #toggle(isOpen) {
    if (this.#triggerElement?.ariaExpanded === String(isOpen)) {
      return;
    }
    this.#triggerElement?.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) {
      Menu.#menus
        .filter((m) => !m.#containsRoot(this.#rootElement))
        .forEach((menu) => {
          menu.close();
        });
      if (!this.#listElement) {
        throw new Error('Unreachable');
      }
      if ((!this.#isSubmenu && this.#triggerElement) || !this.#isPortal) {
        const style = this.#listElement.style;
        style.setProperty('position', 'fixed');
        this.#cleanupPortal = createPortal(this.#listElement);
        requestAnimationFrame(() => style.removeProperty('position'));
      }
      requestAnimationFrame(() =>
        this.#listElement?.setAttribute('data-menu-open', ''),
      );
      const { style } = this.#listElement;
      style.setProperty('display', 'block');
      style.setProperty('opacity', '0');
      this.#triggerElement && this.#updatePopover();
      this.#itemElements.find(isFocusable)?.focus();
    } else {
      this.#clearSubmenuTimer();
      /*
            this.#submenus.forEach((submenu) => {
              submenu.close();
            });
            */
      const active = getActiveElement();
      if (!(active instanceof HTMLElement)) {
        return;
      }
      this.#triggerElement &&
        this.#containsRoot(active) &&
        this.#triggerElement.focus();
    }
    // Skip if not in popover mode
    if (!this.#triggerElement) {
      return;
    }
    if (!this.#listElement) {
      throw new Error('Unreachable');
    }
    if (!isOpen) {
      this.#listElement.removeAttribute('data-menu-open');
      this.#cleanupPopover?.();
      this.#cleanupPopover = null;
    }
    const opacity = getComputedStyle(this.#listElement).getPropertyValue(
      'opacity',
    );
    this.#animation?.cancel();
    this.#animation = this.#listElement.animate(
      { opacity: isOpen ? [opacity, '1'] : [opacity, '0'] },
      { duration: this.#settings.animation.duration, easing: 'ease' },
    );
    const cleanupAnimation = () => {
      this.#animation = null;
    };
    const { signal } = this.#controller ?? new AbortController();
    this.#animation.addEventListener('cancel', cleanupAnimation, {
      once: true,
      signal,
    });
    this.#animation.addEventListener(
      'finish',
      () => {
        cleanupAnimation();
        if (!this.#listElement) {
          throw new Error('Unreachable');
        }
        const { style } = this.#listElement;
        if (!isOpen) {
          this.#cleanupPortal?.();
          this.#cleanupPortal = null;
          this.#listElement.removeAttribute('data-menu-placement');
          style.setProperty('display', 'none');
          ['left', 'top', 'transform-origin'].forEach((name) => {
            style.removeProperty(name);
          });
          if (this.#arrowElement) {
            ['left', 'top', 'rotate'].forEach((name) => {
              this.#arrowElement?.style.removeProperty(name);
            });
          }
        }
        style.removeProperty('opacity');
      },
      { once: true, signal },
    );
  }
  #clearSubmenuTimer() {
    if (this.#submenuTimer !== undefined) {
      clearTimeout(this.#submenuTimer);
      this.#submenuTimer = undefined;
    }
  }
  #containsRoot(element) {
    return (
      this.#rootElement.contains(element) ||
      this.#listElement?.contains(element)
    );
  }
  #includesRoot(event) {
    const path = event.composedPath();
    if (!this.#listElement) {
      return false;
    }
    return path.includes(this.#rootElement) || path.includes(this.#listElement);
  }
  #mergeOptions(target, source) {
    return {
      ...target,
      ...source,
      animation: { ...target.animation, ...(source.animation ?? {}) },
      popover: {
        ...target.popover,
        ...(source.popover ?? {}),
        menu: {
          ...target.popover?.menu,
          ...(source.popover?.menu ?? {}),
          middleware: Object.assign(
            [...(target.popover?.menu?.middleware ?? [])],
            [...(source.popover?.menu?.middleware ?? [])],
          ),
        },
        submenu: {
          ...target.popover?.submenu,
          ...(source.popover?.submenu ?? {}),
          middleware: Object.assign(
            [...(target.popover?.submenu?.middleware ?? [])],
            [...(source.popover?.submenu?.middleware ?? [])],
          ),
        },
      },
      selector: { ...target.selector, ...(source.selector ?? {}) },
    };
  }
  #resetTabIndex(isForce = false) {
    if (this.#triggerElement || isForce) {
      this.#itemElements.forEach((item) => {
        item.setAttribute('tabindex', '-1');
      });
    } else {
      let isFound = false;
      this.#itemElements.forEach((item) => {
        if (!isFound && isFocusable(item)) {
          isFound = true;
          item.setAttribute('tabindex', '0');
        } else {
          item.setAttribute('tabindex', '-1');
        }
      });
    }
  }
  #updatePopover() {
    if (!this.#triggerElement) {
      return;
    }
    const compute = () => {
      if (!this.#triggerElement || !this.#listElement) {
        return;
      }
      const options =
        this.#settings.popover[!this.#isSubmenu ? 'menu' : 'submenu'];
      computePosition(this.#triggerElement, this.#listElement, {
        ...options,
        placement: options.placement,
      }).then(({ x: listX, y: listY, placement, middlewareData }) => {
        if (!this.#listElement) {
          throw new Error('Unreachable');
        }
        const { style: listStyle } = this.#listElement;
        listStyle.setProperty('left', `${listX}px`);
        listStyle.setProperty('top', `${listY}px`);
        this.#listElement.setAttribute('data-menu-placement', placement);
        if (this.#settings.popover.transformOrigin) {
          listStyle.setProperty(
            'transform-origin',
            {
              top: '50% 100%',
              'top-start': '0 100%',
              'top-end': '100% 100%',
              right: '0 50%',
              'right-start': '0 0',
              'right-end': '0 100%',
              bottom: '50% 0',
              'bottom-start': '0 0',
              'bottom-end': '100% 0',
              left: '100% 50%',
              'left-start': '100% 0',
              'left-end': '100% 100%',
            }[placement],
          );
        }
        // Skip if not in arrow mode
        if (!this.#arrowElement) {
          return;
        }
        const arrowX = middlewareData.arrow?.x;
        const arrowY = middlewareData.arrow?.y;
        const { style: arrowStyle } = this.#arrowElement;
        arrowStyle.setProperty('left', arrowX ? `${arrowX}px` : '');
        arrowStyle.setProperty(
          'top',
          arrowY ? `${arrowY - this.#arrowElement.offsetHeight / 2}px` : '',
        );
        const side = placement.split('-')[0];
        if (!side) {
          return;
        }
        const styles = {
          top: { position: 'bottom', rotate: '225deg' },
          right: { position: 'left', rotate: '315deg' },
          bottom: { position: 'top', rotate: '45deg' },
          left: { position: 'right', rotate: '135deg' },
        }[side];
        if (!styles) {
          return;
        }
        arrowStyle.setProperty(
          styles.position,
          `${this.#arrowElement.offsetWidth / -2}px`,
        );
        arrowStyle.setProperty('rotate', styles.rotate);
      });
    };
    compute();
    if (!this.#cleanupPopover) {
      this.#cleanupPopover = autoUpdate(
        this.#triggerElement,
        this.#listElement,
        compute,
      );
    }
  }
}
// -----------------------------------------------------------------------------
// Utils
// -----------------------------------------------------------------------------
function getActiveElement() {
  let current = document.activeElement;
  while (current?.shadowRoot?.activeElement) {
    current = current.shadowRoot.activeElement;
  }
  return current;
}
function isFocusable(element) {
  return (
    !element.hasAttribute('data-menu-disabled') &&
    !element.hasAttribute('disabled')
  );
}

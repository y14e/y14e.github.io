const FOCUSABLE_SELECTOR = ':is(a[href], area[href], button, embed, iframe, input:not([type="hidden"]), object, select, details > summary:first-of-type, textarea, [contenteditable]:not([contenteditable="false"]), [controls], [tabindex]):not([disabled], [hidden], [tabindex="-1"])';

export function hasFocusableElement(container) {
  return !!getFocusableElements(container).length;
}

export function getFocusableElements(container) {
  return [...container.querySelectorAll(FOCUSABLE_SELECTOR)].filter(element => element.checkVisibility());
}

function getFocusableElementByOffset(offset, container, current, loop = false) {
  const focusables = getFocusableElements(container || document.body);
  const length = focusables.length;
  if (length === 0) {
    return null;
  }
  const currentIndex = focusables.indexOf(current || document.activeElement);
  if (currentIndex === -1) {
    return null;
  }
  const newIndex = currentIndex + offset;
  if (!loop) {
    if (newIndex < 0 || newIndex >= length) {
      return null;
    }
    return focusables[newIndex];
  }
  return focusables[(newIndex + length) % length];
}

export function getNextFocusableElement(container, current, loop = false) {
  return getFocusableElementByOffset(1, container, current, loop);
}

export function getPreviousFocusableElement(container, current, loop = false) {
  return getFocusableElementByOffset(-1, container, current, loop);
}

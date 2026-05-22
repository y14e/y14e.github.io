/**
 * machine-translation.ts
 *
 * @version 1.0.4
 * @author Yusuke Kamiyamane
 * @license MIT
 * @copyright Copyright (c) Yusuke Kamiyamane
 * @see {@link https://github.com/y14e/machine-translation-ts}
 */
// -----------------------------------------------------------------------------
// APIs
// -----------------------------------------------------------------------------
let isInitialized = false;
export function detectMachineTranslation() {
  if (isInitialized) {
    console.warn('Already initialized');
    return () => {};
  }
  const html = document.documentElement;
  const title = document.querySelector('title');
  if (!title) {
    throw new Error('Missing <title> element');
  }
  const language = new Intl.Locale(navigator.language).language;
  const strategies = [
    {
      attribute: 'class',
      element: html,
      test: () =>
        [...html.classList].some((className) =>
          /translated-(ltr|rtl)/.test(className),
        ),
    },
    {
      attribute: '_msttexthash',
      element: title,
      test: () => title.hasAttribute('_msttexthash'),
    },
    {
      attribute: 'lang',
      element: html,
      test: () => new Intl.Locale(html.lang).language !== language,
    },
  ];
  const map = new Map();
  for (const { attribute, element } of strategies) {
    (map.has(element)
      ? map.get(element)
      : map.set(element, []).get(element)
    ).push(attribute);
  }
  let timer;
  function onMutate() {
    if (timer !== undefined) {
      return;
    }
    timer = requestAnimationFrame(() => {
      if (!strategies.some((strategy) => strategy.test())) {
        return;
      }
      window.dispatchEvent(new Event('machineTranslationDetected'));
      observer?.disconnect();
      observer = null;
    });
  }
  let observer = new MutationObserver(onMutate);
  for (const [element, attributes] of map) {
    observer.observe(element, { attributeFilter: attributes });
  }
  isInitialized = true;
  return () => {
    observer?.disconnect();
    observer = null;
    if (timer !== undefined) {
      cancelAnimationFrame(timer);
      timer = undefined;
    }
  };
}

export function detectMachineTranslation() {
  const html = document.documentElement;
  const title = document.getElementsByTagName('title')[0];
  const language = new Intl.Locale(navigator.language).language;
  const strategies = [
    {
      attribute: 'class',
      element: html,
      test: () => {
        return [...html.classList].some((className) => {
          return /translated-(ltr|rtl)/.test(className);
        });
      },
    },
    {
      attribute: '_msttexthash',
      element: title,
      test: () => {
        return title.hasAttribute('_msttexthash');
      },
    },
    {
      attribute: 'lang',
      element: html,
      test: () => {
        return new Intl.Locale(html.lang).language !== language;
      },
    },
  ];
  let timer;
  const detect = () => {
    if (timer !== undefined) {
      return;
    }
    timer = requestAnimationFrame(() => {
      const isTranslated = strategies.some((strategy) => {
        return strategy.test();
      });
      if (!isTranslated) {
        return;
      }
      window.dispatchEvent(new Event('machineTranslationDetected'));
      observer?.disconnect();
      observer = null;
    });
  };
  const attributeMap = new Map();
  for (const { element } of strategies) {
    if (!attributeMap.has(element)) {
      attributeMap.set(element, []);
    }
  }
  for (const { attribute, element } of strategies) {
    const attributes = attributeMap.get(element);
    if (attributes !== undefined) {
      attributes.push(attribute);
    }
  }
  let observer = new MutationObserver(detect);
  for (const [element, attributes] of attributeMap) {
    observer.observe(element, { attributeFilter: attributes });
  }
  return () => {
    observer?.disconnect();
    observer = null;
    if (timer !== undefined) {
      cancelAnimationFrame(timer);
      timer = undefined;
    }
  };
}

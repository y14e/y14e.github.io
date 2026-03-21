export function detectTripleClick(element) {
  element.addEventListener('click', (event) => {
    const { detail, target } = event;
    if (detail === 3) {
      target.dispatchEvent(
        new MouseEvent('tripleClick', {
          bubbles: true,
          cancelable: true,
          detail: 3,
          view: window,
        }),
      );
    }
  });
}

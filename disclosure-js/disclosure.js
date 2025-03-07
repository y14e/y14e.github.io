class Disclosure {
  constructor(root, options) {
    this.root = root;
    this.defaults = {
      animation: {
        duration: 300,
        easing: 'ease',
      },
    };
    this.settings = {
      animation: { ...this.defaults.animation, ...options?.animation },
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) this.settings.animation.duration = 0;
    const NOT_NESTED = ':not(:scope summary + * *)';
    this.detailses = this.root.querySelectorAll(`details${NOT_NESTED}`);
    this.summaries = this.root.querySelectorAll(`summary${NOT_NESTED}`);
    this.contents = this.root.querySelectorAll(`summary${NOT_NESTED} + *`);
    if (!this.detailses.length || !this.summaries.length || !this.contents.length) return;
    this.animations = Array(this.detailses.length).fill(null);
    this.initialize();
  }

  initialize() {
    this.detailses.forEach(details => {
      if (details.hasAttribute('name')) details.setAttribute('data-disclosure-name', details.getAttribute('name'));
      const setData = () => details.setAttribute('data-disclosure-open', String(details.hasAttribute('open')));
      new MutationObserver(setData).observe(details, { attributeFilter: ['open'] });
      setData();
    });
    this.summaries.forEach(summary => {
      summary.addEventListener('click', event => this.handleSummaryClick(event));
      summary.addEventListener('keydown', event => this.handleSummaryKeyDown(event));
    });
    this.root.setAttribute('data-disclosure-initialized', '');
  }

  toggle(details, isOpen) {
    if ((details.getAttribute('data-disclosure-open') === 'true') === isOpen) return;
    const name = details.getAttribute('data-disclosure-name');
    if (name) {
      details.removeAttribute('name');
      const opened = document.querySelector(`details[data-disclosure-name="${name}"][data-disclosure-open="true"]`);
      if (isOpen && opened && opened !== details) this.close(opened);
    }
    details.setAttribute('data-disclosure-open', String(isOpen));
    const height = `${details.offsetHeight}px`;
    if (isOpen) details.setAttribute('open', '');
    details.style.setProperty('overflow', 'clip');
    details.style.setProperty('will-change', [...new Set(window.getComputedStyle(details).getPropertyValue('will-change').split(',')).add('height').values()].filter(value => value !== 'auto').join(','));
    const index = [...this.detailses].indexOf(details);
    let animation = this.animations[index];
    if (animation) animation.cancel();
    const content = details.querySelector('summary + *');
    content.removeAttribute('hidden');
    animation = this.animations[index] = details.animate({ height: [height, `${details.querySelector('summary').scrollHeight + (isOpen ? content.scrollHeight : 0)}px`] }, { duration: this.settings.animation.duration, easing: this.settings.animation.easing });
    animation.addEventListener('finish', () => {
      this.animations[index] = null;
      if (name) details.setAttribute('name', details.getAttribute('data-disclosure-name'));
      if (!isOpen) details.removeAttribute('open');
      ['height', 'overflow', 'will-change'].forEach(name => details.style.removeProperty(name));
    });
  }

  handleSummaryClick(event) {
    event.preventDefault();
    const details = event.currentTarget.parentElement;
    this.toggle(details, details.getAttribute('data-disclosure-open') !== 'true');
  }

  handleSummaryKeyDown(event) {
    const { key } = event;
    if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(key)) return;
    event.preventDefault();
    const nonDisabledSummaries = [...this.summaries].filter(summary => summary.getAttribute('aria-disabled') !== 'true');
    const currentIndex = nonDisabledSummaries.indexOf(document.activeElement);
    const length = nonDisabledSummaries.length;
    let newIndex = currentIndex;
    switch (key) {
      case 'ArrowUp':
        newIndex = (currentIndex - 1 + length) % length;
        break;
      case 'ArrowDown':
        newIndex = (currentIndex + 1) % length;
        break;
      case 'Home':
        newIndex = 0;
        break;
      case 'End':
        newIndex = length - 1;
        break;
    }
    nonDisabledSummaries[newIndex].focus();
  }

  open(details) {
    this.toggle(details, true);
  }

  close(details) {
    this.toggle(details, false);
  }
}

export default Disclosure;

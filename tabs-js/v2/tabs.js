class Tabs {
  constructor(root, props) {
    this.root = root;
    this.props = {
      autoActivation: true,
      avoidDuplicates: false,
      ...props,
      selector: {
        list: '[role="tablist"]',
        tab: '[role="tab"]',
        indicator: '[data-tabs-indicator]',
        content: '[role="tablist"] + *',
        panel: '[role="tabpanel"]',
        ...props?.selector,
      },
      animation: {
        crossFade: true,
        duration: 300,
        easing: 'ease',
        indicatorDuration: 300,
        indicatorEasing: 'ease',
        ...props?.animation,
      },
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) this.props.animation.duration = this.props.animation.indicatorDuration = 0;
    const NOT_NESTED = `:not(:scope ${this.props.selector.panel} *)`;
    this.lists = this.root.querySelectorAll(`${this.props.selector.list}${NOT_NESTED}`);
    this.tabs = this.root.querySelectorAll(`${this.props.selector.tab}${NOT_NESTED}`);
    this.indicators = this.root.querySelectorAll(`${this.props.selector.indicator}${NOT_NESTED}`);
    this.content = this.root.querySelector(`${this.props.selector.content}${NOT_NESTED}`);
    this.panels = this.root.querySelectorAll(`${this.props.selector.panel}${NOT_NESTED}`);
    if (!this.lists.length || !this.tabs.length || !this.content || !this.panels.length) return;
    this._activeIndex = this.root.hasAttribute('data-tabs-default-active-index') ? Number(this.root.getAttribute('data-tabs-default-active-index')) : 0;
    this.initialize();
  }

  get activeIndex() {
    return this._activeIndex;
  }

  set activeIndex(index) {
    this._activeIndex = index;
    this.handleActiveIndexChange();
  }

  initialize() {
    this.lists.forEach((list, i) => {
      if (this.props.avoidDuplicates && i > 0) list.setAttribute('aria-hidden', 'true');
      list.addEventListener('keydown', event => this.handleKeyDown(event));
    });
    this.tabs.forEach((tab, i) => {
      const id = Math.random().toString(36).slice(-8);
      if (i < this.panels.length) {
        tab.setAttribute('id', tab.getAttribute('id') || `tab-${id}`);
        const panel = this.panels[i];
        panel.setAttribute('id', panel.getAttribute('id') || `tab-panel-${id}`);
      }
      tab.setAttribute('aria-controls', this.panels[i % this.panels.length].getAttribute('id'));
      tab.setAttribute('tabindex', tab.getAttribute('aria-selected') === 'true' ? '0' : '-1');
      tab.addEventListener('click', event => this.handleClick(event));
    });
    if (this.indicators.length) {
      this.indicators.forEach(indicator => {
        const list = indicator.closest(this.props.selector.list);
        list.style.setProperty('position', 'relative');
        indicator.style.setProperty('display', 'block');
        indicator.style.setProperty('position', 'absolute');
        new TabsIndicator(indicator, list, this.props);
      });
    }
    this.panels.forEach((panel, i) => {
      panel.setAttribute('aria-labelledby', `${panel.getAttribute('aria-labelledby') || ''} ${this.tabs[i].getAttribute('id')}`.trim());
      if (panel.hasAttribute('hidden')) {
        panel.setAttribute('hidden', 'until-found');
        panel.setAttribute('tabindex', '0');
      }
      panel.addEventListener('beforematch', event => this.handleBeforeMatch(event));
    });

    // Fix for WebKit
    if (!['auto', '0px'].includes(window.getComputedStyle(this.content).getPropertyValue('min-height'))) {
      this.panels.forEach(panel => {
        new ResizeObserver(() => {
          if (panel.hasAttribute('hidden')) return;
          window.requestAnimationFrame(() => panel.closest(this.props.selector.content).style.setProperty('height', `${panel.scrollHeight}px`));
        }).observe(panel);
      });
    }

    this.activeIndex = this._activeIndex;
    window.setTimeout(() => this.root.setAttribute('data-tabs-initialized', ''), 100);
  }

  handleClick(event) {
    event.preventDefault();
    if (this.root.hasAttribute('data-tabs-animating')) return;
    this.activeIndex = [...this.tabs].indexOf(event.currentTarget) % this.panels.length;
  }

  handleKeyDown(event) {
    const list = event.currentTarget;
    const isHorizontal = list.getAttribute('aria-orientation') !== 'vertical';
    const previous = `Arrow${isHorizontal ? 'Left' : 'Up'}`;
    const next = `Arrow${isHorizontal ? 'Right' : 'Down'}`;
    const { key } = event;
    if (![' ', 'Enter', previous, next, 'Home', 'End'].includes(key)) return;
    event.preventDefault();
    if (this.root.hasAttribute('data-tabs-animating')) return;
    const focusables = list.querySelectorAll(`${this.props.selector.tab}:not(:disabled)`);
    const active = document.activeElement;
    const currentIndex = [...focusables].indexOf(active);
    const length = focusables.length;
    let newIndex = currentIndex;
    switch (key) {
      case ' ':
      case 'Enter':
        active.click();
        return;
      case previous:
        newIndex = (currentIndex - 1 + length) % length;
        break;
      case next:
        newIndex = (currentIndex + 1) % length;
        break;
      case 'Home':
        newIndex = 0;
        break;
      case 'End':
        newIndex = length - 1;
        break;
    }
    const tab = focusables[newIndex];
    tab.focus();
    if (this.props.autoActivation) tab.click();
  }

  handleBeforeMatch(event) {
    document.querySelector(`[aria-controls="${event.currentTarget.getAttribute('id')}"]`).click();
  }

  handleActiveIndexChange() {
    this.activate(this.tabs[this.activeIndex]);
  }

  activate(tab) {
    if (tab.getAttribute('aria-selected') === 'true') return;
    const root = this.root;
    root.setAttribute('data-tabs-animating', '');
    const id = tab.getAttribute('aria-controls');
    [...this.tabs].forEach(tab => {
      const isSelected = tab.getAttribute('aria-controls') === id;
      tab.setAttribute('aria-selected', String(isSelected));
      tab.setAttribute('tabindex', isSelected ? '0' : '-1');
    });
    this.content.style.setProperty('overflow', 'clip');
    this.content.style.setProperty('position', 'relative');
    this.content.style.setProperty('will-change', [...new Set(window.getComputedStyle(this.content).getPropertyValue('will-change').split(',')).add('height').values()].filter(value => value !== 'auto').join(','));
    [...this.panels].forEach(panel => {
      panel.style.setProperty('position', 'absolute');
      if (!panel.hasAttribute('hidden') || panel.getAttribute('id') === id) {
        panel.style.setProperty('content-visibility', 'visible');

        // Fix for WebKit
        panel.style.setProperty('display', 'block');
      }
      if (!this.props.animation.crossFade && panel.getAttribute('id') !== id) panel.style.setProperty('visibility', 'hidden');
    });
    const duration = this.root.hasAttribute('data-tabs-initialized') ? this.props.animation.duration : 0;
    this.content.animate({ height: [`${[...this.panels].find(panel => !panel.hasAttribute('hidden')).scrollHeight}px`, `${document.getElementById(id).scrollHeight}px`] }, { duration: duration, easing: this.props.animation.easing }).addEventListener('finish', () => {
      root.removeAttribute('data-tabs-animating');
      ['height', 'overflow', 'position', 'will-change'].forEach(name => this.content.style.removeProperty(name));
      [...this.panels].forEach(panel => ['content-visibility', 'display', 'position', 'visibility'].forEach(name => panel.style.removeProperty(name)));
    });
    [...this.panels].forEach(panel => {
      if (panel.getAttribute('id') === id) {
        panel.removeAttribute('hidden');
        panel.setAttribute('tabindex', '0');
      } else {
        panel.setAttribute('hidden', 'until-found');
        panel.removeAttribute('tabindex');
      }
      if (this.props.animation.crossFade) {
        panel.style.setProperty('will-change', [...new Set(window.getComputedStyle(panel).getPropertyValue('will-change').split(',')).add('opacity').values()].filter(value => value !== 'auto').join(','));
        panel.animate({ opacity: !panel.hasAttribute('hidden') ? [0, 1] : [1, 0] }, { duration: duration, easing: 'ease' }).addEventListener('finish', () => panel.style.removeProperty('will-change'));
      }
    });
  }
}

class TabsIndicator {
  constructor(indicator, list, props) {
    this.indicator = indicator;
    this.list = list;
    this.props = props;
    this.initialize();
  }

  initialize() {
    new ResizeObserver(() => this.update()).observe(this.list);
    new MutationObserver(() => this.update()).observe(this.list, { attributeFilter: ['aria-selected'], subtree: true });
  }

  update() {
    const isHorizontal = this.list.getAttribute('aria-orientation') !== 'vertical';
    const position = isHorizontal ? 'left' : 'top';
    const size = isHorizontal ? 'width' : 'height';
    this.indicator.style.setProperty('will-change', [...new Set(window.getComputedStyle(this.indicator).getPropertyValue('will-change').split(',')).add(position).add(size).values()].filter(value => value !== 'auto').join(','));
    const rect = this.list.querySelector('[aria-selected="true"]').getBoundingClientRect();
    this.indicator.animate({ [position]: `${rect[position] - this.list.getBoundingClientRect()[position]}px`, [size]: `${rect[size]}px` }, { duration: this.props.animation.indicatorDuration, easing: this.props.animation.indicatorEasing, fill: 'forwards' }).addEventListener('finish', () => this.indicator.style.removeProperty('will-change'));
  }
}

export default Tabs;

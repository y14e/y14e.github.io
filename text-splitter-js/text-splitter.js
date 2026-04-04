const NOBR_REGEXP = /[[[\P{scx=Han}]&&[\P{scx=Hang}]&&[\P{scx=Hira}]&&[\P{scx=Kana}]&&[\p{L}]]!-,.->@\[-`\{-~\u00A0]+/gv;
const LBR_PROHIBIT_START_REGEXP = /^[[[\p{Pd}]--[―]]\p{Pe}\p{Pf}\p{Po}\u00A0々〵〻ぁぃぅぇぉっゃゅょゎゕゖ゛-ゞァィゥェォッャュョヮヵヶー-ヾㇰ-ㇿ]|\p{Pi}/v;
const LBR_PROHIBIT_END_REGEXP = /[\p{Pf}\p{Pi}\p{Ps}\p{Sc}\u00A0]$/u;
const LBR_INSEPARATABLE_REGEXP = /[―‥…]/u;

export default class TextSplitter {
  constructor(root, options = {}) {
    if (!root) return;
    this.rootElement = root;
    this.defaults = {
      concatChar: false,
      lineBreakingRules: true,
      wordSegmenter: false,
    };
    this.settings = { ...this.defaults, ...options };
    this.original = this.rootElement.innerHTML;
    this.fragment = new DocumentFragment();
    this.wordElements = [];
    this.charElements = [];
    this.segmenters = {};
    this.destroyed = false;
    this.initialize();
  }

  initialize() {
    for (let node = this.rootElement.firstChild; node; node = node.nextSibling) {
      this.fragment.appendChild(node.cloneNode(true));
    }
    this.nobr();
    this.split('word');
    if (this.settings.lineBreakingRules && !this.settings.concatChar) {
      this.lbr('word');
    }
    this.split('char');
    if (this.settings.lineBreakingRules && this.settings.concatChar) {
      this.lbr('char');
    }
    this.wordElements.forEach((word, i) => {
      word.translate = false;
      word.style.setProperty('--word-index', String(i));
      if (!word.hasAttribute('data-whitespace')) {
        const alt = document.createElement('span');
        alt.setAttribute('data-alt', '');
        alt.style.cssText += `
          border: 0;
          clip: rect(0, 0, 0, 0);
          height: 1px;
          margin: -1px;
          overflow: hidden;
          padding: 0;
          position: absolute;
          user-select: none;
          white-space: nowrap;
          width: 1px;
        `;
        alt.textContent = word.textContent;
        word.append(alt);
      }
    });
    this.charElements.forEach((char, i) => {
      char.setAttribute('aria-hidden', 'true');
      char.style.setProperty('--char-index', String(i));
    });
    this.fragment.querySelectorAll(':is([data-word], [data-char]):not([data-whitespace])').forEach((span) => {
      span.style.setProperty('display', 'inline-block');
      span.style.setProperty('white-space', 'nowrap');
    });
    this.rootElement.replaceChildren(this.fragment);
    this.rootElement.style.setProperty('--word-length', String(this.wordElements.length));
    this.rootElement.style.setProperty('--char-length', String(this.charElements.length));
    this.rootElement.querySelectorAll(':scope > :not([data-word]) [data-char][data-whitespace]').forEach((whitespace) => {
      if (getComputedStyle(whitespace).getPropertyValue('display') !== 'inline') {
        whitespace.innerHTML = '&nbsp;';
      }
    });
    this.rootElement.setAttribute('data-text-splitter-initialized', '');
  }

  getSegmenter(lang, granularity) {
    const key = `${lang}-${granularity}`;
    let segmenter = this.segmenters[key];
    if (segmenter) return segmenter;
    segmenter = this.segmenters[key] = new Intl.Segmenter(lang, { granularity });
    return segmenter;
  }

  nobr(node = this.fragment) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      const matches = text.matchAll(NOBR_REGEXP);
      let index = 0;
      let matched = false;
      for (const match of matches) {
        matched = true;
        const offset = match.index;
        const parent = node.parentNode;
        if (offset > index) {
          parent.insertBefore(document.createTextNode(text.slice(index, offset)), node);
        }
        const span = document.createElement('span');
        span.setAttribute('data-text-splitter-__nobr__', '');
        span.textContent = match[0];
        parent.insertBefore(span, node);
        index = offset + match[0].length;
      }
      if (!matched) return;
      if (index < text.length) {
        node.parentNode.insertBefore(document.createTextNode(text.slice(index)), node);
      }
      node.parentNode.removeChild(node);
      return;
    }
    for (let child = node.firstChild; child; child = child.nextSibling) {
      this.nobr(child);
    }
  }

  split(by, node = this.fragment) {
    const items = this[`${by}Elements`];
    for (let current = node.firstChild; current; ) {
      const next = current.nextSibling;
      if (current.nodeType === Node.TEXT_NODE) {
        const parent = current.parentNode;
        const lang = (parent.nodeType === Node.ELEMENT_NODE ? parent : this.rootElement).closest('[lang]')?.lang ?? document.documentElement.lang ?? 'en';
        const segmenter = by === 'word' && this.settings.wordSegmenter ? this.getSegmenter(lang, 'word') : this.getSegmenter(lang, 'grapheme');
        const text = current.textContent.replace(/[\r\n\t]/g, '').replace(/\s{2,}/g, ' ');
        for (const segment of segmenter.segment(text)) {
          const text = segment.segment;
          const span = document.createElement('span');
          span.setAttribute(`data-${by}`, text);
          if (text.charCodeAt(0) === 32) {
            span.setAttribute('data-whitespace', '');
          }
          span.textContent = text;
          items.push(span);
          parent.insertBefore(span, current);
        }
        parent.removeChild(current);
      } else if (by === 'word' && current.nodeType === Node.ELEMENT_NODE && current instanceof HTMLElement && current.hasAttribute('data-text-splitter-__nobr__')) {
        const text = current.textContent;
        current.removeAttribute('data-text-splitter-__nobr__');
        current.setAttribute('data-word', text);
        items.push(current);
      } else if (current.firstChild) {
        this.split(by, current);
      }
      current = next;
    }
  }

  lbr(by) {
    const items = this[`${by}Elements`];
    let previous;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const text = item.textContent;
      const segment = [...new Intl.Segmenter().segment(text)].shift();
      if (!segment) return;
      if (previous?.textContent.trim() && LBR_PROHIBIT_START_REGEXP.test(segment.segment)) {
        previous.textContent += text;
        previous.setAttribute(`data-${by}`, previous.textContent);
        item.remove();
        items.splice(i, 1);
        i -= 1;
      } else {
        previous = item;
      }
    }
    const concat = (item, regexp, index) => {
      const offset = index + 1;
      let next = items[offset];
      while (next) {
        const text = next.textContent;
        if (!regexp.test(text)) break;
        item.textContent += text;
        item.setAttribute(`data-${by}`, item.textContent);
        next.remove();
        items.splice(offset, 1);
        next = items[offset];
      }
    };
    items.forEach((item, i) => {
      if (LBR_PROHIBIT_END_REGEXP.test(item.textContent)) {
        concat(item, LBR_PROHIBIT_END_REGEXP, i);
        const next = items[i + 1];
        const text = next?.textContent;
        if (next && text.trim()) {
          next.textContent = item.textContent + text;
          next.setAttribute(`data-${by}`, next.textContent);
          item.remove();
          items.splice(i, 1);
        }
      }
    });
    items.forEach((item, i) => {
      if (LBR_INSEPARATABLE_REGEXP.test(item.textContent)) {
        concat(item, LBR_INSEPARATABLE_REGEXP, i);
      }
    });
    if (by === 'char') {
      this.fragment.querySelectorAll('[data-word]:not([data-whitespace])').forEach((span) => {
        const text = span.textContent;
        if (text) {
          span.setAttribute('data-word', text);
        } else {
          span.remove();
        }
      });
    }
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.rootElement.removeAttribute('data-text-splitter-initialized');
    ['--word-length', '--char-length'].forEach((name) => this.rootElement.style.removeProperty(name));
    this.rootElement.innerHTML = this.original;
  }
}

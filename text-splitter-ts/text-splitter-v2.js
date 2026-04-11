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
    this.destroyed = false;

    // ★ Segmenter cache
    this._segmenters = Object.create(null);

    this.initialize();
  }

  // =========================
  // Segmenter cache
  // =========================
  getSegmenter(lang, granularity) {
    const key = `${lang}-${granularity}`;
    if (!this._segmenters[key]) {
      this._segmenters[key] = new Intl.Segmenter(lang, { granularity });
    }
    return this._segmenters[key];
  }

  initialize() {
    // clone（互換維持）
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

    // index付与
    this.wordElements.forEach((word, i) => {
      word.translate = false;
      word.style.setProperty('--word-index', String(i));

      if (!word.hasAttribute('data-whitespace')) {
        const alt = document.createElement('span');
        alt.setAttribute('data-alt', '');
        alt.style.cssText = 'border:0;clip:rect(0,0,0,0);height:1px;margin:-1px;overflow:hidden;padding:0;position:absolute;user-select:none;white-space:nowrap;width:1px;';
        alt.textContent = word.textContent;
        word.appendChild(alt);
      }
    });

    this.charElements.forEach((char, i) => {
      char.setAttribute('aria-hidden', 'true');
      char.style.setProperty('--char-index', String(i));
    });

    // ★ querySelectorAll削減（1回だけ）
    const spans = this.fragment.querySelectorAll(':is([data-word], [data-char]):not([data-whitespace])');
    for (let i = 0; i < spans.length; i++) {
      const span = spans[i];
      span.style.cssText += 'display:inline-block;white-space:nowrap;';
    }

    // ★ replaceChildren最適化
    this.rootElement.replaceChildren(this.fragment);

    this.rootElement.style.setProperty('--word-length', String(this.wordElements.length));
    this.rootElement.style.setProperty('--char-length', String(this.charElements.length));

    const whitespaces = this.rootElement.querySelectorAll(':scope > :not([data-word]) [data-char][data-whitespace]');
    for (let i = 0; i < whitespaces.length; i++) {
      const el = whitespaces[i];
      if (getComputedStyle(el).getPropertyValue('display') !== 'inline') {
        el.innerHTML = '&nbsp;';
      }
    }

    this.rootElement.setAttribute('data-text-splitter-initialized', '');
  }

  // =========================
  // nobr（配列化削減）
  // =========================
  nobr(node = this.fragment) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      const matches = text.matchAll(NOBR_REGEXP);

      let index = 0;
      let hasMatch = false;

      for (const match of matches) {
        hasMatch = true;
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

      if (!hasMatch) return;

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

  // =========================
  // split（Segmenterキャッシュ）
  // =========================
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
          const str = segment.segment;
          const span = document.createElement('span');

          if (str.charCodeAt(0) === 32) {
            span.setAttribute('data-whitespace', '');
          } else {
            span.setAttribute(`data-${by}`, str);
          }

          span.textContent = str;
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

  // =========================
  // lbr（splice削減版）
  // =========================
  lbr(by) {
    let items = this[`${by}Elements`];

    const segmenter = this.getSegmenter('en', 'grapheme');

    // 前詰め処理
    let result = [];
    let previous = null;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const text = item.textContent;

      const iter = segmenter.segment(text)[Symbol.iterator]();
      const first = iter.next().value;
      if (!first) continue;

      if (previous && previous.textContent.trim() && LBR_PROHIBIT_START_REGEXP.test(first.segment)) {
        previous.textContent += text;
        previous.setAttribute(`data-${by}`, previous.textContent);
        item.remove();
        continue;
      }

      result.push(item);
      previous = item;
    }

    // 後処理
    const final = [];

    for (let i = 0; i < result.length; i++) {
      const item = result[i];
      let text = item.textContent;

      if (LBR_PROHIBIT_END_REGEXP.test(text)) {
        let j = i + 1;
        while (j < result.length && LBR_PROHIBIT_END_REGEXP.test(result[j].textContent)) {
          text += result[j].textContent;
          result[j].remove();
          j++;
        }
        item.textContent = text;
        item.setAttribute(`data-${by}`, text);
      }

      final.push(item);
    }

    // inseparable
    for (let i = 0; i < final.length; i++) {
      const item = final[i];
      let text = item.textContent;

      if (LBR_INSEPARATABLE_REGEXP.test(text)) {
        let j = i + 1;
        while (j < final.length && LBR_INSEPARATABLE_REGEXP.test(final[j].textContent)) {
          text += final[j].textContent;
          final[j].remove();
          j++;
        }
        item.textContent = text;
        item.setAttribute(`data-${by}`, text);
      }
    }

    this[`${by}Elements`] = final;

    if (by === 'char') {
      const words = this.fragment.querySelectorAll('[data-word]:not([data-whitespace])');
      for (let i = 0; i < words.length; i++) {
        const span = words[i];
        const text = span.textContent;
        if (text) {
          span.setAttribute('data-word', text);
        } else {
          span.remove();
        }
      }
    }
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;

    this.rootElement.removeAttribute('data-text-splitter-initialized');
    this.rootElement.style.removeProperty('--word-length');
    this.rootElement.style.removeProperty('--char-length');

    this.rootElement.innerHTML = this.original;
  }
}

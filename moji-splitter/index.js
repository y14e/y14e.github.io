// src/index.ts
var NOBR_REGEX = /[[[\P{scx=Han}]&&[\P{scx=Hang}]&&[\P{scx=Hira}]&&[\P{scx=Kana}]&&[\p{L}]]!-,.->@\[-`\{-~\u00A0]+/gv;
var LBR_PROHIBIT_START_REGEX = /^[[[\p{Pd}]--[―]]\p{Pe}\p{Pf}\p{Po}\u00A0々〵〻ぁぃぅぇぉっゃゅょゎゕゖ゛-ゞァィゥェォッャュョヮヵヶー-ヾㇰ-ㇿ]|\p{Pi}/v;
var LBR_PROHIBIT_END_REGEX = /[\p{Pf}\p{Pi}\p{Ps}\p{Sc}\u00A0]$/u;
var LBR_INSEPARATABLE_REGEX = /[―‥…]/u;
var MojiSplitter = class {
  #rootElement;
  #defaults = {
    concatChar: false,
    lineBreakingRules: true,
    wordSegmenter: false
  };
  #settings;
  #wordElements = [];
  #charElements = [];
  #original;
  #fragment = new DocumentFragment();
  #segmenter = new Intl.Segmenter();
  #isDestroyed = false;
  constructor(root, options = {}) {
    if (!(root instanceof HTMLElement)) {
      throw new TypeError("Invalid root element");
    }
    this.#rootElement = root;
    this.#settings = { ...this.#defaults, ...options };
    this.#original = this.#rootElement.innerHTML;
    this.#initialize();
  }
  destroy() {
    if (this.#isDestroyed) {
      return;
    }
    this.#isDestroyed = true;
    this.#rootElement.removeAttribute("data-moji-splitter-initialized");
    this.#rootElement.innerHTML = this.#original;
    const style = this.#rootElement.style;
    style.removeProperty("--word-length");
    style.removeProperty("--char-length");
    this.#cleanup();
    this.#original = null;
  }
  #initialize() {
    const children = this.#rootElement.childNodes;
    if (!this.#fragment) {
      throw new Error("Unreachable");
    }
    for (let i = 0, l = children.length; i < l; i++) {
      this.#fragment.appendChild(children[i].cloneNode(true));
    }
    this.#nobr();
    this.#split("word");
    const { concatChar, lineBreakingRules } = this.#settings;
    if (!concatChar && lineBreakingRules) {
      this.#lbr("word");
    }
    this.#split("char");
    if (concatChar && lineBreakingRules) {
      this.#lbr("char");
    }
    if (!this.#charElements) {
      throw new Error("Unreachable");
    }
    for (let i = 0, l = this.#charElements.length; i < l; i++) {
      const char = this.#charElements[i];
      char.setAttribute("aria-hidden", "true");
      char.style.setProperty("--char-index", String(i));
    }
    const spans = this.#fragment.querySelectorAll(
      ":is([data-word], [data-char]):not([data-whitespace])"
    );
    for (let i = 0, l = spans.length; i < l; i++) {
      const span = spans[i];
      const { style: style2 } = span;
      style2.setProperty("display", "inline-block");
      if (Array.from(
        this.#segmenter.segment(span.textContent)
      ).length > 1) {
        style2.setProperty("white-space", "nowrap");
      }
    }
    if (!this.#wordElements) {
      throw new Error("Unreachable");
    }
    for (let i = 0, l = this.#wordElements.length; i < l; i++) {
      const word = this.#wordElements[i];
      word.translate = false;
      word.style.setProperty("--word-index", String(i));
      if (!word.hasAttribute("data-whitespace")) {
        const alt = document.createElement("span");
        alt.setAttribute("data-alt", "");
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
    }
    this.#rootElement.replaceChildren(...this.#fragment.childNodes);
    const { style } = this.#rootElement;
    style.setProperty("--word-length", String(this.#wordElements.length));
    style.setProperty("--char-length", String(this.#charElements.length));
    const whitespaces = this.#rootElement.querySelectorAll(
      ":scope > :not([data-word]) [data-char][data-whitespace]"
    );
    for (let i = 0, l = whitespaces.length; i < l; i++) {
      const whitespace = whitespaces[i];
      if (window.getComputedStyle(whitespace).getPropertyValue("display") !== "inline") {
        whitespace.innerHTML = "&nbsp;";
      }
    }
    this.#cleanup();
    this.#rootElement.setAttribute("data-moji-splitter-initialized", "");
  }
  #nobr(node = this.#fragment) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      const matches = Array.from(text.matchAll(NOBR_REGEX));
      if (!matches.length) {
        return;
      }
      let index = 0;
      const parent = node.parentNode;
      for (let i = 0, l = matches.length; i < l; i++) {
        const match = matches[i];
        const offset = match.index;
        if (offset > index) {
          parent.insertBefore(
            document.createTextNode(text.slice(index, offset)),
            node
          );
        }
        const span = document.createElement("span");
        span.setAttribute("data-_nobr", "");
        const matched = match[0];
        span.textContent = matched;
        parent.insertBefore(span, node);
        index = offset + matched.length;
      }
      if (index < text.length) {
        parent.insertBefore(document.createTextNode(text.slice(index)), node);
      }
      parent.removeChild(node);
    } else if (node.hasChildNodes()) {
      const children = Array.from(node.childNodes);
      for (let i = 0, l = children.length; i < l; i++) {
        this.#nobr(children[i]);
      }
    }
  }
  #split(granularity, node = this.#fragment) {
    const items = granularity === "word" ? this.#wordElements : this.#charElements;
    const children = Array.from(node.childNodes);
    for (let i = 0, l = children.length; i < l; i++) {
      const child = children[i];
      const text = child.textContent;
      if (child.nodeType === Node.TEXT_NODE) {
        const parent = child.parentNode;
        const segmenter = this.#getSegmenter(
          granularity,
          parent
        );
        const segments = Array.from(
          segmenter.segment(
            text.replace(/[\r\n\t]/g, "").replace(/\s{2,}/g, " ")
          )
        );
        for (let j = 0, m = segments.length; j < m; j++) {
          const segment = segments[j];
          const span = document.createElement("span");
          const text2 = segment.segment;
          const types = [
            granularity,
            segment.segment.charCodeAt(0) === 32 && "whitespace"
          ].filter(Boolean);
          for (let k = 0, n = types.length; k < n; k++) {
            const type = types[k];
            span.setAttribute(
              `data-${type}`,
              type !== "whitespace" ? text2 : ""
            );
          }
          span.textContent = text2;
          items.push(span);
          child.before(span);
        }
        child.remove();
      } else if (granularity === "word" && child.nodeType === Node.ELEMENT_NODE && child instanceof HTMLElement && child.hasAttribute("data-_nobr")) {
        child.removeAttribute("data-_nobr");
        child.setAttribute("data-word", text);
        items.push(child);
      } else if (child.hasChildNodes()) {
        this.#split(granularity, child);
      }
    }
  }
  #lbr(granularity) {
    const items = granularity === "word" ? this.#wordElements : this.#charElements;
    let previous = null;
    for (let i = 0, l = items.length; i < l; i++) {
      const item = items[i];
      if (!item) {
        continue;
      }
      const text = item.textContent;
      const segment = Array.from(
        this.#segmenter.segment(text)
      ).shift();
      if (previous !== null && previous.textContent.trim() !== "" && LBR_PROHIBIT_START_REGEX.test(segment.segment)) {
        previous.textContent += text;
        previous.setAttribute(`data-${granularity}`, previous.textContent);
        item.remove();
        items.splice(i, 1);
        i--;
      } else {
        previous = item;
      }
    }
    function concat(item, regex, index) {
      const offset = index + 1;
      let next = items[offset];
      let text;
      while (next && regex.test(next.textContent)) {
        text = next.textContent;
        item.textContent += text;
        item.setAttribute(`data-${granularity}`, item.textContent);
        next.remove();
        items.splice(offset, 1);
        next = items[offset];
      }
    }
    for (let i = 0, l = items.length; i < l; i++) {
      const item = items[i];
      if (!item || !LBR_PROHIBIT_END_REGEX.test(item.textContent)) {
        continue;
      }
      concat(item, LBR_PROHIBIT_END_REGEX, i);
      const next = items[i + 1];
      const text = next?.textContent;
      if (next && text?.trim() !== "") {
        next.textContent = item.textContent + text;
        next.setAttribute(`data-${granularity}`, next.textContent);
        item.remove();
        items.splice(i, 1);
      }
    }
    for (let i = 0, l = items.length; i < l; i++) {
      const item = items[i];
      if (!item || !LBR_INSEPARATABLE_REGEX.test(item.textContent)) {
        continue;
      }
      concat(item, LBR_INSEPARATABLE_REGEX, i);
    }
    if (granularity === "char") {
      const spans = this.#fragment?.querySelectorAll(
        "[data-word]:not([data-whitespace])"
      );
      for (let i = 0, l = spans.length; i < l; i++) {
        const span = spans[i];
        const text = span.textContent;
        if (text !== "") {
          span.setAttribute("data-word", text);
        } else {
          span.remove();
        }
      }
    }
  }
  #cleanup() {
    this.#wordElements = null;
    this.#charElements = null;
    this.#fragment = null;
    this.#segmenter = null;
  }
  #getSegmenter(granularity, parent) {
    if (granularity === "word" && this.#settings.wordSegmenter) {
      const root = parent?.nodeType === Node.ELEMENT_NODE ? parent : this.#rootElement;
      const closest = root.closest("[lang]");
      return new Intl.Segmenter(
        closest?.lang || document.documentElement.lang || "en",
        {
          granularity: "word"
        }
      );
    } else {
      return this.#segmenter;
    }
  }
};
/**
 * Moji Splitter
 * Flexible text splitting utility for CSS animations.
 * Supports complex line breaking rules (ja: Kinsoku shori).
 *
 * @version 1.3.2
 * @author Yusuke Kamiyamane
 * @license MIT
 * @copyright Copyright (c) Yusuke Kamiyamane
 * @see {@link https://github.com/y14e/moji-splitter}
 */

export { MojiSplitter as default };

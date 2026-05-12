// src/index.ts
var NOBR_REGEX = /[[[\P{scx=Han}]&&[\P{scx=Hang}]&&[\P{scx=Hira}]&&[\P{scx=Kana}]&&[\p{L}]]!-,.->@\[-`\{-~\u00A0]+/gv;
var LBR_PROHIBIT_START_REGEX = /^[[[\p{Pd}]--[―]]\p{Pe}\p{Pf}\p{Po}\u00A0々〵〻ぁぃぅぇぉっゃゅょゎゕゖ゛-ゞァィゥェォッャュョヮヵヶー-ヾㇰ-ㇿ]|\p{Pi}/v;
var LBR_PROHIBIT_END_REGEX = /[\p{Pf}\p{Pi}\p{Ps}\p{Sc}\u00A0]$/u;
var LBR_INSEPARATABLE_REGEX = /[―‥…]/u;
var VISUALLY_HIDDEN_CSS = `border: 0; clip: rect(0, 0, 0, 0); height: 1px; margin: -1px; overflow: hidden; padding: 0; position: absolute; user-select: none; white-space: nowrap; width: 1px;`;
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
  #fragment = null;
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
    this.#rootElement.innerHTML = this.#original ?? "";
    const style = this.#rootElement.style;
    style.removeProperty("--word-length");
    style.removeProperty("--char-length");
    this.#cleanup();
    this.#original = null;
  }
  #initialize() {
    const children = this.#rootElement.childNodes;
    this.#fragment = new DocumentFragment();
    for (let i = 0, l = children.length; i < l; i++) {
      const child = children[i];
      if (!child) {
        continue;
      }
      this.#fragment.appendChild(child.cloneNode(true));
    }
    this.#applyNonBreakingRules();
    this.#split("word");
    const { concatChar, lineBreakingRules } = this.#settings;
    if (!concatChar && lineBreakingRules) {
      this.#applyLineBreakingRules("word");
    }
    this.#split("char");
    if (concatChar && lineBreakingRules) {
      this.#applyLineBreakingRules("char");
    }
    for (let i = 0, l = this.#charElements.length; i < l; i++) {
      const char = this.#charElements[i];
      if (!char) {
        continue;
      }
      char.setAttribute("aria-hidden", "true");
      char.style.setProperty("--char-index", String(i));
    }
    const spans = this.#fragment.querySelectorAll(
      ":is([data-word], [data-char]):not([data-whitespace])"
    );
    for (let i = 0, l = spans.length; i < l; i++) {
      const span = spans[i];
      if (!span) {
        continue;
      }
      const { style: style2 } = span;
      style2.setProperty("display", "inline-block");
      if (Array.from(
        (this.#segmenter ?? new Intl.Segmenter()).segment(span.textContent)
      ).length) {
        style2.setProperty("white-space", "nowrap");
      }
    }
    for (let i = 0, l = this.#wordElements.length; i < l; i++) {
      const word = this.#wordElements[i];
      if (!word) {
        continue;
      }
      word.translate = false;
      word.style.setProperty("--word-index", String(i));
      if (!word.hasAttribute("data-whitespace")) {
        const alt = document.createElement("span");
        alt.setAttribute("data-alt", "");
        alt.style.cssText += VISUALLY_HIDDEN_CSS;
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
      if (!whitespace) {
        continue;
      }
      if (window.getComputedStyle(whitespace).getPropertyValue("display") !== "inline") {
        whitespace.innerHTML = "&nbsp;";
      }
    }
    this.#cleanup();
    this.#rootElement.setAttribute("data-moji-splitter-initialized", "");
  }
  #applyNonBreakingRules(node = this.#fragment ?? new DocumentFragment()) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      if (!text || !NOBR_REGEX.test(text)) {
        return;
      }
      NOBR_REGEX.lastIndex = 0;
      let lastIndex = 0;
      const fragment = document.createDocumentFragment();
      for (const match of text.matchAll(NOBR_REGEX)) {
        const index = match.index;
        if (index > lastIndex) {
          fragment.append(text.slice(lastIndex, index));
        }
        const span = document.createElement("span");
        span.setAttribute("data-_nobr", "");
        const matched = match[0];
        span.textContent = matched;
        fragment.append(span);
        lastIndex = index + matched.length;
      }
      if (lastIndex < text.length) {
        fragment.append(text.slice(lastIndex));
      }
      if (!(node instanceof Text)) {
        return;
      }
      node.replaceWith(fragment);
      return;
    }
    let child = node.firstChild;
    while (child) {
      const next = child.nextSibling;
      this.#applyNonBreakingRules(child);
      child = next;
    }
  }
  #split(granularity, node = this.#fragment ?? new DocumentFragment()) {
    let child = node.firstChild;
    const items = granularity === "word" ? this.#wordElements : this.#charElements;
    while (child) {
      const next = child.nextSibling;
      if (child.nodeType === Node.TEXT_NODE) {
        const segmenter = this.#getSegmenter(granularity, child.parentNode);
        if (!segmenter) {
          return;
        }
        const fragment = document.createDocumentFragment();
        for (const segment of segmenter.segment(
          (child.textContent ?? "").replace(/[\r\n\t]/g, "").replace(/\s{2,}/g, " ")
        )) {
          const span = document.createElement("span");
          const text = segment.segment;
          span.textContent = text;
          if (text.charCodeAt(0) === 32) {
            span.setAttribute("data-whitespace", "");
          }
          span.setAttribute(`data-${granularity}`, text);
          items.push(span);
          fragment.append(span);
        }
        child.replaceWith(fragment);
      } else if (granularity === "word" && child instanceof HTMLElement && child.hasAttribute("data-_nobr")) {
        child.removeAttribute("data-_nobr");
        const text = child.textContent ?? "";
        child.setAttribute("data-word", text);
        items.push(child);
      } else if (child.hasChildNodes()) {
        this.#split(granularity, child);
      }
      child = next;
    }
  }
  #applyLineBreakingRules(granularity) {
    let count = 0;
    const items = granularity === "word" ? this.#wordElements : this.#charElements;
    let previous = null;
    while (count < items.length) {
      const item = items[count];
      if (!item) {
        count++;
        continue;
      }
      let text = item.textContent ?? "";
      if (previous?.textContent?.trim() && LBR_PROHIBIT_START_REGEX.test(text)) {
        text = (previous.textContent ?? "") + text;
        previous.textContent = text;
        previous.setAttribute(`data-${granularity}`, text);
        item.remove();
        items.splice(count, 1);
        continue;
      }
      previous = item;
      count++;
    }
    function concat(index, regex) {
      const item = items[index];
      if (!item) {
        return;
      }
      const offset = index + 1;
      let text = item.textContent ?? "";
      while (offset < items.length) {
        const next = items[offset];
        if (!next) {
          break;
        }
        const nextText = next.textContent ?? "";
        if (!regex.test(nextText)) {
          break;
        }
        text += nextText;
        next.remove();
        items.splice(offset, 1);
      }
      item.textContent = text;
      item.setAttribute(`data-${granularity}`, text);
    }
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const text = item?.textContent ?? "";
      if (LBR_PROHIBIT_END_REGEX.test(text)) {
        concat(i, LBR_PROHIBIT_END_REGEX);
        const next = items[i + 1];
        if (next?.textContent?.trim()) {
          const text2 = (items[i]?.textContent ?? "") + next.textContent;
          next.textContent = text2;
          next.setAttribute(`data-${granularity}`, text2);
          items[i]?.remove();
          items.splice(i, 1);
          i--;
        }
        continue;
      }
      if (LBR_INSEPARATABLE_REGEX.test(text)) {
        concat(i, LBR_INSEPARATABLE_REGEX);
      }
    }
    if (granularity === "char") {
      const spans = (this.#fragment ?? new DocumentFragment()).querySelectorAll("[data-word]:not([data-whitespace])");
      for (let i = 0, l = spans.length; i < l; i++) {
        const span = spans[i];
        if (!span) {
          continue;
        }
        const text = span.textContent;
        if (text) {
          span.setAttribute("data-word", text);
        } else {
          span.remove();
        }
      }
    }
  }
  #cleanup() {
    this.#wordElements.length = 0;
    this.#charElements.length = 0;
    this.#fragment = null;
    this.#segmenter = null;
  }
  #getSegmenter(granularity, parent) {
    if (granularity === "word" && this.#settings.wordSegmenter) {
      const root = parent?.nodeType === Node.ELEMENT_NODE ? parent : this.#rootElement;
      if (!(root instanceof HTMLElement)) {
        return this.#segmenter;
      }
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
 * @version 1.4.3
 * @author Yusuke Kamiyamane
 * @license MIT
 * @copyright Copyright (c) Yusuke Kamiyamane
 * @see {@link https://github.com/y14e/moji-splitter}
 */

export { MojiSplitter as default };

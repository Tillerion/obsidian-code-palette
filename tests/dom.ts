import { JSDOM as BaseJSDOM } from "jsdom";

// Minimal Obsidian DOM helper for headless tests; each window keeps its own document.
export class JSDOM extends BaseJSDOM {
  constructor(...args: ConstructorParameters<typeof BaseJSDOM>) {
    super(...args);
    this.window.Node.prototype.createEl = function (tag, options = {}) {
      const doc = this.ownerDocument ?? (this as Document);
      const el = doc.createElement(tag);
      if (typeof options === "string") el.className = options;
      else {
        if (options.cls)
          el.className = Array.isArray(options.cls)
            ? options.cls.join(" ")
            : options.cls;
        if (typeof options.text === "string") el.textContent = options.text;
        else if (options.text) el.appendChild(options.text);
      }
      this.appendChild(el);
      return el;
    };
  }
}

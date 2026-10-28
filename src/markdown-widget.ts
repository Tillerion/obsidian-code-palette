import { WidgetType, type EditorView } from "@codemirror/view";
import type { PaletteHost, MarkdownRenderHandle } from "./host";
const handles = new WeakMap<HTMLElement, MarkdownRenderHandle>();

export class MarkdownPreviewWidget extends WidgetType {
  constructor(
    private host: PaletteHost,
    private source: string,
    private path: string,
    private anchor: number,
    private revision: number,
  ) {
    super();
  }

  eq(other: MarkdownPreviewWidget) {
    return (
      this.host === other.host &&
      this.source === other.source &&
      this.path === other.path &&
      this.anchor === other.anchor &&
      this.revision === other.revision
    );
  }

  toDOM(view: EditorView) {
    const el = view.dom.ownerDocument.createDocumentFragment().createEl("div", {
      cls: "cp-markdown-preview markdown-rendered",
      attr: {
        "data-language": "markdown",
        "aria-label": "Markdown 正文预览",
        title: "双击编辑原文",
      },
    });
    const fallback = (error: unknown) => {
      const handle = handles.get(el);
      handles.delete(el);
      handle?.dispose();
      el.replaceChildren();
      el.createEl("pre").createEl("code", { text: this.source });
      this.host.reportError(error);
    };
    try {
      const handle = this.host.renderMarkdown!(this.source, el, this.path);
      handles.set(el, handle);
      void handle.ready.catch((error) => {
        if (handles.get(el) === handle) fallback(error);
      });
    } catch (error) {
      fallback(error);
    }
    el.addEventListener("dblclick", (event) => {
      if ((event.target as Element).closest("a, button, input, textarea"))
        return;
      event.preventDefault();
      view.dispatch({
        selection: { anchor: this.anchor },
        scrollIntoView: true,
      });
      view.focus();
    });
    return el;
  }

  destroy(el: HTMLElement) {
    const handle = handles.get(el);
    handles.delete(el);
    handle?.dispose();
  }
  ignoreEvent() {
    return true;
  }
}

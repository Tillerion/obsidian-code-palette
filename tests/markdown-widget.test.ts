import { test } from "node:test";
import assert from "node:assert/strict";
import type { EditorView } from "@codemirror/view";
import { JSDOM } from "./dom.ts";
import { MarkdownPreviewWidget } from "../src/markdown-widget.ts";
import { defaultSettings } from "../src/rules.ts";
import { Highlighter } from "../src/highlighter.ts";
import type { PaletteHost } from "../src/host.ts";

test("a rejected Markdown widget render immediately disposes its native component exactly once", async () => {
  const dom = new JSDOM("<main></main>"),
    highlighter = new Highlighter();
  let disposed = 0,
    reported = 0;
  const error = new Error("native render failed");
  const host: PaletteHost = {
    settings: defaultSettings(),
    highlighter,
    active: true,
    revision: 0,
    theme: () => "nord",
    subscribe: () => () => {},
    reportError: (e) => {
      assert.equal(e, error);
      reported++;
    },
    renderMarkdown: () => ({
      ready: Promise.reject(error),
      dispose: () => {
        disposed++;
      },
    }),
  };
  const widget = new MarkdownPreviewWidget(host, "# Heading", "note.md", 1, 0);
  const view = {
    dom: dom.window.document.querySelector("main")!,
    dispatch: () => {},
    focus: () => {},
  } as unknown as EditorView;
  const el = widget.toDOM(view);
  try {
    await Promise.resolve();
    assert.equal(disposed, 1);
    assert.equal(reported, 1);
    assert.equal(el.querySelector("pre code")?.textContent, "# Heading");
    widget.destroy(el);
    assert.equal(disposed, 1);
  } finally {
    widget.destroy(el);
    highlighter.dispose();
    dom.window.close();
  }
});

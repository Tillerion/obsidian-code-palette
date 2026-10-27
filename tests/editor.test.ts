import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { createEditorExtension } from "../src/editor.ts";
import { Highlighter } from "../src/highlighter.ts";
import { defaultSettings } from "../src/rules.ts";
import type { PaletteHost } from "../src/host.ts";
async function until(check: () => boolean) {
  const end = Date.now() + 4000;
  while (!check()) {
    if (Date.now() > end) assert.fail("editor decoration did not update");
    await new Promise((r) => setTimeout(r, 20));
  }
}
test("real CM6 colors inline and explicit Java without changing source; rule updates clear colors", async () => {
  const dom = new JSDOM('<!doctype html><body><div id="editor"></div></body>', {
    pretendToBeVisual: true,
  });
  for (const key of [
    "window",
    "document",
    "Window",
    "MutationObserver",
    "HTMLElement",
    "Node",
    "getComputedStyle",
  ] as const)
    Object.defineProperty(globalThis, key, {
      value: (dom.window as any)[key],
      configurable: true,
      writable: true,
    });
  const range = dom.window.Range.prototype as any;
  range.getClientRects = () => [];
  range.getBoundingClientRect = () => ({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    width: 0,
    height: 0,
  });
  const listeners = new Set<() => void>();
  const h = new Highlighter();
  const settings = defaultSettings();
  settings.defaultRule = {
    kind: "folder",
    path: "",
    enabled: true,
    language: "python",
    inline: true,
    blocks: true,
    recursive: true,
  };
  const host: PaletteHost = {
    settings,
    highlighter: h,
    revision: 0,
    active: true,
    theme: () => "one-dark-pro",
    subscribe: (f) => {
      listeners.add(f);
      return () => listeners.delete(f);
    },
    reportError: (e) => {
      throw e;
    },
  };
  const source = "正文 `return 42`\n\n```java\npublic class Demo {}\n```";
  const view = new EditorView({
    state: EditorState.create({
      doc: source,
      extensions: [createEditorExtension(host, () => "test.md")],
    }),
    parent: dom.window.document.querySelector("#editor")!,
  });
  try {
    await until(() => view.dom.querySelectorAll(".cp-syntax").length > 3);
    assert.equal(view.state.doc.toString(), source);
    assert.match(view.dom.textContent ?? "", /public class Demo/);
    assert.ok(
      new Set(
        Array.from(view.dom.querySelectorAll<HTMLElement>(".cp-syntax")).map(
          (n) => n.style.color,
        ),
      ).size >= 2,
    );
    settings.enabled = false;
    host.revision++;
    listeners.forEach((f) => f());
    await until(() => view.dom.querySelectorAll(".cp-syntax").length === 0);
    assert.equal(view.state.doc.toString(), source);
  } finally {
    view.destroy();
    h.dispose();
    dom.window.close();
  }
});

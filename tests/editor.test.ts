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
test("a long block only emits marks inside visible ranges while preserving multiline context", async () => {
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
  const listeners = new Set<() => void>(),
    h = new Highlighter(),
    settings = defaultSettings();
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
    theme: () => "nord",
    subscribe: (f) => {
      listeners.add(f);
      return () => listeners.delete(f);
    },
    reportError: (e) => {
      throw e;
    },
  };
  const source = "```python\n" + "x = 1\n".repeat(10000) + "```";
  const extension = createEditorExtension(host, () => "long.md");
  const view = new EditorView({
    state: EditorState.create({ doc: source, extensions: [extension] }),
    parent: dom.window.document.querySelector("#editor")!,
  });
  try {
    await until(() => Boolean(view.plugin(extension)?.decorations.size));
    const outside: { from: number; to: number }[] = [];
    view
      .plugin(extension)!
      .decorations.between(0, source.length, (from: number, to: number) => {
        if (
          from !== to &&
          !view.visibleRanges.some((v) => from >= v.from && to <= v.to)
        )
          outside.push({ from, to });
      });
    assert.equal(
      outside.length,
      0,
      "offscreen token/base marks must be clipped",
    );
    assert.equal(view.state.doc.toString(), source);
  } finally {
    view.destroy();
    h.dispose();
    dom.window.close();
  }
});
test("real CM6 preserves global palette and replaces text fences without changing source", async () => {
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
  const source =
    "正文 `return 42`\n\n```java\npublic class Demo {}\n```\n\n```text\n# Heading\n\n**bold** and [link](https://example.com)\n```";
  settings.globalPalette = true;
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
    const inlineColors = () => {
      const inline = view.dom.querySelector<HTMLElement>(".cp-editor-inline");
      if (!inline) return new Set<string>();
      const tokens = [...inline.querySelectorAll<HTMLElement>(".cp-syntax")];
      // Equal-range CM6 marks may put the syntax wrapper outside the base mark.
      const outer = inline.closest<HTMLElement>(".cp-syntax");
      if (outer) tokens.push(outer);
      return new Set(tokens.map((n) => n.style.color));
    };
    assert.equal(inlineColors().size, 1);
    settings.globalPalette = false;
    host.revision++;
    listeners.forEach((f) => f());
    await until(() => inlineColors().size > 1);
    const blockColors = () => {
      const line = [...view.dom.querySelectorAll(".cm-line")].find((n) =>
        n.textContent?.includes("**bold**"),
      );
      return new Set(
        [...line!.querySelectorAll<HTMLElement>(".cp-syntax")].map(
          (n) => n.style.color,
        ),
      );
    };
    assert.equal(blockColors().size, 1);
    settings.defaultRule!.language = "markdown";
    settings.defaultRule!.existingLanguage = "replace";
    host.revision++;
    listeners.forEach((f) => f());
    await until(() => blockColors().size > 1);
    assert.equal(view.state.doc.toString(), source);
    settings.defaultRule!.existingLanguage = "preserve";
    host.revision++;
    listeners.forEach((f) => f());
    await until(() => blockColors().size === 1);
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

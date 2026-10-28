import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "./dom.ts";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import * as editor from "../src/editor.ts";
import { Highlighter } from "../src/highlighter.ts";
import { defaultSettings, normalizeSettings } from "../src/rules.ts";
import type { PaletteHost } from "../src/host.ts";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(f: () => unknown) {
  for (let i = 0; i < 160; i++) {
    if (f()) return;
    await sleep(15);
  }
  assert.fail("editor did not settle");
}
function setup(source: string, markdown = false) {
  const dom = new JSDOM("<!doctype html><body><main></main></body>", {
    pretendToBeVisual: true,
  });
  for (const k of [
    "window",
    "document",
    "Window",
    "MutationObserver",
    "HTMLElement",
    "Node",
    "getComputedStyle",
  ])
    Object.defineProperty(globalThis, k, {
      value: (dom.window as any)[k],
      configurable: true,
      writable: true,
    });
  Object.assign(dom.window.Range.prototype, {
    getClientRects: () => [],
    getBoundingClientRect: () => ({
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      width: 0,
      height: 0,
    }),
  });
  const settings = defaultSettings();
  settings.rules = [
    {
      kind: "file",
      path: "note.md",
      enabled: true,
      language: markdown ? "markdown" : "python",
      existingLanguage: markdown ? "replace" : "preserve",
      inline: true,
      blocks: true,
      recursive: true,
    },
  ];
  const highlighter = new Highlighter(),
    listeners = new Set<() => void>();
  const host: PaletteHost = {
    settings,
    highlighter,
    active: true,
    revision: 0,
    theme: () => "one-dark-pro",
    subscribe: (f) => {
      listeners.add(f);
      return () => listeners.delete(f);
    },
    reportError: (e) => {
      throw e;
    },
    renderMarkdown: (text, el) => {
      el.createEl("h1", { text: text.split("\n")[0].replace(/^# /, "") });
      return { ready: Promise.resolve(), dispose() {} };
    },
  };
  const view = new EditorView({
    state: EditorState.create({
      doc: source,
      extensions: editor.createEditorExtension(
        host,
        () => "note.md",
        () => true,
      ),
    }),
    parent: dom.window.document.querySelector("main")!,
  });
  return {
    dom,
    host,
    view,
    refresh: () => {
      host.revision++;
      listeners.forEach((f) => f());
    },
    close: () => {
      view.destroy();
      highlighter.dispose();
      dom.window.close();
    },
  };
}
test("continuous typing keeps old colors and cursor movement never repaints unchanged code", async () => {
  const s = setup(
    "Intro\n\n```python\nreturn 1\n```\n\n```java\npublic class Demo {}\n```",
  );
  const real = s.host.highlighter.highlight.bind(s.host.highlighter);
  let calls = 0;
  s.host.highlighter.highlight = async (...args) => {
    calls++;
    await sleep(110);
    return real(...args);
  };
  try {
    await until(() => s.view.dom.querySelectorAll(".cp-syntax").length > 3);
    const initial = s.view.dom.querySelectorAll(".cp-syntax").length;
    calls = 0;
    s.view.dispatch({ selection: { anchor: 1 } });
    assert.equal(s.view.dom.querySelectorAll(".cp-syntax").length, initial);
    await sleep(180);
    assert.equal(calls, 0);
    for (let i = 0; i < 4; i++) {
      s.view.dispatch({
        changes: {
          from: s.view.state.doc.toString().indexOf("return") + 7,
          insert: "2",
        },
      });
      assert.ok(
        s.view.dom.querySelectorAll(".cp-syntax").length >= initial - 1,
        "all existing coloring must survive each transaction",
      );
      await sleep(10);
    }
    await sleep(250);
    assert.equal(calls, 1, "only changed block is sent to the highlighter");
    assert.match(s.view.state.doc.toString(), /22221/);
    s.host.settings.enabled = false;
    s.refresh();
    assert.equal(s.view.dom.querySelectorAll(".cp-syntax").length, 0);
  } finally {
    s.close();
  }
});
test("deleted fences remove mapped coloring from prose immediately", async () => {
  const s = setup("```python\nreturn 1\n```");
  try {
    await until(() => s.view.dom.querySelector(".cp-syntax"));
    s.view.dispatch({
      changes: [
        { from: 0, to: 10 },
        { from: 19, to: 22 },
      ],
    });
    assert.equal(s.view.dom.querySelectorAll(".cp-syntax").length, 0);
    assert.equal(s.view.dom.querySelectorAll(".cp-editor-block").length, 0);
  } finally {
    s.close();
  }
});
test("Markdown edit locks survive cursor exit and preceding edits until explicit completion", async () => {
  const s = setup(
    "Intro\n\n```text\n# First\n```\n\n```text\n# Second\n```\n\nEnd",
    true,
  );
  try {
    await until(
      () => s.view.dom.querySelectorAll(".cp-markdown-preview").length === 2,
    );
    const first = s.view.dom.querySelector(".cp-markdown-preview")!;
    first.dispatchEvent(
      new s.dom.window.MouseEvent("dblclick", { bubbles: true }),
    );
    await until(
      () => s.view.dom.querySelectorAll(".cp-markdown-preview").length === 1,
    );
    s.view.dispatch({
      selection: { anchor: 0 },
      changes: { from: 0, insert: "Prefix\n" },
    });
    assert.equal(
      s.view.dom.querySelectorAll(".cp-markdown-preview").length,
      1,
      "leaving a block must not unlock it",
    );
    s.view.dispatch({
      selection: { anchor: s.view.state.doc.toString().indexOf("First") },
      changes: {
        from: s.view.state.doc.toString().indexOf("First") + 5,
        insert: " changed",
      },
    });
    s.view.dispatch({ selection: { anchor: 0 } });
    assert.equal(s.view.dom.querySelectorAll(".cp-markdown-preview").length, 1);
    let composing = true;
    Object.defineProperty(s.view, "composing", {
      get: () => composing,
      configurable: true,
    });
    assert.equal((editor as any).finishMarkdownEditing(s.view), false);
    assert.equal(s.view.dom.querySelectorAll(".cp-markdown-preview").length, 1);
    composing = false;
    assert.equal((editor as any).finishMarkdownEditing(s.view), true);
    await until(
      () => s.view.dom.querySelectorAll(".cp-markdown-preview").length === 2,
    );
    assert.match(s.view.dom.textContent!, /First changed/);
    assert.match(s.view.state.doc.toString(), /```text/);
    (s.host.settings as any).markdownPreview = false;
    s.refresh();
    assert.equal(s.view.dom.querySelectorAll(".cp-markdown-preview").length, 0);
    await until(() => s.view.dom.querySelector(".cp-syntax"));
  } finally {
    s.close();
  }
});
test("Markdown preview setting migrates old configurations without forcing disabled previews on", () => {
  assert.equal((normalizeSettings({}) as any).markdownPreview, true);
  assert.equal(
    (normalizeSettings({ markdownPreview: false }) as any).markdownPreview,
    false,
  );
});

test("newlines retain unaffected tokens and delayed older results cannot overwrite newer text", async () => {
  const s = setup(
    "```python\nreturn 1\n```\n\n```java\npublic class Demo {}\n```",
  );
  const real = s.host.highlighter.highlight.bind(s.host.highlighter);
  let startedOld = false;
  try {
    await until(() => s.view.dom.querySelectorAll(".cp-syntax").length > 3);
    s.host.highlighter.highlight = async (code, lang, theme) => {
      if (code.includes("OLD")) {
        startedOld = true;
        await sleep(180);
      }
      return real(code, lang, theme);
    };
    const at = s.view.state.doc.toString().indexOf("1");
    s.view.dispatch({ changes: { from: at, to: at + 1, insert: "OLD" } });
    await until(() => startedOld);
    s.view.dispatch({
      changes: { from: at, to: at + 3, insert: "3\nreturn 4" },
    });
    assert.ok(
      [...s.view.dom.querySelectorAll(".cp-syntax")].some(
        (n) => n.textContent === "public",
      ),
    );
    await sleep(260);
    assert.match(s.view.state.doc.toString(), /return 3\nreturn 4/);
    assert.ok(
      ![...s.view.dom.querySelectorAll(".cp-syntax")].some((n) =>
        n.textContent?.includes("OLD"),
      ),
    );
    assert.ok(s.view.dom.querySelectorAll(".cp-code-line").length >= 3);
  } finally {
    s.close();
  }
});

test("composition preserves mapped colors and defers token replacement until completion", async () => {
  const s = setup("```python\nreturn 1\n```");
  const real = s.host.highlighter.highlight.bind(s.host.highlighter);
  let calls = 0,
    composing = false;
  try {
    await until(() => s.view.dom.querySelector(".cp-syntax"));
    Object.defineProperty(s.view, "composing", {
      get: () => composing,
      configurable: true,
    });
    s.host.highlighter.highlight = async (...args) => {
      calls++;
      return real(...args);
    };
    composing = true;
    s.view.dispatch({ changes: { from: 17, insert: "2" } });
    assert.ok(s.view.dom.querySelector(".cp-syntax"));
    await sleep(120);
    assert.equal(calls, 0);
    assert.ok(s.view.dom.querySelector(".cp-syntax"));
    composing = false;
    await until(() => calls > 0);
    await until(
      () => s.view.dom.querySelector(".cp-syntax")?.textContent === "return",
    );
  } finally {
    s.close();
  }
});

test("multiple Markdown edit sessions survive theme refresh and finish through the visible button", async () => {
  const s = setup(
    "Intro\n\n```text\n# First\n```\n\n```text\n# Second\n```\n\nEnd",
    true,
  );
  try {
    await until(
      () => s.view.dom.querySelectorAll(".cp-markdown-preview").length === 2,
    );
    for (let i = 0; i < 2; i++)
      s.view.dom
        .querySelector(".cp-markdown-preview")!
        .dispatchEvent(
          new s.dom.window.MouseEvent("dblclick", { bubbles: true }),
        );
    s.view.dispatch({ selection: { anchor: 0 } });
    s.refresh();
    assert.equal(s.view.dom.querySelectorAll(".cp-markdown-preview").length, 0);
    assert.equal(
      s.view.dom.querySelectorAll(".cp-finish-edit button").length,
      2,
    );
    s.view.dom
      .querySelector(".cp-finish-edit button")!
      .dispatchEvent(new s.dom.window.MouseEvent("click", { bubbles: true }));
    await until(
      () => s.view.dom.querySelectorAll(".cp-markdown-preview").length === 2,
    );
    assert.equal(
      s.view.dom.querySelectorAll(".cp-finish-edit button").length,
      0,
    );
  } finally {
    s.close();
  }
});

for (const [name, source, insert] of [
  ["closing fence whitespace", "Intro\n\n```text\n# First\n```", " "],
  ["completing an unclosed fence", "Intro\n\n```text\n# First\n", "```"],
])
  test(`Markdown edit lock survives ${name} at the block boundary`, async () => {
    const s = setup(source, true);
    try {
      await until(() => s.view.dom.querySelector(".cp-markdown-preview"));
      s.view.dom
        .querySelector(".cp-markdown-preview")!
        .dispatchEvent(
          new s.dom.window.MouseEvent("dblclick", { bubbles: true }),
        );
      s.view.dispatch({
        changes: { from: s.view.state.doc.length, insert },
        selection: { anchor: s.view.state.doc.length + insert.length },
      });
      assert.ok(!s.view.dom.querySelector(".cp-markdown-preview"));
      assert.ok(s.view.dom.querySelector(".cp-finish-edit button"));
    } finally {
      s.close();
    }
  });

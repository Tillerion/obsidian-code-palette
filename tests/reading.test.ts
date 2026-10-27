import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { ReadingController } from "../src/reading.ts";
import { Highlighter, type HighlightResult } from "../src/highlighter.ts";
import { defaultSettings } from "../src/rules.ts";
import type { PaletteHost } from "../src/host.ts";
async function until(check: () => boolean) {
  const end = Date.now() + 3000;
  while (!check()) {
    if (Date.now() > end) assert.fail("reading DOM did not update");
    await new Promise((r) => setTimeout(r, 15));
  }
}
test("pending native mutations survive another block completing its asynchronous paint", async () => {
  const d = new JSDOM(
      '<section><code id="a">return 1</code><code id="b">return 2</code></section>',
    ),
    root = d.window.document.querySelector("section")!,
    a = root.querySelector("#a")!,
    b = root.querySelector("#b")!;
  const real = new Highlighter(),
    first = await real.highlight("return 1", "python", "nord"),
    second = await real.highlight("return 2", "python", "nord");
  const waiting = new Map<string, (value: HighlightResult | null) => void>();
  let gated = true;
  class Controlled extends Highlighter {
    override highlight(
      code: string,
      lang: string,
      theme: string,
    ): Promise<HighlightResult | null> {
      return gated
        ? new Promise((resolve) => waiting.set(code, resolve))
        : real.highlight(code, lang, theme);
    }
  }
  const h = new Controlled(),
    settings = defaultSettings();
  settings.defaultRule = {
    kind: "folder",
    path: "",
    language: "python",
    enabled: true,
    inline: true,
    blocks: true,
    recursive: true,
  };
  const host: PaletteHost = {
    highlighter: h,
    settings,
    revision: 0,
    active: true,
    theme: () => "nord",
    subscribe: () => () => {},
    reportError: (e) => {
      throw e;
    },
  };
  const controller = new ReadingController(root, "note.md", host);
  try {
    waiting.get("return 1")!(first);
    await until(() => !!a.querySelector(".cp-token"));
    gated = false;
    waiting.get("return 2")!(second);
    a.innerHTML = '<span class="token keyword">return</span> 1';
    await until(() => !!b.querySelector(".cp-token"));
    await until(() => !!a.querySelector(".cp-token"));
  } finally {
    controller.dispose();
    h.dispose();
    real.dispose();
    d.window.close();
  }
});
test("late native syntax rendering is recolored and its original nodes are restored on unload", async () => {
  const d = new JSDOM(
      '<section><pre><code class="language-python">return 42</code></pre></section>',
    ),
    root = d.window.document.querySelector("section")!,
    code = root.querySelector("code")!;
  const h = new Highlighter(),
    settings = defaultSettings(),
    listeners = new Set<() => void>();
  settings.defaultRule = {
    kind: "folder",
    path: "",
    language: "python",
    enabled: true,
    inline: true,
    blocks: true,
    recursive: true,
  };
  const host: PaletteHost = {
    highlighter: h,
    settings,
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
  const controller = new ReadingController(root, "note.md", host);
  try {
    await until(() => code.querySelectorAll(".cp-token").length > 1);
    code.innerHTML = '<span class="token keyword">return</span> 42';
    const native = code.firstChild;
    await until(() => code.querySelectorAll(".cp-token").length > 1);
    const extra = d.window.document.createElement("code");
    extra.textContent = "False";
    root.append(extra);
    await until(() => extra.classList.contains("cp-code"));
    controller.dispose();
    assert.equal(code.firstChild, native);
    assert.equal(root.querySelectorAll(".cp-token").length, 0);
  } finally {
    controller.dispose();
    h.dispose();
    d.window.close();
  }
});
test("overlapping startup and postprocessor controllers restore original DOM without leaving highlighted nodes", async () => {
  const d = new JSDOM(
    "<section><table><tr><td><code>return False</code></td></tr></table></section>",
  );
  const root = d.window.document.querySelector("section")!,
    table = root.querySelector("table")!,
    code = root.querySelector("code")!;
  const original = code.firstChild;
  const h = new Highlighter(),
    settings = defaultSettings(),
    listeners = new Set<() => void>();
  settings.defaultRule = {
    kind: "folder",
    path: "",
    language: "python",
    enabled: true,
    inline: true,
    blocks: true,
    recursive: true,
  };
  const host: PaletteHost = {
    highlighter: h,
    settings,
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
  const parent = new ReadingController(root, "note.md", host),
    child = new ReadingController(table, "note.md", host);
  try {
    await until(() => code.querySelectorAll(".cp-token").length > 1);
    await new Promise((r) => setTimeout(r, 30));
    parent.dispose();
    child.dispose();
    assert.equal(code.querySelectorAll(".cp-token").length, 0);
    assert.equal(code.firstChild, original);
    assert.equal(code.classList.contains("cp-code"), false);
  } finally {
    parent.dispose();
    child.dispose();
    h.dispose();
    d.window.close();
  }
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "./dom.ts";
import { ReadingController } from "../src/reading.ts";
import { Highlighter, type HighlightResult } from "../src/highlighter.ts";
import { defaultSettings, normalizeSettings } from "../src/rules.ts";
import type { PaletteHost } from "../src/host.ts";
async function until(check: () => boolean) {
  const end = Date.now() + 3000;
  while (!check()) {
    if (Date.now() > end) assert.fail("reading DOM did not update");
    await new Promise((r) => setTimeout(r, 15));
  }
}

test("text-labelled blocks can render as Markdown and restore their original language and DOM", async () => {
  const d = new JSDOM(
      '<section><pre><code class="language-text"># Heading\n\n**bold** and [link](https://example.com)</code></pre><pre><code class="language-mermaid">graph LR; A --&gt; B</code></pre></section>',
    ),
    root = d.window.document.querySelector("section")!,
    code = root.querySelector(".language-text")!,
    originalNode = code.firstChild,
    originalText = root.textContent,
    highlighter = new Highlighter(),
    settings = normalizeSettings({
      defaultRule: { kind: "folder", path: "", language: "markdown" },
    }),
    listeners = new Set<() => void>();
  const host: PaletteHost = {
    highlighter,
    settings,
    active: true,
    revision: 0,
    theme: () => "one-dark-pro",
    subscribe: (f) => {
      listeners.add(f);
      return () => {
        listeners.delete(f);
      };
    },
    reportError: (error) => {
      throw error;
    },
  };
  const colors = () =>
    new Set(
      [...code.querySelectorAll<HTMLElement>(".cp-token")].map(
        (n) => n.style.color,
      ),
    );
  const refresh = () => {
    host.revision++;
    listeners.forEach((f) => f());
  };
  const controller = new ReadingController(root, "docs/note.md", host);
  try {
    await until(() => code.classList.contains("cp-code"));
    assert.equal(colors().size, 1);
    settings.defaultRule!.existingLanguage = "replace";
    refresh();
    await until(() => colors().size > 1);
    assert.ok(code.classList.contains("language-text"));
    assert.equal(root.querySelector(".language-mermaid .cp-token"), null);
    assert.equal(root.textContent, originalText);
    settings.globalPalette = true;
    refresh();
    await until(() => colors().size === 1);
    settings.globalPalette = false;
    refresh();
    await until(() => colors().size > 1);
    settings.defaultRule!.existingLanguage = "preserve";
    refresh();
    await until(() => colors().size === 1);
    controller.dispose();
    assert.equal(code.firstChild, originalNode);
    assert.equal(root.textContent, originalText);
  } finally {
    controller.dispose();
    highlighter.dispose();
    d.window.close();
  }
});

test("reading refresh schedules and cancels timers in its owning popout window", async () => {
  const d = new JSDOM("<section><code>return False</code></section>"),
    root = d.window.document.querySelector("section")!,
    code = root.querySelector("code")!,
    h = new Highlighter(),
    settings = defaultSettings();
  settings.globalPalette = true;
  let scheduled = 0,
    lastScheduled: number | undefined;
  const cancelled: number[] = [];
  const start = d.window.setTimeout.bind(d.window),
    cancel = d.window.clearTimeout.bind(d.window);
  d.window.setTimeout = (...args) => {
    scheduled++;
    lastScheduled = start(...args);
    return lastScheduled;
  };
  d.window.clearTimeout = (id) => {
    if (id !== undefined) cancelled.push(id);
    cancel(id);
  };
  const host: PaletteHost = {
    highlighter: h,
    settings,
    active: true,
    revision: 0,
    theme: () => "nord",
    subscribe: () => () => {},
    reportError: (error) => {
      throw error;
    },
  };
  const controller = new ReadingController(root, "popout.md", host);
  try {
    await until(() => code.classList.contains("cp-code"));
    code.textContent = "return True";
    await until(
      () => code.querySelector(".cp-token")?.textContent === "return True",
    );
    assert.ok(scheduled > 0, "refresh must use the note window's timer");
    const previousSchedules = scheduled;
    code.textContent = "return 7";
    await Promise.resolve(); // Deliver the DOM mutation before its timer runs.
    assert.ok(scheduled > previousSchedules);
    const pending = lastScheduled!;
    assert.equal(cancelled.includes(pending), false);
    controller.dispose();
    assert.ok(
      cancelled.includes(pending),
      "dispose must cancel the pending timer in its own window",
    );
    assert.equal(code.textContent, "return 7");
    assert.equal(code.classList.contains("cp-code"), false);
  } finally {
    controller.dispose();
    h.dispose();
    d.window.close();
  }
});
test("global palette themes all ordinary code but only labelled blocks get language tokens", async () => {
  const d = new JSDOM(
    '<section><code id="inline">return False</code><pre><code id="bare">return False</code></pre><pre><code id="java" class="language-java">public class Demo {}</code></pre><pre><code id="unknown" class="language-unlisted">return False</code></pre><pre><code id="diagram" class="language-mermaid">graph LR; A --> B</code></pre></section>',
  );
  const root = d.window.document.querySelector("section")!,
    h = new Highlighter(),
    settings = defaultSettings(),
    listeners = new Set<() => void>();
  settings.globalPalette = true;
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
  const controller = new ReadingController(root, "anywhere/note.md", host),
    text = root.textContent;
  const colors = (id: string) =>
    new Set(
      [...root.querySelectorAll<HTMLElement>(`#${id} .cp-token`)].map(
        (t) => t.style.color,
      ),
    );
  try {
    await until(() => root.querySelectorAll(".cp-code").length === 4);
    assert.equal(colors("inline").size, 1);
    assert.equal(colors("bare").size, 1);
    assert.equal(colors("unknown").size, 1);
    assert.ok(colors("java").size > 1);
    assert.equal(
      root.querySelector("#diagram")!.classList.contains("cp-code"),
      false,
    );
    assert.equal(root.textContent, text);
    settings.globalPalette = false;
    listeners.forEach((f) => f());
    await until(() => colors("inline").size > 1);
    assert.equal(
      root.querySelector("#unknown")!.classList.contains("cp-code"),
      false,
    );
    assert.equal(root.textContent, text);
  } finally {
    controller.dispose();
    h.dispose();
    d.window.close();
  }
});
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

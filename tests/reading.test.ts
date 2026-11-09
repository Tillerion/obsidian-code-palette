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

test("plain-only reading paragraphs retain markup and clipboard text, avoid links/embeds and restore on toggle", async () => {
  const dom = new JSDOM(
    '<section><p>运行 <strong>print(len(items))</strong> 后？</p><p>print(42)<br>print(43)</p><p><a href="x">print(99)</a> <span class="math">print(98)</span></p><div class="internal-embed"><p>print(97)</p></div></section>',
  );
  const root = dom.window.document.querySelector("section")!;
  const source = root.textContent;
  const strong = root.querySelector("strong");
  const settings = normalizeSettings({
    rules: [
      {
        kind: "file",
        path: "note.md",
        language: "python",
        proseLines: true,
        proseInline: true,
      },
    ],
  });
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
      return () => {
        listeners.delete(f);
      };
    },
    reportError: (e) => {
      throw e;
    },
  };
  const controller = new ReadingController(root, "note.md", host);
  try {
    await until(() => !!root.querySelector("strong .cp-prose-token"));
    assert.equal(root.textContent, source);
    assert.equal(root.querySelector("strong"), strong);
    assert.equal(root.querySelectorAll("br").length, 1);
    assert.equal(
      root.querySelector(
        "a .cp-prose-token, .math .cp-prose-token, .internal-embed .cp-prose-token",
      ),
      null,
    );
    root.querySelectorAll("p")[1].append(" print(44)");
    await until(() =>
      [...root.querySelectorAll(".cp-prose-token")].some(
        (e) => e.textContent === "44",
      ),
    );
    settings.rules[0].proseLines = false;
    settings.rules[0].proseInline = false;
    listeners.forEach((f) => f());
    await until(() => !root.querySelector(".cp-prose-token"));
    assert.ok(root.textContent?.includes("print(44)"));
    assert.equal(root.querySelector("strong"), strong);
  } finally {
    controller.dispose();
    highlighter.dispose();
    dom.window.close();
  }
});

test("markup rules color visible native Markdown/HTML/XML without flattening their rendered structure", async () => {
  for (const [language, html, source] of [
    [
      "markdown",
      "<h1>Heading</h1><p><strong>bold</strong></p>",
      "# Heading\n\n**bold**",
    ],
    ["html", '<div class="demo">Hello</div>', '<div class="demo">Hello</div>'],
    ["xml", '<item id="1">Hello</item>', '<item id="1">Hello</item>'],
  ]) {
    const dom = new JSDOM("<section>" + html + "</section>"),
      root = dom.window.document.querySelector("section")!;
    const highlighter = new Highlighter(),
      listeners = new Set<() => void>();
    const settings = normalizeSettings({
      rules: [
        {
          kind: "file",
          path: "note.md",
          language,
          proseLines: true,
          proseInline: true,
        },
      ],
    });
    const original = root.textContent,
      first = root.firstElementChild;
    const host: PaletteHost = {
      settings,
      highlighter,
      active: true,
      revision: 0,
      theme: () => "one-dark-pro",
      subscribe: (f) => {
        listeners.add(f);
        return () => {
          listeners.delete(f);
        };
      },
      reportError: (e) => {
        throw e;
      },
    };
    const controller = new ReadingController(
      root,
      "note.md",
      host,
      () => source,
    );
    try {
      await until(() => !!root.querySelector(".cp-prose-token"));
      assert.equal(root.textContent, original, language);
      assert.equal(root.firstElementChild, first, language);
      controller.dispose();
      assert.equal(root.innerHTML, html, language);
    } finally {
      controller.dispose();
      highlighter.dispose();
      dom.window.close();
    }
  }
});

test("pending prose results cannot overwrite replaced content or repaint after disposal", async () => {
  const dom = new JSDOM("<section><p>print(1)</p></section>"),
    root = dom.window.document.querySelector("section")!;
  const highlighter = new Highlighter(),
    real = highlighter.highlight.bind(highlighter);
  let unblock!: () => void;
  const gate = new Promise<void>((r) => {
    unblock = r;
  });
  highlighter.highlight = async (...args) => {
    await gate;
    return real(...args);
  };
  const host: PaletteHost = {
    settings: normalizeSettings({
      rules: [
        { kind: "file", path: "note.md", language: "python", proseLines: true },
      ],
    }),
    highlighter,
    active: true,
    revision: 0,
    theme: () => "one-dark-pro",
    subscribe: () => () => {},
    reportError: (e) => {
      throw e;
    },
  };
  const controller = new ReadingController(root, "note.md", host);
  root.querySelector("p")!.textContent = "Plain replacement";
  controller.dispose();
  unblock();
  await new Promise((r) => setTimeout(r, 70));
  assert.equal(root.innerHTML, "<p>Plain replacement</p>");
  highlighter.dispose();
  dom.window.close();
});

test("startup HTML reader loads source, respects nested ownership and leaves ordinary prose alone", async () => {
  const dom = new JSDOM(
    '<main><section><p>普通正文</p><div class="demo"><p>Hello</p></div></section></main>',
  );
  const root = dom.window.document.querySelector("main")!,
    section = root.querySelector("section")!;
  const highlighter = new Highlighter(),
    listeners = new Set<() => void>();
  const host: PaletteHost = {
    settings: normalizeSettings({
      rules: [
        { kind: "file", path: "note.md", language: "html", proseLines: true },
      ],
    }),
    highlighter,
    active: true,
    revision: 0,
    theme: () => "one-dark-pro",
    readSource: async () => '普通正文\n\n<div class="demo"><p>Hello</p></div>',
    subscribe: (f) => {
      listeners.add(f);
      return () => {
        listeners.delete(f);
      };
    },
    reportError: (e) => {
      throw e;
    },
  };
  const startup = new ReadingController(root, "note.md", host),
    post = new ReadingController(
      section,
      "note.md",
      host,
      () => '<div class="demo"><p>Hello</p></div>',
    );
  try {
    await until(() => !!root.querySelector(".demo .cp-prose-token"));
    assert.equal(root.querySelector("section > p .cp-prose-token"), null);
    assert.equal(root.querySelector(".cp-prose-token .cp-prose-token"), null);
    listeners.forEach((f) => f());
    await new Promise((r) => setTimeout(r, 40));
    assert.equal(root.querySelector(".cp-prose-token .cp-prose-token"), null);
    startup.dispose();
    post.dispose();
    assert.equal(root.textContent, "普通正文Hello");
    assert.equal(root.querySelector(".cp-prose-token"), null);
  } finally {
    startup.dispose();
    post.dispose();
    highlighter.dispose();
    dom.window.close();
  }
});

test("HTML matching skips ambiguous identical paragraphs and preserves nested same-name elements", async () => {
  for (const [source, html, expected] of [
    ["<p>Hello</p>\n\nHello", "<p>Hello</p><p>Hello</p>", 0],
    ["<div><div>Hello</div>World</div>", "<div><div>Hello</div>World</div>", 2],
  ] as const) {
    const dom = new JSDOM("<section>" + html + "</section>"),
      root = dom.window.document.querySelector("section")!;
    const highlighter = new Highlighter(),
      host: PaletteHost = {
        settings: normalizeSettings({
          rules: [
            {
              kind: "file",
              path: "note.md",
              language: "html",
              proseLines: true,
            },
          ],
        }),
        highlighter,
        active: true,
        revision: 0,
        theme: () => "one-dark-pro",
        subscribe: () => () => {},
        reportError: (e) => {
          throw e;
        },
        readSource: async () => source,
      };
    const c = new ReadingController(root, "note.md", host);
    try {
      if (expected)
        await until(
          () => root.querySelectorAll(".cp-prose-token").length >= expected,
        );
      else await new Promise((r) => setTimeout(r, 60));
      assert.equal(root.querySelectorAll(".cp-prose-token").length, expected);
      if (expected)
        assert.equal(
          [...root.querySelectorAll(".cp-prose-token")]
            .map((e) => e.textContent)
            .join(""),
          "HelloWorld",
        );
      c.dispose();
      assert.equal(root.innerHTML, html);
    } finally {
      c.dispose();
      highlighter.dispose();
      dom.window.close();
    }
  }
});

test("native BR plus newline keeps multiline SQL context and sanitized XML still colors visible text", async () => {
  for (const [language, html, source, expected] of [
    [
      "sql",
      "<p>SELECT<br>\nname,<br>\nscore<br>\nFROM students<br>\nWHERE score &gt;= 60;</p>",
      "",
      "SELECT\nname,\nscore\nFROM students\nWHERE score >= 60;",
    ],
    ["xml", "<p>Hello</p>", '<item id="1">Hello</item>', "<p>Hello</p>"],
  ]) {
    const dom = new JSDOM("<section>" + html + "</section>"),
      root = dom.window.document.querySelector("section")!;
    const highlighter = new Highlighter(),
      real = highlighter.highlight.bind(highlighter),
      calls: string[] = [],
      listeners = new Set<() => void>();
    let theme = "one-dark-pro";
    highlighter.highlight = (...args) => {
      calls.push(args[0]);
      return real(...args);
    };
    const host: PaletteHost = {
      settings: normalizeSettings({
        rules: [{ kind: "file", path: "note.md", language, proseLines: true }],
      }),
      highlighter,
      active: true,
      revision: 0,
      theme: () => theme,
      subscribe: (f) => {
        listeners.add(f);
        return () => {
          listeners.delete(f);
        };
      },
      readSource: async () => source,
      reportError: (e) => {
        throw e;
      },
    };
    const c = new ReadingController(root, "note.md", host);
    try {
      await until(() => !!root.querySelector(".cp-prose-token"));
      assert.deepEqual(calls, [expected]);
      for (const nextTheme of ["light-plus", "one-dark-pro"]) {
        theme = nextTheme;
        const previous = calls.length;
        listeners.forEach((f) => f());
        await until(() => calls.length > previous);
        await new Promise((r) => setTimeout(r, 25));
        assert.ok(
          calls.every((text) => text === expected),
          JSON.stringify(calls),
        );
      }
      c.dispose();
      assert.equal(root.innerHTML, html);
    } finally {
      c.dispose();
      highlighter.dispose();
      dom.window.close();
    }
  }
});

test("Markdown replacement mounts rendered body, ignores nested code and restores the original block", async () => {
  const dom = new JSDOM(
    '<section><pre><code class="language-text"># Heading\n\n- item</code></pre><pre><code class="language-mermaid">graph LR; A--&gt;B</code></pre></section>',
  );
  const root = dom.window.document.querySelector("section")!;
  const originalPre = root.querySelector("pre")!;
  const originalCode = originalPre.querySelector("code")!;
  const originalText = root.textContent;
  const settings = normalizeSettings({
    globalPalette: true,
    rules: [
      {
        kind: "file",
        path: "note.md",
        language: "markdown",
        existingLanguage: "replace",
        inline: false,
      },
    ],
  });
  const highlighter = new Highlighter();
  const listeners = new Set<() => void>();
  let rendered = 0,
    disposed = 0;
  const host: PaletteHost = {
    settings,
    highlighter,
    active: true,
    revision: 0,
    theme: () => "one-dark-pro",
    subscribe: (f) => {
      listeners.add(f);
      return () => {
        listeners.delete(f);
      };
    },
    reportError: (e) => {
      throw e;
    },
    renderMarkdown: (source, el, path) => {
      assert.equal(source, "# Heading\n\n- item");
      assert.equal(path, "note.md");
      rendered++;
      el.createEl("h1", { text: "Heading" });
      el.createEl("ul").createEl("li", { text: "item" });
      el.createEl("pre").createEl("code", {
        cls: "language-python",
        text: "print(1)",
      });
      return {
        ready: Promise.resolve(),
        dispose: () => {
          disposed++;
        },
      };
    },
  };
  const controller = new ReadingController(root, "note.md", host);
  try {
    await until(() => !!root.querySelector(".cp-markdown-preview h1"));
    assert.equal(root.querySelector(".language-text"), null);
    assert.equal(
      root.querySelector(".cp-markdown-preview li")?.textContent,
      "item",
    );
    assert.equal(root.querySelector(".language-mermaid .cp-token"), null);
    await new Promise((r) => setTimeout(r, 40));
    assert.equal(rendered, 1);
    settings.rules[0].existingLanguage = "preserve";
    listeners.forEach((f) => f());
    await until(() => root.querySelector(".language-text") === originalCode);
    assert.equal(root.querySelector(".cp-markdown-preview"), null);
    assert.equal(disposed, 1);
    controller.dispose();
    assert.equal(root.querySelector("pre"), originalPre);
    assert.equal(root.textContent, originalText);
  } finally {
    controller.dispose();
    highlighter.dispose();
    dom.window.close();
  }
});

test("a cancelled Markdown render cannot reinsert its preview after the controller is disposed", async () => {
  const dom = new JSDOM(
    '<section><pre><code class="language-text"># Heading</code></pre></section>',
  );
  const root = dom.window.document.querySelector("section")!,
    original = root.innerHTML;
  const settings = normalizeSettings({
    defaultRule: {
      kind: "folder",
      path: "",
      language: "markdown",
      existingLanguage: "replace",
    },
  });
  const highlighter = new Highlighter();
  let finish!: () => void,
    disposed = 0;
  const host: PaletteHost = {
    settings,
    highlighter,
    active: true,
    revision: 0,
    theme: () => "nord",
    subscribe: () => () => {},
    reportError: (e) => {
      throw e;
    },
    renderMarkdown: (_source, el) => ({
      ready: new Promise<void>((resolve) => {
        finish = () => {
          el.createEl("h1", { text: "Late" });
          resolve();
        };
      }),
      dispose: () => {
        disposed++;
      },
    }),
  };
  const controller = new ReadingController(root, "note.md", host);
  try {
    assert.ok(root.querySelector(".cp-markdown-preview"));
    controller.dispose();
    finish();
    await Promise.resolve();
    assert.equal(root.innerHTML, original);
    assert.equal(disposed, 1);
  } finally {
    controller.dispose();
    highlighter.dispose();
    dom.window.close();
  }
});

test("removing an enclosing section immediately disposes its Markdown renderer", async () => {
  const dom = new JSDOM(
    '<main><section><pre><code class="language-text"># Heading</code></pre></section></main>',
  );
  const root = dom.window.document.querySelector("main")!,
    section = root.querySelector("section")!;
  const settings = normalizeSettings({
    defaultRule: {
      kind: "folder",
      path: "",
      language: "markdown",
      existingLanguage: "replace",
    },
  });
  const highlighter = new Highlighter();
  let disposed = 0;
  const host: PaletteHost = {
    settings,
    highlighter,
    active: true,
    revision: 0,
    theme: () => "nord",
    subscribe: () => () => {},
    reportError: (e) => {
      throw e;
    },
    renderMarkdown: (_source, el) => {
      el.createEl("h1", { text: "Heading" });
      return {
        ready: Promise.resolve(),
        dispose: () => {
          disposed++;
        },
      };
    },
  };
  const controller = new ReadingController(root, "note.md", host);
  try {
    await until(() => !!root.querySelector("h1"));
    section.remove();
    await until(() => disposed === 1);
    controller.dispose();
    assert.equal(disposed, 1);
  } finally {
    controller.dispose();
    highlighter.dispose();
    dom.window.close();
  }
});

test("a PRE postprocessor root remains managed when the original PRE is replaced", async () => {
  const dom = new JSDOM(
    '<section><pre><code class="language-text"># Heading</code></pre></section>',
  );
  const root = dom.window.document.querySelector("section")!,
    pre = root.querySelector("pre")!;
  const settings = normalizeSettings({
    defaultRule: {
      kind: "folder",
      path: "",
      language: "markdown",
      existingLanguage: "replace",
    },
  });
  const highlighter = new Highlighter();
  let disposed = 0;
  const host: PaletteHost = {
    settings,
    highlighter,
    active: true,
    revision: 0,
    theme: () => "nord",
    subscribe: () => () => {},
    reportError: (e) => {
      throw e;
    },
    renderMarkdown: (_source, el) => {
      el.createEl("h1", { text: "Heading" });
      return {
        ready: Promise.resolve(),
        dispose: () => {
          disposed++;
        },
      };
    },
  };
  const controller = new ReadingController(pre, "note.md", host);
  try {
    await until(() => !!root.querySelector("h1"));
    assert.equal(root.querySelector("pre"), null);
    controller.dispose();
    assert.equal(root.querySelector("pre"), pre);
    assert.equal(disposed, 1);
  } finally {
    controller.dispose();
    highlighter.dispose();
    dom.window.close();
  }
});

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
    await until(() => colors().size > 1);
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
    await until(() => root.querySelectorAll(".cp-code").length === 0);
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

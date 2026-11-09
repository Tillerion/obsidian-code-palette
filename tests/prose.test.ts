import { test } from "node:test";
import assert from "node:assert/strict";
import { languages } from "../src/catalog.ts";
import * as prose from "../src/prose.ts";
import { parseCodeRegions } from "../src/markdown.ts";
import { normalizeSettings, resolveRule } from "../src/rules.ts";

export const samples: Record<string, string> = {
  python: "for item in items:\n    print(item)",
  c: "int total = 42;",
  cpp: 'std::cout << "Hello";',
  java: 'System.out.println("Hello");',
  csharp: 'Console.WriteLine("Hello");',
  javascript: "const total = 42;",
  typescript: "const total: number = 42;",
  go: 'fmt.Println("Hello")',
  rust: "let mut total = 42;",
  kotlin: "val total = 42",
  swift: "let total = 42",
  php: "$total = 42;",
  ruby: 'puts "Hello"',
  sql: "SELECT name\nFROM students\nWHERE score >= 60;",
  bash: 'echo "Hello"',
  powershell: "Get-ChildItem -Path .",
  bat: "@echo off",
  html: '<div class="demo">Hello</div>',
  css: ".demo { color: red; }",
  json: '{"name": "demo", "count": 2}',
  yaml: "name: demo",
  toml: 'name = "demo"',
  xml: '<item id="1">Hello</item>',
  markdown: "# Heading\n\n**bold**",
};

test("every catalog language recognizes representative unmarked code, aliases too", () => {
  assert.deepEqual(
    Object.keys(samples).sort(),
    languages.map((l) => l.id).sort(),
  );
  for (const lang of languages) {
    const found = prose.detectProse(samples[lang.id], lang.id, {
      lines: true,
      inline: false,
    });
    assert.ok(found.length > 0, lang.id);
    assert.equal(found[0].from, 0, lang.id);
    for (const alias of lang.aliases)
      assert.deepEqual(
        prose.detectProse(samples[lang.id], alias, {
          lines: true,
          inline: false,
        }),
        found,
      );
  }
});

test("Chinese exercise sentences isolate calls, SQL and quoted Chinese without coloring descriptions", () => {
  const source =
    '运行 print(len(items)) 后，输出什么？\n运行 print("你好") 后会怎样？';
  const found = prose.detectProse(source, "python", {
    lines: false,
    inline: true,
  });
  assert.deepEqual(
    found.map((r) => source.slice(r.from, r.to)),
    ["print(len(items))", 'print("你好")'],
  );
  const sql = "执行 SELECT name FROM students WHERE score >= 60 的结果是什么？";
  assert.deepEqual(
    prose
      .detectProse(sql, "sql", { lines: false, inline: true })
      .map((r) => sql.slice(r.from, r.to)),
    ["SELECT name FROM students WHERE score >= 60"],
  );
  for (const lang of languages)
    assert.deepEqual(
      prose.detectProse(
        "WHERE 子句有什么作用？\nPython 中的 for 用于循环。\nThis is a normal explanation.\nTrue\n2026-11-09\nhttps://example.com/print(x)",
        lang.id,
        { lines: true, inline: true },
      ),
      [],
      lang.id,
    );
});

test("adjacent SQL/Python lines share a region, switches are independent and disabled stays empty", () => {
  for (const lang of ["sql", "python"]) {
    const found = prose.detectProse(samples[lang], lang, {
      lines: true,
      inline: false,
    });
    assert.equal(found.length, 1);
    assert.equal(found[0].to, samples[lang].length);
    assert.deepEqual(
      prose.detectProse(samples[lang], lang, { lines: false, inline: false }),
      [],
    );
  }
});

test("arrays/subscripts remain code and formatted SQL columns retain one statement", () => {
  const python = "items = [1, 2, 3]\nprint(items)\nx = items[0]";
  assert.deepEqual(
    prose
      .proseRegions(python, parseCodeRegions(python), "python", {
        lines: true,
        inline: true,
      })
      .map((r) => r.text),
    [python],
  );
  const sql = "SELECT\n    name,\n    score\nFROM students\nWHERE score >= 60;";
  assert.deepEqual(
    prose.detectProse(sql, "sql", { lines: true, inline: false }),
    [{ from: 0, to: sql.length }],
  );
});

test("Markdown-aware ranges protect properties, marked code, links, formulas and plugin fences", () => {
  const source =
    "---\ntitle: print(0)\n---\n\nprint(1)\n\n运行 print(2) 后？\n\n`print(3)` [print(4)](https://x.test/print(5)) $print(6)$\n\n```dataviewjs\nprint(7)\n```\n\n$$\nprint(8)\n$$";
  const parsed = parseCodeRegions(source);
  const found = prose.proseRegions(source, parsed, "python", {
    lines: true,
    inline: true,
  });
  assert.deepEqual(
    found.map((r) => r.text),
    ["print(1)", "print(2)"],
  );
  for (const r of found) {
    assert.equal(r.prose, true);
    for (const s of r.segments)
      assert.equal(
        source.slice(s.from, s.to),
        r.text.slice(s.offset, s.offset + s.to - s.from),
      );
  }
});

test("dollars in protected fences do not mask later code; shortcut and wiki links stay protected", () => {
  const source =
    '```python\nprint("$$")\n```\n\nprint(42)\n\n[print(1)]\n\n[print(1)]: https://x.test\n\n运行 [[print(2)]] 后？';
  assert.deepEqual(
    prose
      .proseRegions(source, parseCodeRegions(source), "python", {
        lines: true,
        inline: true,
      })
      .map((r) => r.text),
    ["print(42)"],
  );
});

test("all language profiles also reach the real source-region integration", () => {
  for (const language of languages) {
    const source = samples[language.id];
    const found = prose.proseRegions(
      source,
      parseCodeRegions(source),
      language.id,
      { lines: true, inline: true },
    );
    assert.ok(
      found.length || parseCodeRegions(source).regions.length,
      language.id,
    );
  }
  const multiline =
    'def greet(name):\n    message = (\n        "Hello, "\n        + name\n    )\n    return message';
  assert.deepEqual(
    prose.detectProse(multiline, "python", { lines: true, inline: false }),
    [{ from: 0, to: multiline.length }],
  );
});

test("recognition settings survive reload only for explicit scopes; global and vault defaults cannot opt in", () => {
  const raw = {
    rules: [
      {
        kind: "folder",
        path: "exercises",
        language: "cpp",
        proseLines: true,
        proseInline: true,
      },
      { kind: "file", path: "old.md", language: "python" },
    ],
    defaultRule: {
      kind: "folder",
      path: "",
      language: "sql",
      proseLines: true,
      proseInline: true,
    },
    globalPalette: true,
  };
  const settings = normalizeSettings(raw);
  assert.equal(settings.rules[0].proseLines, true);
  assert.equal(settings.rules[0].proseInline, true);
  assert.equal(settings.rules[1].proseLines, false);
  assert.equal(resolveRule("exercises/note.md", settings)?.proseLines, true);
  assert.equal(resolveRule("other.md", settings)?.proseLines, false);
  assert.deepEqual(
    normalizeSettings(JSON.parse(JSON.stringify(settings))),
    settings,
  );
  settings.defaultRule = null;
  assert.ok(!resolveRule("other.md", settings)?.proseLines);
});

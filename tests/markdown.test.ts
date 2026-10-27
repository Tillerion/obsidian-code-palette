import { test } from "node:test";
import assert from "node:assert/strict";
import { findCodeRegions } from "../src/markdown.ts";
test("table inline spans and multiple backticks are found without treating escaped ticks as code", () => {
  const s = "| 方法 |\n|---|\n| `find(x)` |\n\n``a ` b`` and \\`plain\\`";
  const r = findCodeRegions(s);
  assert.deepEqual(
    r.map((x) => x.text),
    ["find(x)", "a ` b"],
  );
  assert.ok(r.every((x) => x.kind === "inline"));
});
test("fences own their contents, explicit languages and unclosed blocks survive", () => {
  const s = '```java title=demo\nString s = "`x`";\n```\n\n~~~cpp\nint x=1;';
  const r = findCodeRegions(s);
  assert.equal(r.length, 2);
  assert.equal(r[0].language, "java title=demo");
  assert.equal(r[0].text, 'String s = "`x`";');
  assert.equal(r[1].text, "int x=1;");
});
test("quoted and indented block content maps back to source without highlighting quote/indent prefixes", () => {
  const s = "> ```python\n> x = 1\n> print(x)\n> ```\n\n    int a;\n    int b;";
  const r = findCodeRegions(s);
  assert.deepEqual(
    r.map((x) => x.text),
    ["x = 1\nprint(x)", "int a;\nint b;"],
  );
  for (const b of r)
    for (const p of b.segments)
      assert.equal(
        s.slice(p.from, p.to),
        b.text.slice(p.offset, p.offset + p.to - p.from),
      );
});
test("frontmatter, html blocks and functional code contents never produce extra inline regions", () => {
  const s =
    "---\ntitle: `not code`\n---\n\n<div>\n`also not code`\n</div>\n\n```mermaid\ngraph TD\nA[`node`]\n```\n";
  const r = findCodeRegions(s);
  assert.equal(r.length, 1);
  assert.equal(r[0].language, "mermaid");
});
test("Unicode and CRLF source offsets remain exact", () => {
  const s = '中文 `"😀"`\r\n\r\n```cpp\r\nint x;\r\n```';
  const r = findCodeRegions(s);
  assert.equal(r[0].text, '"😀"');
  assert.equal(r[1].text, "int x;");
  for (const b of r)
    for (const p of b.segments)
      assert.equal(
        s.slice(p.from, p.to),
        b.text.slice(p.offset, p.offset + p.to - p.from),
      );
});

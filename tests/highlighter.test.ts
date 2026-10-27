import { test } from "node:test";
import assert from "node:assert/strict";
import { Highlighter } from "../src/highlighter.ts";

test("real offline grammars color Python C++ and Java and preserve every source character", async () => {
  const h = new Highlighter();
  try {
    for (const [lang, code] of [
      ["python", 'def greet(name):\n    return "你好" + str(42)'],
      ["cpp", "#include <string>\nint main() { return 42; }"],
      ["java", 'public class Demo { String s = "你好"; }'],
    ]) {
      const r = await h.highlight(code, lang, "one-dark-pro");
      assert.ok(r);
      assert.equal(r.tokens.map((t) => t.text).join(""), code);
      assert.ok(new Set(r.tokens.map((t) => t.color)).size >= 3, lang);
      for (const t of r.tokens) assert.equal(code.slice(t.from, t.to), t.text);
    }
  } finally {
    h.dispose();
  }
});
test("themes actually change token colors; multiline comment context survives", async () => {
  const h = new Highlighter();
  try {
    const code = "/* first\nsecond */\nint x = 1;";
    const a = await h.highlight(code, "cpp", "one-dark-pro");
    const b = await h.highlight(code, "cpp", "light-plus");
    assert.notEqual(a?.background, b?.background);
    assert.notDeepEqual(
      a?.tokens.map((t) => t.color),
      b?.tokens.map((t) => t.color),
    );
    const second = a?.tokens.find((t) => t.text.includes("second"));
    assert.ok(second);
    assert.equal(
      second.color,
      a?.tokens.find((t) => t.text.includes("first"))?.color,
    );
  } finally {
    h.dispose();
  }
});
test("unsupported language returns null and disposed engine cannot publish new results", async () => {
  const h = new Highlighter();
  assert.equal(await h.highlight("x", "not-real", "nord"), null);
  h.dispose();
  assert.equal(await h.highlight("x", "python", "nord"), null);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { applyCode, restoreCode } from "../src/rendering.ts";
import { Highlighter } from "../src/highlighter.ts";
test("reading highlight preserves copy text and original nodes, scoped styles restore exactly", async () => {
  const dom = new JSDOM(
    '<p>正文<code class="old" style="padding:2px"><span>return "&lt;中文&gt;"</span></code></p>',
  );
  const el = dom.window.document.querySelector("code")!;
  const old = el.firstChild;
  const original = el.outerHTML;
  const h = new Highlighter();
  try {
    const result = await h.highlight(el.textContent!, "python", "one-dark-pro");
    assert.ok(result);
    const record = applyCode(el, result, true);
    assert.equal(el.textContent, 'return "<中文>"');
    assert.ok(el.querySelectorAll(".cp-token").length > 1);
    assert.ok(el.classList.contains("cp-inline"));
    assert.equal(
      dom.window.document.querySelector("p")!.getAttribute("style"),
      null,
    );
    restoreCode(record);
    assert.equal(el.firstChild, old);
    assert.equal(el.outerHTML, original);
  } finally {
    h.dispose();
  }
});
test("a DOM update after highlighting is not overwritten by restoration", async () => {
  const d = new JSDOM("<pre><code>int x=1;</code></pre>");
  const el = d.window.document.querySelector("code")!;
  const h = new Highlighter();
  try {
    const result = await h.highlight(el.textContent!, "cpp", "nord");
    assert.ok(result);
    const record = applyCode(el, result, true);
    el.textContent = "new content";
    restoreCode(record);
    assert.equal(el.textContent, "new content");
    assert.equal(el.classList.contains("cp-code"), false);
    assert.equal(el.parentElement!.classList.contains("cp-pre"), false);
  } finally {
    h.dispose();
  }
});

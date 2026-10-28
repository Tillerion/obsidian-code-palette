import { test } from "node:test";
import assert from "node:assert/strict";
import { EditorState } from "@codemirror/state";
import { codeRegions } from "../src/editor-regions.ts";
import { findCodeRegions } from "../src/markdown.ts";

test("incremental code regions match fresh parsing through YAML, fence and Unicode edits", () => {
  let state = EditorState.create({
    doc: "---\ntitle: Demo\ntext: |\n  ```\n---\n\nIntro\n\n```python\nreturn 1\n```\n\n`x`\n",
  });
  codeRegions(state);
  function change(from: number, to: number, insert: string) {
    const tr = state.update({ changes: { from, to, insert } });
    const regions = codeRegions(tr.state, state, tr.changes);
    state = tr.state;
    assert.deepEqual(regions, findCodeRegions(state.doc.toString()));
    return regions;
  }
  let at = state.doc.toString().indexOf("return");
  assert.equal(change(at, at, "名称 = 2\n")[0].text, "名称 = 2\nreturn 1");
  at = state.doc.toString().indexOf("---", 4);
  change(at, at + 3, "...");
  at = state.doc.toString().indexOf("...");
  change(at, at + 3, "broken");
  assert.equal(
    codeRegions(state).length,
    2,
    "unclosed YAML retains the existing Markdown fallback",
  );
  change(at, at + 6, "---");
  at = state.doc.toString().indexOf("```python");
  change(at, at + 3, "");
  change(0, 0, "Intro before YAML\n");
  change(0, 18, "");
});

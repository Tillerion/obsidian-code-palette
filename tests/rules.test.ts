import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultSettings,
  resolveRule,
  chooseLanguage,
  moveRules,
  normalizeSettings,
} from "../src/rules.ts";

const rule = (
  kind: "file" | "folder",
  path: string,
  language: string,
  extra = {},
) => ({
  kind,
  path,
  language,
  enabled: true,
  inline: true,
  blocks: true,
  recursive: true,
  ...extra,
});

test("file beats nearest folder, which beats ancestor and vault default", () => {
  const s = defaultSettings();
  s.defaultRule = rule("folder", "", "java");
  s.rules = [
    rule("folder", "课程", "python"),
    rule("folder", "课程/数据库", "sql"),
    rule("file", "课程/数据库/demo.md", "cpp"),
  ];
  assert.equal(resolveRule("课程/数据库/demo.md", s)?.language, "cpp");
  assert.equal(resolveRule("课程/数据库/other.md", s)?.language, "sql");
  assert.equal(resolveRule("课程/other.md", s)?.language, "python");
  assert.equal(resolveRule("elsewhere.md", s)?.language, "java");
});
test("folder boundary and nonrecursive match do not leak to siblings or descendants", () => {
  const s = defaultSettings();
  s.rules = [rule("folder", "a/b", "cpp", { recursive: false })];
  assert.equal(resolveRule("a/b/note.md", s)?.language, "cpp");
  assert.equal(resolveRule("a/bb/note.md", s), null);
  assert.equal(resolveRule("a/b/sub/note.md", s), null);
});
test("explicit exclusion overrides inherited rule and master switch disables everything", () => {
  const s = defaultSettings();
  s.rules = [
    rule("folder", "a", "java"),
    rule("file", "a/skip.md", "python", { enabled: false }),
  ];
  assert.equal(resolveRule("a/skip.md", s)?.enabled, false);
  s.enabled = false;
  assert.equal(resolveRule("a/ok.md", s), null);
});
test("explicit language including plain text is preserved, unsupported never guesses", () => {
  assert.equal(chooseLanguage("c++", "python"), "cpp");
  assert.equal(chooseLanguage("java title=Demo", "python"), "java");
  assert.equal(chooseLanguage("txt", "python"), "text");
  assert.equal(chooseLanguage("imaginary-language", "python"), null);
  assert.equal(chooseLanguage("mermaid", "python"), null);
  assert.equal(chooseLanguage("", "js"), "javascript");
});
test("renaming a folder follows descendant rules without moving prefix siblings", () => {
  const rules = [
    rule("file", "a/b/n.md", "cpp"),
    rule("folder", "a/b/sub", "java"),
    rule("file", "a/bb/n.md", "sql"),
  ];
  assert.deepEqual(
    moveRules(rules, "a/b", "新目录").map((x) => x.path),
    ["新目录/n.md", "新目录/sub", "a/bb/n.md"],
  );
});
test("invalid persisted values fall back safely, valid false switches survive", () => {
  const s = normalizeSettings({
    darkTheme: "nope",
    themeMode: "bad",
    rules: [
      rule("folder", "../outside", "cpp"),
      rule("folder", "课程", "java", { inline: false }),
    ],
  });
  assert.equal(s.darkTheme, "one-dark-pro");
  assert.equal(s.themeMode, "auto");
  assert.equal(s.rules.length, 1);
  assert.equal(s.rules[0].inline, false);
  assert.equal(resolveRule("untouched.md", s), null);
});

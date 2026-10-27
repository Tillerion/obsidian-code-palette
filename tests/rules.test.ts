import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultSettings,
  resolveRule,
  chooseLanguage,
  moveRules,
  normalizeSettings,
  setRule,
} from "../src/rules.ts";
test("root-folder rules work immediately and normalize duplicate paths", () => {
  const s = defaultSettings();
  s.rules = setRule(s.rules, rule("folder", "/", "cpp"));
  assert.equal(resolveRule("note.md", s)?.language, "cpp");
  assert.equal(s.rules[0].path, "");
  s.rules = setRule(s.rules, rule("folder", "", "java"));
  assert.equal(s.rules.length, 1);
  assert.equal(resolveRule("deep/note.md", s)?.language, "java");
});

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

test("global palette bypasses saved language rules and restores them when disabled", () => {
  const s = defaultSettings();
  s.rules = [rule("file", "note.md", "cpp", { enabled: false })];
  s.globalPalette = true;
  const global = resolveRule("note.md", s);
  assert.equal(global?.enabled, true);
  assert.equal(global?.language, "text");
  assert.equal(global?.paletteOnly, true);
  assert.equal(resolveRule("unconfigured/deep/note.md", s)?.paletteOnly, true);
  assert.equal(s.rules[0].enabled, false);
  assert.equal(s.rules[0].language, "cpp");
  s.globalPalette = false;
  assert.equal(resolveRule("note.md", s)?.enabled, false);
  assert.equal(resolveRule("unconfigured.md", s), null);
  s.globalPalette = true;
  s.enabled = false;
  assert.equal(resolveRule("note.md", s), null);
});
test("global palette never supplies or guesses a language for unlabelled code", () => {
  assert.equal(chooseLanguage("", "python", true), "text");
  assert.equal(chooseLanguage("java", "python", true), "java");
  assert.equal(chooseLanguage("c++", "python", true), "cpp");
  assert.equal(chooseLanguage("txt", "python", true), "text");
  assert.equal(chooseLanguage("not-supported", "python", true), "text");
  assert.equal(chooseLanguage("mermaid", "python", true), null);
  assert.equal(chooseLanguage("dataview", "python", true), null);
});
test("persisted global palette is opt-in and invalid values preserve old behavior", () => {
  assert.equal(
    resolveRule("note.md", normalizeSettings({ globalPalette: true }))
      ?.paletteOnly,
    true,
  );
  assert.equal(resolveRule("note.md", normalizeSettings({})), null);
  assert.equal(
    resolveRule("note.md", normalizeSettings({ globalPalette: "true" })),
    null,
  );
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

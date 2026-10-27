# Code Palette Implementation Plan

> **For agentic workers:** Execute natively in this session under the user's authorization. Use an independent reviewer after implementation (requesting-code-review skill).

**Goal:** Deliver the approved Obsidian Code Palette v0.1 plugin and private GitHub repository.

**Architecture:** A pure rules module resolves a note's configuration. A bounded Shiki singleton provides token offsets and colors. Reading DOM and CM6 decorations share those tokens; settings and menus only persist configuration.

**Tech Stack:** TypeScript, Shiki, CodeMirror 6, Obsidian, esbuild, Node test runner + tsx + jsdom.

**Spec:** ../specs/2026-10-27-code-palette-design.md

## Global Constraints
- Version 0.1.0 / release v0.1; id code-palette.
- Original note content and explicit fence languages are preserved.
- All resources work offline; only code areas receive theme colors.
- Default dark one-dark-pro, light light-plus; scope default disabled.

## Review Focus
- Folder boundary a/b versus a/bb and nonrecursive rules.
- Code-like backticks in fences, multiline comments, escaped delimiters and nested content.
- Delayed highlights after a rule change, view destruction or plugin unload.
- DOM restoration and unchanged copy text under repeated refreshes.
- Async initialization, long documents, moving files, multiple editor panes and embedded source paths.

### Task 1: Rules and resource engine
Files: src/rules.ts, src/catalog.ts, src/highlighter.ts; tests/rules.test.ts, tests/highlighter.test.ts.
Interfaces: resolveRule(path, settings), chooseLanguage(explicit, fallback), Highlighter.highlight(code, lang, theme).
- [ ] Write failing tests for inheritance, exclusions, recursion, renames and explicit languages.
- [ ] Run failing tests, implement pure rules and validation, run passing tests.
- [ ] Test real Shiki token results, source offsets, language aliases, multiline state and theme differences; implement and verify.

### Task 2: Reading/editor rendering
Files: src/markdown.ts, src/reading.ts, src/editor.ts; tests/markdown.test.ts, tests/reading.test.ts.
Interfaces: findCodeRegions(text), applyReadingCode(element, result, background), createEditorExtension(host).
- [ ] Write failing tests for code region boundaries, escapes, fences, tables, indented code and DOM restoration.
- [ ] Implement scanning, safe token spans and scoped marks, including full-block token context and visible-range decoration.
- [ ] Verify original content and protection of functional blocks and unknown languages.

### Task 3: Plugin UI and lifecycle
Files: src/main.ts, src/settings.ts, src/modals.ts, styles.css.
- [ ] Wire settings, per-note status, rule changes and rename/delete hooks; validate persisted inputs.
- [ ] Implement searchable language selection, rule editor, theme preview and settings rule list.
- [ ] Verify real Obsidian reading/live/source views, menus, settings refresh and unload using dedicated test vault.

### Task 4: Delivery and review
Files: scripts/package.mjs, docs/verification.md, README.md, THIRD_PARTY_NOTICES.md.
- [ ] Run full tests, typecheck and production build; package source and install ZIP.
- [ ] Independent review and necessary fixes; rerun affected/full checks.
- [ ] Commit only project files, create private repository, push main and v0.1 tag, verify remote visibility and revision.

# Code Palette 0.3.1 Implementation Plan

**Goal:** Highlight unmarked exercise code in manually enabled file/folder rules and expose the same rule actions in Notebook Navigator.

**Architecture:** Shared, conservative language profiles produce source ranges before Shiki paints them. Editor decorations retain the 0.3.0 async lifecycle; reading uses reversible text-node wrappers, preserving Markdown structure. A small optional adapter registers Navigator's public menu hooks.

**Tech stack:** Existing TypeScript, Lezer Markdown, CodeMirror 6, Shiki and node:test; no new dependencies.

**Spec:** Approved chat design plus user corrections: all 24 catalog languages; prose recognition ONLY in manually configured file/folder rules, not vault defaults or global palette.

## Constraints and review focus

- Both prose switches default off; source text, paragraph layout, existing languages and rule priority remain unchanged.
- Use the rule language, never language guessing or keyword-only coloring.
- Protect code fences, inline code, links/URLs, properties, math, embedded/plugin output.
- Preserve native DOM formatting, clipboard text and stale-result/IME guards.
- Navigator callbacks target clicked paths, single Markdown files/folders only; dispose hooks and handle enable order without duplicates.

## Tasks

### 1. Shared recognition and scoped settings

- [x] Add failing tests for all 24 catalog languages, mixed Chinese, multiline context, negative prose/protected syntax, aliases and opt-in/default isolation.
- [x] Implement `src/prose.ts`: `detectProse(text, language, options)` and Markdown-aware `proseRegions(source, tree, language, options)` returning offset ranges / CodeRegions. Cache unchanged text units within a bounded budget.
- [x] Add optional `proseLines` / `proseInline` to Rule, normalization and file/folder modal only. Force both off for resolved vault defaults/global fallback.
- [x] Run recognition/rule tests.

### 2. Editor and reading integration

- [x] Add failing tests for actual editor coloring and reversible reading rendering (including mutations, embeds, stale async results and toggle off).
- [x] Merge prose regions into existing editor paint pipeline; color-only prose decorations, preserving native typography and stable editing.
- [x] Implement `src/reading-prose.ts` with reversible text-node rendering, ownership, async cancellation, and paragraph/text grouping. Integrate plain-only postprocessors and mutation refresh without self-triggered loops.
- [x] Run relevant tests, then full suite/type check/build.

### 3. Navigator integration

- [x] Add failing tests for clicked paths, both menus, multi-select filtering, API replacement/disposal and absent/old API.
- [x] Implement `src/navigator.ts`; share rule action construction with native menu, register public file/folder hooks, idempotent availability checks, cleanup on unload.
- [x] Run integration tests and independent code review; fix important findings.

### 4. Release

- [ ] Update bilingual README, one-change-per-line changelog, examples, verification and release notes; version/package/lock/compatibility 0.3.1.
- [ ] Run `npm run package`; inspect archive and diff; commit/push main and bare 0.3.1 tag.
- [ ] Verify Actions and published assets; check community scan when accessible. Keep ZIP available. Report actual verification boundaries.

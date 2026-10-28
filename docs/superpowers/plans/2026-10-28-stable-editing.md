# Stable Editing 0.3.0 Implementation Plan

**Goal:** Keep code coloring continuous while typing and keep Markdown source editing active until the user finishes it.

**Architecture:** Existing pure scope/language rules and theme selection remain shared. A dedicated preview state field owns editing locks; the editor paint layer maps existing tokens through transactions and swaps in validated results. Reading retains its own renderer. Shiki and bundled themes remain unchanged.

**Tech Stack:** TypeScript, Obsidian public CM6 extensions, Shiki, node:test/jsdom.

**Spec:** User-approved design in this conversation, 2026-10-28.

## Global constraints

- Version 0.3.0, bare release tag; preserve notes, settings, 24 languages, 10 themes, functional-block exclusions and global fallback priority.
- Markdown body preview has an independent enabled setting, default true for backward compatibility.
- Double-click/source selection enters a persistent block editing lock. Moving away does not unlock. An editor command finishes all Markdown edits in the current editor; it must wait for IME composition to end.
- No foreground mouse takeover for routine checks; publish only after test, build, review and native backend checks.

## Review focus

Composition and selection changes must not remove source; delimiter deletion must not leave coloring on prose; multiple locked blocks and edits before blocks must retain mapped identity; stale async results must not overwrite current policy; disable/re-enable must restore clean state.

## Task 1: Continuous editor coloring

- [x] Add delayed-highlighter regression asserting every input transaction retains existing code colors and cursor moves do not trigger repaint.
- [x] Verify failure against 0.2.1, then replace clear-before-await with mapped token decorations and synchronous base colors.
- [x] Restrict mapped tokens to currently valid code segments and current language, and atomically publish version-checked results. Reuse unchanged blocks through the existing content cache.
- [x] Test delimiter deletion, newlines, stale work, theme/policy changes, large blocks and disable.

## Task 2: Stable Markdown edit sessions

- [x] Add failing tests for persistent editing after leaving the block, edits before it, explicit finish, independent preview setting and legacy settings migration.
- [x] Extract preview state to src/editor-preview.ts, shared region parsing to src/editor-regions.ts and synchronous decoration builders to src/editor-paint.ts.
- [x] Export finishMarkdownEditing(view), connect the native editor command, and guard completion during composition. Add settings toggle; keep reading and editing preview decisions separate from syntax language selection.
- [x] Test multi-block/multi-selection, source mode, composition, undo/redo, cancellation and resource cleanup.

## Task 3: Validate and release

- [x] Run full check, independent code review and native Obsidian background typing/frame probes; fix findings and record exact limits.
- [x] Update bilingual README/changelog, example and verification/release notes; package ZIP and verify contents.
- [ ] Commit/push main and 0.3.0 tag; verify hosted workflow, assets and attestations; update public community text and confirm completed scan.

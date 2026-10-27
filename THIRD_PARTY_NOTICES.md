# Third-party notices

Code Palette is MIT licensed. The offline build bundles Shiki, its selected language grammars and themes, the Oniguruma WebAssembly engine, and Lezer's Markdown parser.

- Shiki and engine packages: https://github.com/shikijs/shiki
- TextMate grammars and themes: https://github.com/shikijs/textmate-grammars-themes
- Lezer: https://github.com/lezer-parser/markdown

Full upstream grammar and theme notices are included in `licenses/textmate-grammar-notices.txt` and `licenses/textmate-theme-notices.txt`. They include upstream projects not selected by this plugin, to retain the complete attribution record. Notice snapshots were retrieved from the upstream repository on 2026-10-27.

The packaging script also copies installed production dependencies' LICENSE / NOTICE / COPYING files into `licenses/dependency-licenses.txt` in every install ZIP. Exact dependency versions are recorded in `package-lock.json`.

CodeMirror and Obsidian are supplied by the host application rather than bundled in main.js.

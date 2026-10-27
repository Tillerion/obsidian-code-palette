import {
  StateEffect,
  type Extension,
  type EditorState,
  type Text,
  type Range,
} from "@codemirror/state";
import {
  ViewPlugin,
  Decoration,
  type DecorationSet,
  type EditorView,
  type ViewUpdate,
} from "@codemirror/view";
import type { PaletteHost } from "./host";
import { resolveRule, chooseLanguage } from "./rules";
import { findCodeRegions, type CodeRegion } from "./markdown";
import { tokenStyle } from "./rendering";
const refresh = StateEffect.define<number>();
const painted = StateEffect.define<number>();
export function createEditorExtension(
  host: PaletteHost,
  getPath: (state: EditorState) => string,
): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet = Decoration.none;
      private generation = 0;
      private dead = false;
      private timer?: ReturnType<typeof setTimeout>;
      private parsedDoc?: Text;
      private regions: CodeRegion[] = [];
      private path = "";
      private unsubscribe: () => void;
      constructor(private view: EditorView) {
        this.unsubscribe = host.subscribe(() => {
          if (!this.dead)
            this.view.dispatch({ effects: refresh.of(host.revision) });
        });
        this.schedule();
      }
      update(update: ViewUpdate) {
        const path = getPath(update.state);
        if (
          update.docChanged ||
          update.viewportChanged ||
          path !== this.path ||
          update.transactions.some((t) => t.effects.some((e) => e.is(refresh)))
        ) {
          this.decorations = Decoration.none;
          this.schedule();
        }
      }
      private schedule() {
        this.generation++;
        clearTimeout(this.timer);
        this.timer = setTimeout(() => void this.render(), 35);
      }
      private async render() {
        if (this.dead || !host.active) return;
        const generation = this.generation,
          doc = this.view.state.doc;
        const path = getPath(this.view.state);
        this.path = path;
        const rule = path ? resolveRule(path, host.settings) : null;
        if (!rule?.enabled) {
          this.commit(Decoration.none, generation);
          return;
        }
        if (this.parsedDoc !== doc) {
          this.regions = findCodeRegions(doc.toString());
          this.parsedDoc = doc;
        }
        const visible = this.view.visibleRanges;
        const selected = this.regions.filter(
          (r) =>
            (r.kind === "inline" ? rule.inline : rule.blocks) &&
            visible.some((v) => r.from <= v.to && r.to >= v.from),
        );
        const theme = host.theme(this.view.dom.ownerDocument);
        try {
          const items = await Promise.all(
            selected.map(async (region) => {
              const lang = chooseLanguage(region.language, rule.language);
              return {
                region,
                result: lang
                  ? await host.highlighter.highlight(region.text, lang, theme)
                  : null,
              };
            }),
          );
          if (
            this.dead ||
            !host.active ||
            generation !== this.generation ||
            this.view.state.doc !== doc
          )
            return;
          const marks: Range<Decoration>[] = [];
          const lines = new Set<number>();
          for (const { region: r, result } of items) {
            if (!result) continue;
            const vars = `--cp-fg:${result.foreground};--cp-bg:${result.background};color:${result.foreground}!important`;
            if (r.kind === "block") {
              const first = doc.lineAt(r.from).number,
                last = doc.lineAt(Math.max(r.from, r.to - 1)).number;
              for (let n = first; n <= last; n++) {
                const line = doc.line(n);
                if (
                  !lines.has(line.from) &&
                  visible.some((v) => line.from <= v.to && line.to >= v.from)
                ) {
                  lines.add(line.from);
                  marks.push(
                    Decoration.line({
                      class:
                        "cp-code-line" +
                        (host.settings.blockBackground ? " cp-background" : ""),
                      attributes: { style: vars },
                    }).range(line.from),
                  );
                }
              }
            }
            for (const segment of r.segments) {
              if (segment.to <= segment.from) continue;
              const background =
                r.kind === "inline" &&
                host.settings.inlineBackground === "theme";
              marks.push(
                Decoration.mark({
                  class:
                    r.kind === "inline"
                      ? "cp-editor-inline" +
                        (background ? " cp-background" : "")
                      : "cp-editor-block",
                  attributes: { style: vars },
                }).range(segment.from, segment.to),
              );
              for (const t of result.tokens) {
                const a = Math.max(t.from, segment.offset),
                  b = Math.min(
                    t.to,
                    segment.offset + segment.to - segment.from,
                  );
                if (b <= a) continue;
                const from = segment.from + a - segment.offset,
                  to = segment.from + b - segment.offset;
                // Marks must not span a line break; CodeMirror keeps newline layout native.
                let p = from;
                while (p < to) {
                  const line = doc.lineAt(p),
                    end = Math.min(to, line.to);
                  if (end > p)
                    marks.push(
                      Decoration.mark({
                        class: "cp-syntax",
                        attributes: { style: tokenStyle(t.color, t.fontStyle) },
                      }).range(p, end),
                    );
                  p = end < to ? end + 1 : to;
                }
              }
            }
          }
          this.commit(Decoration.set(marks, true), generation);
        } catch (error) {
          if (!this.dead) host.reportError(error);
        }
      }
      private commit(decorations: DecorationSet, generation: number) {
        if (this.dead || generation !== this.generation) return;
        this.decorations = decorations;
        this.view.dispatch({ effects: painted.of(generation) });
      }
      destroy() {
        this.dead = true;
        this.generation++;
        clearTimeout(this.timer);
        this.unsubscribe();
      }
    },
    { decorations: (value) => value.decorations },
  );
}

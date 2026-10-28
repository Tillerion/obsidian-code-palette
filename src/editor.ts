import {
  StateEffect,
  RangeSet,
  type EditorState,
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
import type { HighlightResult } from "./highlighter";
import { resolveRule, chooseLanguage } from "./rules";
import type { CodeRegion } from "./markdown";
import { codeRegions } from "./editor-regions";
import { createMarkdownPreviews, refreshEditor } from "./editor-preview";
import { paintEditor } from "./editor-paint";
export { finishMarkdownEditing } from "./editor-preview";
const painted = StateEffect.define<number>();
export function createEditorExtension(
  host: PaletteHost,
  getPath: (s: EditorState) => string,
  isLive: (s: EditorState) => boolean = () => false,
) {
  const previews = createMarkdownPreviews(host, getPath, isLive);
  return [
    previews,
    ViewPlugin.fromClass(
      class {
        decorations: DecorationSet = Decoration.none;
        private tokens: DecorationSet = Decoration.none;
        private generation = 0;
        private dead = false;
        private timer?: number;
        private window: Window;
        private policy = "";
        private rule: ReturnType<typeof resolveRule> = null;
        private foreground = "var(--text-normal)";
        private background = "var(--code-background)";
        private cache = new Map<string, HighlightResult | null>();
        private jobs = new Map<string, Promise<HighlightResult | null>>();
        private cachedChars = 0;
        private unsubscribe: () => void;
        constructor(private view: EditorView) {
          this.window = view.dom.ownerDocument.defaultView ?? window;
          this.unsubscribe = host.subscribe(() => {
            if (!this.dead)
              view.dispatch({ effects: refreshEditor.of(host.revision) });
          });
          this.synchronize();
          this.schedule();
        }
        private selected() {
          const rule = host.active && host.settings.enabled ? this.rule : null;
          if (!rule?.enabled) return [];
          const p = this.view.state.field(previews).decorations;
          return codeRegions(this.view.state).filter((r) => {
            if (
              r.text.length > 200000 ||
              !(r.kind === "inline" ? rule.inline : rule.blocks)
            )
              return false;
            let hidden = false;
            p.between(r.from, r.to, (from, to, v) => {
              if (v.spec.block && from === r.from && to === r.to) hidden = true;
            });
            return !hidden && !!this.language(r);
          });
        }
        private language(r: CodeRegion) {
          const rule = this.rule;
          return rule?.enabled
            ? chooseLanguage(
                r.language,
                rule.language,
                rule.paletteOnly,
                rule.existingLanguage,
              )
            : null;
        }
        update(update: ViewUpdate) {
          const current = this.view.state.field(previews).decorations;
          const previewChanged = !RangeSet.eq(
            [current],
            [update.startState.field(previews).decorations],
          );
          if (update.docChanged) {
            if (host.active && host.settings.enabled && this.rule?.enabled)
              codeRegions(update.state, update.startState, update.changes);
            this.tokens = this.tokens.map(update.changes);
          }
          if (
            update.docChanged ||
            update.viewportChanged ||
            previewChanged ||
            getPath(update.startState) !== getPath(update.state) ||
            update.transactions.some((t) =>
              t.effects.some((e) => e.is(refreshEditor)),
            )
          ) {
            this.synchronize();
            this.schedule();
          }
        }
        private synchronize() {
          const rule = getPath(this.view.state)
            ? resolveRule(getPath(this.view.state), host.settings)
            : null;
          this.rule = rule;
          const policy = JSON.stringify([
            getPath(this.view.state),
            rule,
            host.active,
            host.settings.enabled,
          ]);
          if (this.policy !== policy) {
            this.tokens = Decoration.none;
            this.policy = policy;
          }
          const regions = this.selected(),
            doc = this.view.state.doc;
          const retained: Range<Decoration>[] = [];
          function firstOverlapping(
            items: readonly { to: number }[],
            from: number,
          ) {
            let low = 0,
              high = items.length;
            while (low < high) {
              const middle = (low + high) >>> 1;
              if (items[middle].to <= from) low = middle + 1;
              else high = middle;
            }
            return low;
          }
          this.tokens.between(0, doc.length, (from, to, value) => {
            for (
              let i = firstOverlapping(regions, from);
              i < regions.length && regions[i].from < to;
              i++
            ) {
              const r = regions[i];
              if (value.spec.cpLanguage !== this.language(r)) continue;
              for (
                let j = firstOverlapping(r.segments, from);
                j < r.segments.length && r.segments[j].from < to;
                j++
              ) {
                const s = r.segments[j];
                let a = Math.max(from, s.from),
                  b = Math.min(to, s.to);
                while (a < b) {
                  const line = doc.lineAt(a),
                    end = Math.min(b, line.to);
                  if (end > a) retained.push(value.range(a, end));
                  a = end < b ? end + 1 : b;
                }
              }
            }
          });
          this.tokens = Decoration.set(retained, true);
          const base = paintEditor(
            regions.map((region) => ({
              region,
              result: {
                foreground: this.foreground,
                background: this.background,
                tokens: [],
              },
            })),
            doc,
            this.view.visibleRanges,
            host.settings,
            (r) => this.language(r),
          );
          this.decorations = base.update({ add: retained, sort: true });
        }
        private schedule() {
          this.generation++;
          this.window.clearTimeout(this.timer);
          this.timer = this.window.setTimeout(() => {
            if (this.view.composing) {
              this.schedule();
              return;
            }
            void this.render();
          }, 35);
        }
        private async render() {
          if (this.dead) return;
          const generation = this.generation,
            doc = this.view.state.doc,
            theme = host.theme(this.view.dom.ownerDocument),
            visible = this.view.visibleRanges;
          const regions = this.selected().filter((r) =>
            visible.some((v) => r.from <= v.to && r.to >= v.from),
          );
          try {
            const items = await Promise.all(
              regions.map(async (region) => {
                const lang = this.language(region)!;
                const key = lang + "\0" + theme + "\0" + region.text;
                let result = this.cache.get(key);
                if (!this.cache.has(key)) {
                  let job = this.jobs.get(key);
                  if (!job) {
                    job = host.highlighter.highlight(region.text, lang, theme);
                    this.jobs.set(key, job);
                  }
                  try {
                    result = await job;
                    if (!this.dead && !this.cache.has(key)) {
                      this.cache.set(key, result);
                      this.cachedChars += key.length;
                      while (
                        this.cache.size > 128 ||
                        this.cachedChars > 2_000_000
                      ) {
                        const first = this.cache.keys().next().value!;
                        this.cachedChars -= first.length;
                        this.cache.delete(first);
                      }
                    }
                  } finally {
                    if (this.jobs.get(key) === job) this.jobs.delete(key);
                  }
                }
                return { region, result: result ?? null };
              }),
            );
            if (
              this.dead ||
              generation !== this.generation ||
              this.view.state.doc !== doc
            )
              return;
            if (this.view.composing) {
              this.schedule();
              return;
            }
            const palette = items.find((i) => i.result)?.result;
            if (palette) {
              this.foreground = palette.foreground;
              this.background = palette.background;
            }
            const paintedSet = paintEditor(
              items,
              doc,
              visible,
              host.settings,
              (r) => this.language(r),
            );
            const tokens: Range<Decoration>[] = [];
            paintedSet.between(0, doc.length, (from, to, v) => {
              if (v.spec.class === "cp-syntax") tokens.push(v.range(from, to));
            });
            this.tokens = Decoration.set(tokens, true);
            this.synchronize();
            this.view.dispatch({ effects: painted.of(generation) });
          } catch (e) {
            if (!this.dead && generation === this.generation)
              host.reportError(e);
          }
        }
        destroy() {
          this.dead = true;
          this.generation++;
          this.window.clearTimeout(this.timer);
          this.unsubscribe();
          this.cache.clear();
          this.jobs.clear();
        }
      },
      { decorations: (v) => v.decorations },
    ),
  ] as const;
}

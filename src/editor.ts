import {
  StateEffect,
  StateField,
  type EditorState,
  type Text,
  type Range,
} from "@codemirror/state";
import {
  ViewPlugin,
  Decoration,
  type DecorationSet,
  EditorView,
  type ViewUpdate,
} from "@codemirror/view";
import type { PaletteHost } from "./host";
import { resolveRule, chooseLanguage, rendersMarkdownBody } from "./rules";
import { findCodeRegions, type CodeRegion } from "./markdown";
import { tokenStyle } from "./rendering";
import { MarkdownPreviewWidget } from "./markdown-widget";
const refresh = StateEffect.define<number>();
const painted = StateEffect.define<number>();
export function createEditorExtension(
  host: PaletteHost,
  getPath: (state: EditorState) => string,
  isLivePreview: (state: EditorState) => boolean = () => false,
) {
  const parsed = new WeakMap<Text, CodeRegion[]>();
  const regionsFor = (state: EditorState) => {
    let regions = parsed.get(state.doc);
    if (!regions) {
      regions = findCodeRegions(state.doc.toString());
      parsed.set(state.doc, regions);
    }
    return regions;
  };
  const previewsFor = (state: EditorState): DecorationSet => {
    if (!host.active || !host.renderMarkdown || !isLivePreview(state))
      return Decoration.none;
    const path = getPath(state),
      rule = path ? resolveRule(path, host.settings) : null;
    if (!rule?.enabled) return Decoration.none;
    const widgets: Range<Decoration>[] = [];
    for (const region of regionsFor(state)) {
      if (
        region.kind !== "block" ||
        region.to <= region.from ||
        region.text.length > 200_000 ||
        !rendersMarkdownBody(rule, region.language)
      )
        continue;
      const editing = state.selection.ranges.some((r) =>
        r.empty
          ? r.from > region.from && r.from < region.to
          : r.from < region.to && r.to > region.from,
      );
      if (editing) continue;
      const anchor = Math.min(
        region.to - 1,
        Math.max(region.from + 1, region.segments[0]?.from ?? region.from),
      );
      widgets.push(
        Decoration.replace({
          block: true,
          widget: new MarkdownPreviewWidget(
            host,
            region.text,
            path,
            anchor,
            host.revision,
          ),
        }).range(region.from, region.to),
      );
    }
    return Decoration.set(widgets, true);
  };
  const markdownPreviews = StateField.define<DecorationSet>({
    create: previewsFor,
    update(value, transaction) {
      if (
        transaction.docChanged ||
        transaction.selection ||
        transaction.reconfigured ||
        getPath(transaction.startState) !== getPath(transaction.state) ||
        isLivePreview(transaction.startState) !==
          isLivePreview(transaction.state) ||
        transaction.effects.some((e) => e.is(refresh))
      )
        return previewsFor(transaction.state);
      return value;
    },
    provide: (field) => EditorView.decorations.from(field),
  });
  return [
    markdownPreviews,
    ViewPlugin.fromClass(
      class {
        decorations: DecorationSet = Decoration.none;
        private generation = 0;
        private dead = false;
        private timer?: number;
        private window: Window;
        private path = "";
        private unsubscribe: () => void;
        constructor(private view: EditorView) {
          this.window = view.dom.ownerDocument.defaultView ?? window;
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
            (update.selectionSet &&
              !!host.renderMarkdown &&
              isLivePreview(update.state)) ||
            isLivePreview(update.startState) !== isLivePreview(update.state) ||
            path !== this.path ||
            update.transactions.some((t) =>
              t.effects.some((e) => e.is(refresh)),
            )
          ) {
            this.decorations = Decoration.none;
            this.schedule();
          }
        }
        private schedule() {
          this.generation++;
          this.window.clearTimeout(this.timer);
          this.timer = this.window.setTimeout(() => void this.render(), 35);
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
          const visible = this.view.visibleRanges;
          const previews = this.view.state.field(markdownPreviews);
          const selected = regionsFor(this.view.state).filter(
            (r) =>
              (r.kind === "inline" ? rule.inline : rule.blocks) &&
              visible.some((v) => r.from <= v.to && r.to >= v.from) &&
              !hasPreview(r),
          );
          function hasPreview(region: CodeRegion) {
            let found = false;
            previews.between(region.from, region.to, (from, to) => {
              if (from === region.from && to === region.to) found = true;
            });
            return found;
          }
          const theme = host.theme(this.view.dom.ownerDocument);
          try {
            const items = await Promise.all(
              selected.map(async (region) => {
                const lang = chooseLanguage(
                  region.language,
                  rule.language,
                  rule.paletteOnly,
                  rule.existingLanguage,
                );
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
              if (r.kind === "block")
                for (const viewport of visible) {
                  const start = Math.max(r.from, viewport.from),
                    end = Math.min(r.to - 1, viewport.to);
                  if (end < start) continue;
                  const first = doc.lineAt(start).number,
                    last = doc.lineAt(end).number;
                  for (let n = first; n <= last; n++) {
                    const line = doc.line(n);
                    if (
                      !lines.has(line.from) &&
                      visible.some(
                        (v) => line.from <= v.to && line.to >= v.from,
                      )
                    ) {
                      lines.add(line.from);
                      marks.push(
                        Decoration.line({
                          class:
                            "cp-code-line" +
                            (host.settings.blockBackground
                              ? " cp-background"
                              : ""),
                          attributes: {
                            style: `--cp-fg:${result.foreground};--cp-bg:${result.background}`,
                          },
                        }).range(line.from),
                      );
                    }
                  }
                }
              for (const segment of r.segments)
                for (const viewport of visible) {
                  const clipFrom = Math.max(segment.from, viewport.from),
                    clipTo = Math.min(segment.to, viewport.to);
                  if (clipTo <= clipFrom) continue;
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
                    }).range(clipFrom, clipTo),
                  );
                  const offsetFrom = segment.offset + clipFrom - segment.from,
                    offsetTo = segment.offset + clipTo - segment.from;
                  // Binary search avoids rescanning every token for quoted/indented lines.
                  let low = 0,
                    high = result.tokens.length;
                  while (low < high) {
                    const middle = (low + high) >>> 1;
                    if (result.tokens[middle].to <= offsetFrom)
                      low = middle + 1;
                    else high = middle;
                  }
                  for (
                    let index = low;
                    index < result.tokens.length &&
                    result.tokens[index].from < offsetTo;
                    index++
                  ) {
                    const t = result.tokens[index];
                    const a = Math.max(t.from, offsetFrom),
                      b = Math.min(t.to, offsetTo);
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
                            attributes: {
                              style: tokenStyle(t.color, t.fontStyle),
                            },
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
          this.window.clearTimeout(this.timer);
          this.unsubscribe();
        }
      },
      { decorations: (value) => value.decorations },
    ),
  ] as const;
}

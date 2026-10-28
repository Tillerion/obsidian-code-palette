import type { Range, Text } from "@codemirror/state";
import { Decoration, type DecorationSet } from "@codemirror/view";
import type { CodeRegion } from "./markdown";
import type { HighlightResult } from "./highlighter";
import type { Settings } from "./rules";
import { tokenStyle } from "./rendering";
export type PaintItem = { region: CodeRegion; result: HighlightResult | null };
export function paintEditor(
  items: PaintItem[],
  doc: Text,
  visible: readonly { from: number; to: number }[],
  settings: Settings,
  langFor: (r: CodeRegion) => string | null,
): DecorationSet {
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
            visible.some((v) => line.from <= v.to && line.to >= v.from)
          ) {
            lines.add(line.from);
            marks.push(
              Decoration.line({
                class:
                  "cp-code-line" +
                  (settings.blockBackground ? " cp-background" : ""),
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
          r.kind === "inline" && settings.inlineBackground === "theme";
        marks.push(
          Decoration.mark({
            class:
              r.kind === "inline"
                ? "cp-editor-inline" + (background ? " cp-background" : "")
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
          if (result.tokens[middle].to <= offsetFrom) low = middle + 1;
          else high = middle;
        }
        for (
          let index = low;
          index < result.tokens.length && result.tokens[index].from < offsetTo;
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
                  cpLanguage: langFor(r),
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

  return Decoration.set(marks, true);
}

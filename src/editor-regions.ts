import type { EditorState, Text, ChangeDesc } from "@codemirror/state";
import { TreeFragment } from "@lezer/common";
import { parseCodeRegions } from "./markdown";
const cache = new WeakMap<Text, ReturnType<typeof parseCodeRegions>>();
export function codeRegions(
  state: EditorState,
  previous?: EditorState,
  changes?: ChangeDesc,
) {
  let parsed = cache.get(state.doc);
  if (!parsed) {
    const old = previous && cache.get(previous.doc);
    let fragments: readonly TreeFragment[] = [];
    if (old && changes) {
      const ranges: {
        fromA: number;
        toA: number;
        fromB: number;
        toB: number;
      }[] = [];
      changes.iterChangedRanges((fromA, toA, fromB, toB) =>
        ranges.push({ fromA, toA, fromB, toB }),
      );
      const headerChanged =
        ranges.some((c) => old.frontmatter > 0 && c.fromA <= old.frontmatter) ||
        (previous!.doc.line(1).text !== state.doc.line(1).text &&
          /^\uFEFF?---\r?$/.test(state.doc.line(1).text));
      if (!headerChanged)
        fragments = TreeFragment.applyChanges(
          TreeFragment.addTree(old.tree),
          ranges,
        );
    }
    parsed = parseCodeRegions(state.doc.toString(), fragments);
    cache.set(state.doc, parsed);
  }
  return parsed.regions;
}

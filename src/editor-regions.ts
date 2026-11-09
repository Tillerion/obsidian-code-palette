import type { EditorState, Text, ChangeDesc } from "@codemirror/state";
import { TreeFragment } from "@lezer/common";
import { parseCodeRegions } from "./markdown";
import { proseRegions, type ProseOptions } from "./prose";
const cache = new WeakMap<Text, ReturnType<typeof parseCodeRegions>>();
const proseCache = new WeakMap<
  Text,
  Map<string, ReturnType<typeof proseRegions>>
>();
export function editorProseRegions(
  state: EditorState,
  language: string,
  options: ProseOptions,
) {
  codeRegions(state);
  const parsed = cache.get(state.doc)!;
  let entries = proseCache.get(state.doc);
  if (!entries) proseCache.set(state.doc, (entries = new Map()));
  const key = language + +options.lines + +options.inline;
  let regions = entries.get(key);
  if (!regions) {
    regions = proseRegions(parsed.source, parsed, language, options);
    if (entries.size >= 8) entries.delete(entries.keys().next().value!);
    entries.set(key, regions);
  }
  return regions;
}
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

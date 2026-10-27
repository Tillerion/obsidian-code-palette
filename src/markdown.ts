import { parser, GFM } from "@lezer/markdown";
const markdownParser = parser.configure(GFM);
export interface CodeSegment {
  from: number;
  to: number;
  offset: number;
}
export interface CodeRegion {
  kind: "inline" | "block";
  from: number;
  to: number;
  language: string;
  text: string;
  segments: CodeSegment[];
}
export function findCodeRegions(source: string): CodeRegion[] {
  const regions: CodeRegion[] = [];
  const frontmatter =
    /^(?:\uFEFF)?---\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)(?:\r?\n|$)/.exec(
      source,
    )?.[0].length ?? 0;
  markdownParser.parse(source).iterate({
    enter(node) {
      if (node.to <= frontmatter) return false;
      if (node.name === "InlineCode") {
        const first = node.node.firstChild,
          last = node.node.lastChild;
        if (first && last && first !== last) {
          const from = first.to,
            to = last.from;
          regions.push({
            kind: "inline",
            from: node.from,
            to: node.to,
            language: "",
            text: source.slice(from, to),
            segments: [{ from, to, offset: 0 }],
          });
        }
        return false;
      }
      if (node.name === "FencedCode" || node.name === "CodeBlock") {
        let text = "",
          language = "";
        const segments: CodeSegment[] = [];
        for (
          let child = node.node.firstChild;
          child;
          child = child.nextSibling
        ) {
          if (child.name === "CodeInfo")
            language = source.slice(child.from, child.to);
          if (child.name === "CodeText") {
            segments.push({
              from: child.from,
              to: child.to,
              offset: text.length,
            });
            text += source.slice(child.from, child.to);
          }
        }
        // Lezer excludes the final LF before a closing fence, but retains its CR.
        if (text.endsWith("\r") && segments.length) {
          text = text.slice(0, -1);
          segments[segments.length - 1].to--;
        }
        regions.push({
          kind: "block",
          from: node.from,
          to: node.to,
          language,
          text,
          segments,
        });
        return false;
      }
    },
  });
  return regions;
}

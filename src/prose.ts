import type { CodeRegion, parseCodeRegions } from "./markdown";
import { canonicalLanguage } from "./catalog";
export interface ProseOptions {
  lines: boolean;
  inline: boolean;
}
export interface ProseRange {
  from: number;
  to: number;
}

// These are recognition hints, not parsers or language guessing. A profile is
// used only after the user explicitly chooses its language for this scope.
const profiles: Record<string, RegExp> = {
  python:
    /^(?:(?:async\s+)?(?:def|class)\s+\w+|(?:if|elif|for|while|with|except)\s+.+:|(?:else|try|finally)\s*:|(?:from\s+[\w.]+\s+import|import)\s+\w|(?:return|yield|raise|assert|del)\s+\S)/,
  c: /^(?:#\s*(?:include|define|ifn?def)\b|(?:const\s+)?(?:void|int|char|float|double|long|short|unsigned|struct)\s+[*\w])/,
  cpp: /^(?:#\s*(?:include|define)\b|(?:std::|using\s+namespace\s+|template\s*<)|(?:class|struct|auto|int|void|const|bool|double)\s+[*\w])/,
  java: /^(?:(?:(?:public|private|protected|static|final|abstract)\s+)+(?:class\s+|[\w<>\[\]]+\s+)|(?:class|interface|package|import|int|String|boolean|double)\s+\w)/,
  csharp:
    /^(?:(?:(?:public|private|protected|static|readonly|async)\s+)+\w|(?:using|namespace|class|interface|var|int|string|bool)\s+\w)/,
  javascript:
    /^(?:(?:export\s+)?(?:const|let|var|function|class|import)\s+\w|(?:async\s+function|return|throw)\s+\S)/,
  typescript:
    /^(?:(?:export\s+)?(?:const|let|var|function|class|import|interface|type|enum)\s+\w|(?:return|throw)\s+\S)/,
  go: /^(?:(?:package|import|func|type|var|const)\s+\S|\w+\s*:=\s*\S)/,
  rust: /^(?:(?:pub\s+)?(?:fn|struct|enum|impl|use|mod|let|const|trait)\s+\S|(?:println|print|vec)!\s*\()/,
  kotlin: /^(?:(?:data\s+)?(?:fun|val|var|class|object|package|import)\s+\S)/,
  swift: /^(?:(?:func|let|var|class|struct|enum|import|guard)\s+\S)/,
  php: /^(?:<\?php|\$\w+\s*(?:=|\[|->)|(?:echo|function|class|namespace|use)\s+\S)/,
  ruby: /^(?:(?:def|class|module|require|puts|attr_accessor)\s+\S|(?:\w+\.)?\w+\s+do\b)/,
  sql: /^(?:SELECT\s+(?!is\b|means\b)\S|INSERT\s+INTO\s+\S|UPDATE\s+\w+\s+SET\b|DELETE\s+FROM\s+\S|(?:CREATE|ALTER|DROP)\s+(?:TABLE|VIEW|INDEX|DATABASE)\s+\S|WITH\s+\w+\s+AS\s*\()/i,
  bash: /^(?:(?:echo|printf|export|source|sudo|cd|mkdir|chmod|grep|sed|awk|cat|ls|curl|pip|npm|git)\s+\S|#!\s*\/|(?:if|for|while)\s+.+(?:;|\bthen\b|\bdo\b))/,
  powershell:
    /^(?:\$[\w:]+\s*=|(?:Get|Set|New|Remove|Write|Select|ForEach|Test|Invoke|Import|Export)-[A-Za-z]+\b)/i,
  bat: /^(?:@?echo\s+|@?(?:set|call|goto|mkdir|copy|del)\s+\S|@?for\s+%|@?if\s+(?:exist|defined)\s+)/i,
  html: /^<\/?[A-Za-z][\w:-]*(?:\s[^<>]*|\s*\/?)>/,
  xml: /^<(?:\?xml\b|\/?[A-Za-z][\w:.-]*(?:\s[^<>]*|\s*\/?)>)/,
  css: /^(?:[.#][\w-]+[^{}]*\{|[\w-]+\s*:\s*[^;{}]+;|@(?:media|import|supports|keyframes)\b|[a-z][\w >:+.#-]*\s*\{)/i,
  json: /^(?:[\[{]\s*["\]}\[{]|"(?:[^"\\]|\\.)+"\s*:\s*\S)/,
  yaml: /^(?:[\w.-]+:\s+\S|-\s+[\w.-]+:\s*\S)/,
  toml: /^(?:[\w.-]+\s*=\s*(?:["'\[\{]|true\b|false\b|\d)|\[\[?[\w.-]+\]\]?)/,
  markdown:
    /^(?:#{1,6}\s+\S|[-*+]\s+\S|>\s+\S|\*\*\S.*\*\*|__\S.*__|\*\S.*\*|_\S.*_)/,
};
const callLanguages = new Set([
  "python",
  "c",
  "cpp",
  "java",
  "csharp",
  "javascript",
  "typescript",
  "go",
  "rust",
  "kotlin",
  "swift",
  "php",
  "ruby",
]);

// Replace string contents without changing UTF-16 positions. Chinese characters
// inside a string are code; outside strings they usually delimit the question.
function outsideStrings(text: string) {
  let quote = "",
    escape = false,
    out = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      out += " ";
      if (escape) escape = false;
      else if (c === "\\") escape = true;
      else if (c === quote) quote = "";
    } else if (c === '"' || c === "'" || c === "`") {
      quote = c;
      out += " ";
    } else out += c;
  }
  return out;
}
function calls(text: string): ProseRange[] {
  const found: ProseRange[] = [];
  const re = /[$A-Za-z_][\w$]*(?:(?:\.|::|->)[A-Za-z_]\w*)*\s*\(/g;
  for (const match of text.matchAll(re)) {
    if (found.length && found[found.length - 1].to > match.index!) continue;
    let depth = 0,
      quote = "",
      escape = false;
    for (
      let i = match.index! + match[0].length - 1;
      i < Math.min(text.length, match.index! + 4096);
      i++
    ) {
      const c = text[i];
      if (quote) {
        if (escape) escape = false;
        else if (c === "\\") escape = true;
        else if (c === quote) quote = "";
      } else if (c === '"' || c === "'" || c === "`") quote = c;
      else if (c === "(") depth++;
      else if (c === ")" && --depth === 0) {
        found.push({ from: match.index!, to: i + 1 });
        break;
      } else if (/[\u3400-\u9fff，。！？；]/.test(c)) break;
    }
  }
  return found;
}
function strong(text: string, lang: string) {
  if (!text) return false;
  if (
    ["html", "xml", "markdown", "yaml"].includes(lang) &&
    profiles[lang]?.test(text)
  )
    return true;
  const outside = codeOutside(text, lang);
  if (/https?:\/\/|www\./i.test(outside)) return false;
  if (/[\u3400-\u9fff，。！？]/.test(outside)) return false;
  if (profiles[lang]?.test(text)) return true;
  if (!callLanguages.has(lang)) return false;
  if (
    /^[$A-Za-z_]\w*(?:\[[^\]\n]+\]|\.[A-Za-z_]\w*)*\s*(?:[+*/%-]?=|:=)\s*\S/.test(
      text,
    )
  )
    return true;
  if (/^(?:if|for|while|switch|catch)\s*\(.+\)\s*\{?/.test(text)) return true;
  const matches = calls(text);
  return (
    matches.length === 1 &&
    matches[0].from === 0 &&
    /^[;\s]*$/.test(text.slice(matches[0].to))
  );
}
function codeOutside(text: string, lang: string) {
  const masked = outsideStrings(text);
  const comment = /^(?:python|ruby|bash|powershell|yaml|toml)$/.test(lang)
    ? /#/
    : lang === "sql"
      ? /--/
      : /^(?:c|cpp|java|csharp|javascript|typescript|go|rust|kotlin|swift|php)$/.test(
            lang,
          )
        ? /\/\/|\/\*/
        : null;
  const index = comment ? masked.search(comment) : -1;
  return index < 0 ? masked : masked.slice(0, index);
}
const cache = new Map<string, ProseRange[]>();
let cacheChars = 0;
export function detectProse(
  text: string,
  language: string,
  options: ProseOptions,
): ProseRange[] {
  const lang = canonicalLanguage(language);
  if (
    !lang ||
    !profiles[lang] ||
    (!options.lines && !options.inline) ||
    text.length > 200_000
  )
    return [];
  const key = lang + "\0" + +options.lines + +options.inline + "\0" + text;
  const cached = cache.get(key);
  if (cached) return cached.map((r) => ({ ...r }));
  const found: ProseRange[] = [];
  let offset = 0,
    previousEnd = -1,
    depth = 0;
  const inputLines = text.split("\n");
  for (let lineIndex = 0; lineIndex < inputLines.length; lineIndex++) {
    const raw = inputLines[lineIndex];
    const prefix = raw.match(/^\s*(?:[A-D][.)、]\s*)?/)![0].length;
    const body = raw.slice(prefix).trimEnd();
    const from = offset + prefix,
      to = from + body.length;
    const exterior = codeOutside(body, lang);
    const continuation =
      previousEnd >= 0 &&
      previousEnd === offset - 1 &&
      !/[\u3400-\u9fff，。！？]/.test(exterior) &&
      (depth > 0 ||
        (lang === "sql" &&
          (/^(?:FROM|WHERE|(?:LEFT|RIGHT|INNER|OUTER)?\s*JOIN|ON|GROUP\s+BY|ORDER\s+BY|HAVING|LIMIT|AND|OR|UNION)\s+\S/i.test(
            body,
          ) ||
            /^(?:[\w.*"`\[\]]+(?:\s+AS\s+\w+)?\s*,\s*)*[\w.*"`\[\]]+(?:\s+AS\s+\w+)?\s*,?$/i.test(
              body,
            ))) ||
        /^[\])};,]+;?$/.test(body) ||
        (/^\s+/.test(raw) &&
          /^(?:return\b|end\b|else\b|\w+\s*[,\])]|(?:#|\/\/).+)/.test(body)));
    const sqlHead =
      lang === "sql" &&
      /^SELECT\s*$/i.test(body) &&
      inputLines
        .slice(lineIndex + 1, lineIndex + 21)
        .some((line) => /^\s*FROM\s+\S/i.test(line));
    if (options.lines && (strong(body, lang) || continuation || sqlHead)) {
      if (previousEnd === offset - 1 && found.length)
        found[found.length - 1].to = to;
      else found.push({ from, to });
      previousEnd = to;
      for (const c of exterior) {
        if ("([{".includes(c)) depth++;
        else if (")]}".includes(c)) depth = Math.max(0, depth - 1);
      }
    } else {
      previousEnd = -1;
      depth = 0;
      if (
        options.inline &&
        body &&
        !/https?:\/\/|www\./i.test(outsideStrings(body))
      ) {
        const outside = outsideStrings(body);
        const boundaries = [
          ...outside.matchAll(/[\u3400-\u9fff，。！？；：]/g),
        ].map((m) => m.index!);
        let start = 0;
        for (const end of [...boundaries, body.length]) {
          const island = body.slice(start, end),
            trim = island.trim();
          const at = from + start + island.indexOf(trim);
          if (trim && strong(trim, lang))
            found.push({ from: at, to: at + trim.length });
          else if (callLanguages.has(lang))
            for (const r of calls(island))
              found.push({
                from: from + start + r.from,
                to: from + start + r.to,
              });
          start = end + 1;
        }
      }
    }
    offset += raw.length + 1;
  }
  cache.set(key, found);
  cacheChars += key.length;
  while (cache.size > 256 || cacheChars > 1_000_000) {
    const k = cache.keys().next().value!;
    cacheChars -= k.length;
    cache.delete(k);
  }
  return found.map((r) => ({ ...r }));
}

export function proseRegions(
  source: string,
  parsed: ReturnType<typeof parseCodeRegions>,
  language: string,
  options: ProseOptions,
): CodeRegion[] {
  if (!options.lines && !options.inline) return [];
  const regions: CodeRegion[] = [];
  const lang = canonicalLanguage(language);
  function addRanges(start: number, end: number) {
    for (const r of detectProse(source.slice(start, end), language, options)) {
      const from = start + r.from,
        to = start + r.to;
      regions.push({
        kind: "inline",
        prose: true,
        from,
        to,
        language,
        text: source.slice(from, to),
        segments: [{ from, to, offset: 0 }],
      });
    }
  }
  const opaque: ProseRange[] = [{ from: 0, to: parsed.frontmatter }],
    references = new Set<string>();
  const label = (value: string) =>
    value
      .replace(/^\[|\]$/g, "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
  parsed.tree.iterate({
    enter(node) {
      if (/^(?:FencedCode|CodeBlock|InlineCode|HTMLBlock)$/.test(node.name)) {
        opaque.push({ from: node.from, to: node.to });
        return false;
      }
      if (node.name === "LinkReference") {
        const ref = node.node.getChild("LinkLabel");
        if (ref) references.add(label(source.slice(ref.from, ref.to)));
        return false;
      }
    },
  });
  let masked = "",
    cursor = 0;
  for (const r of opaque.sort((a, b) => a.from - b.from)) {
    if (r.from < cursor) continue;
    masked +=
      source.slice(cursor, r.from) +
      source.slice(r.from, r.to).replace(/[^\r\n]/g, " ");
    cursor = r.to;
  }
  masked += source.slice(cursor);
  const protectedText = [
    ...masked.matchAll(
      /\$\$[\s\S]*?(?:\$\$|$)|(?<!\\)\$(?!\$)[^\n$]+\$|!?\[\[[^\]\n]+\]\]|%%[\s\S]*?(?:%%|$)/g,
    ),
  ].map((m) => ({ from: m.index!, to: m.index! + m[0].length }));
  parsed.tree.iterate({
    enter(node) {
      if (node.to <= parsed.frontmatter) return false;
      if (node.name === "HTMLBlock" && (lang === "html" || lang === "xml")) {
        if (
          options.lines &&
          /^\s*<[A-Za-z]/.test(source.slice(node.from, node.to))
        ) {
          regions.push({
            kind: "inline",
            prose: true,
            from: node.from,
            to: node.to,
            language,
            text: source.slice(node.from, node.to),
            segments: [{ from: node.from, to: node.to, offset: 0 }],
          });
        } else addRanges(node.from, node.to);
        return false;
      }
      if (
        /^(?:FencedCode|CodeBlock|HTMLBlock|Image|InlineCode)$/.test(node.name)
      )
        return false;
      if (
        !/^(?:Paragraph|ATXHeading[1-6]|SetextHeading[12]|TableCell)$/.test(
          node.name,
        )
      )
        return;
      const protectedRanges: ProseRange[] = [
        ...protectedText.filter((r) => r.from < node.to && r.to > node.from),
      ];
      node.node.toTree().iterate({
        enter(child) {
          const actualLink =
            child.name === "Link" &&
            (child.node.getChild("URL") ||
              child.node.getChild("LinkLabel") ||
              references.has(
                label(
                  source.slice(node.from + child.from, node.from + child.to),
                ),
              ));
          const syntaxMark =
            /^(?:EmphasisMark|HeaderMark|QuoteMark)$/.test(child.name) &&
            lang !== "markdown";
          const htmlTag =
            child.name === "HTMLTag" && lang !== "html" && lang !== "xml";
          if (
            actualLink ||
            syntaxMark ||
            htmlTag ||
            /^(?:InlineCode|Image|Autolink|Escape)$/.test(child.name)
          ) {
            protectedRanges.push({
              from: node.from + child.from,
              to: node.from + child.to,
            });
            return false;
          }
        },
      });
      // Split rather than blank protected content, so a candidate cannot cross a link or formula.
      let start = node.from;
      for (const stop of [
        ...protectedRanges.sort((a, b) => a.from - b.from),
        { from: node.to, to: node.to },
      ]) {
        const end = Math.min(node.to, stop.from);
        if (end > start) addRanges(start, end);
        start = Math.max(start, stop.to);
      }
      return false;
    },
  });
  return regions;
}

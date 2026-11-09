import type { PaletteHost } from "./host";
import type { HighlightResult } from "./highlighter";
import { resolveRule } from "./rules";
import { detectProse } from "./prose";
import { canonicalLanguage } from "./catalog";
import { parseCodeRegions } from "./markdown";

const blocks = "p,li,td,th,h1,h2,h3,h4,h5,h6";
const excluded =
  'a,code,pre,script,style,textarea,button,svg,math,.math,.math-block,.math-inline,.metadata-container,.frontmatter,.internal-embed,.cp-markdown-preview,.mermaid,.dataview,.view-header,.cm-editor,[class*="block-language-"]';
const owners = new WeakMap<HTMLElement, ReadingProseController>();
interface Unit {
  text: string;
  nodes: { node: Text; from: number; to: number }[];
}
interface Record {
  key: string;
  spans: HTMLElement[];
}
function collect(block: HTMLElement, markdown = false, html = false): Unit {
  const unit: Unit = { text: "", nodes: [] };
  function visit(node: Node) {
    if (node.nodeType === 3) {
      const from = unit.text.length;
      unit.text += node.textContent ?? "";
      unit.nodes.push({ node: node as Text, from, to: unit.text.length });
    } else if (node.nodeType === 1) {
      const el = node as HTMLElement;
      if (
        el !== block &&
        (el.matches(excluded) || (!html && el.matches(blocks)))
      ) {
        unit.text += "\n";
        return;
      }
      if (el.tagName === "BR") {
        // Native MarkdownRenderer emits <br> followed by a literal newline.
        // Count that break once, while retaining every real Text node offset.
        let next = el.nextSibling;
        while (
          next?.nodeType === 1 &&
          (next as Element).classList.contains("cp-prose-token")
        )
          next = next.firstChild;
        if (next?.nodeType !== 3 || !/^\r?\n/.test(next.textContent ?? ""))
          unit.text += "\n";
        return;
      }
      let before = "",
        after = "";
      if (html && !el.classList.contains("cp-prose-token")) {
        before =
          "<" +
          el.localName +
          [...el.attributes]
            .filter((a) => ["id", "class", "href", "title"].includes(a.name))
            .map((a) => " " + a.name + '="' + a.value + '"')
            .join("") +
          ">";
        after = "</" + el.localName + ">";
      } else if (markdown) {
        if (/^H[1-6]$/.test(el.tagName))
          before = "#".repeat(Number(el.tagName[1])) + " ";
        else if (el.tagName === "STRONG" || el.tagName === "B")
          before = after = "**";
        else if (el.tagName === "EM" || el.tagName === "I")
          before = after = "*";
        else if (el.tagName === "LI") before = "- ";
      }
      unit.text += before;
      for (const child of el.childNodes) visit(child);
      unit.text += after;
    }
  }
  visit(block);
  return unit;
}
// On reload there is no postprocessor context. Match source HTML fragments to
// existing rendered elements, rather than treating the entire preview as HTML.
function htmlCandidates(root: HTMLElement, source: string): HTMLElement[] {
  const found = new Set<HTMLElement>();
  parseCodeRegions(source).tree.iterate({
    enter(node) {
      if (
        node.name === "FencedCode" ||
        node.name === "CodeBlock" ||
        node.name === "InlineCode" ||
        node.name === "Link" ||
        node.name === "Image"
      )
        return false;
      if (node.name !== "HTMLBlock" && node.name !== "HTMLTag") return;
      const raw = source.slice(
        node.from,
        node.name === "HTMLTag" ? (node.node.parent?.to ?? node.to) : node.to,
      );
      if (!/^<[A-Za-z]/.test(raw)) return false;
      // Keep resource-bearing elements inside inert template contents. Ignore
      // template syntax itself so source cannot close our parsing container.
      if (/<\/?template(?:\s|\/?>)/i.test(raw)) return false;
      const Parser = root.ownerDocument.defaultView!.DOMParser;
      const parsed = new Parser().parseFromString(
        "<template>" + raw + "</template>",
        "text/html",
      );
      const template = parsed.querySelector("template");
      if (!template) return false;
      // Never adopt parsed nodes: visible output uses textContent spans only.
      for (const original of template.content.children) {
        const tag = original.localName;
        if (
          [
            "a",
            "script",
            "style",
            "svg",
            "math",
            "button",
            "pre",
            "code",
          ].includes(tag)
        )
          continue;
        const expected = original.textContent?.trim();
        if (!expected) continue;
        const candidates = [...root.querySelectorAll<HTMLElement>(tag)];
        if (root.localName === tag) candidates.unshift(root);
        const matches = candidates.filter(
          (el) =>
            !el.closest(excluded) &&
            el.getAttribute("id") === original.getAttribute("id") &&
            el.getAttribute("class") === original.getAttribute("class") &&
            el.textContent?.trim() === expected,
        );
        // Without source-to-DOM positions, identical elements are ambiguous.
        // The next per-section postprocessor can resolve a narrower root.
        if (matches.length === 1) found.add(matches[0]);
        else if (!candidates.length && !["p", "div"].includes(tag)) {
          // Obsidian sanitizes unknown XML tags into ordinary paragraph text.
          // A unique text match can still receive color without reconstructing tags.
          const paragraphs = [...root.querySelectorAll<HTMLElement>("p")];
          if (root.tagName === "P") paragraphs.unshift(root);
          const visible = paragraphs.filter(
            (el) =>
              !el.closest(excluded) && el.textContent?.trim() === expected,
          );
          if (visible.length === 1) found.add(visible[0]);
        }
      }
      return false;
    },
  });
  return [...found].filter(
    (el) => ![...found].some((parent) => parent !== el && parent.contains(el)),
  );
}
export class ReadingProseController {
  private records = new Map<HTMLElement, Record>();
  private claims = new Set<HTMLElement>();
  private generation = 0;
  private dead = false;
  private observer: MutationObserver;
  private unsubscribe: () => void;
  private timer?: number;
  private win: Window;
  constructor(
    private root: HTMLElement,
    private path: () => string,
    private host: PaletteHost,
    private source?: () => string | undefined,
  ) {
    this.win = root.ownerDocument.defaultView ?? window;
    const Observer = root.ownerDocument.defaultView!.MutationObserver;
    this.observer = new Observer((mutations) => {
      if (
        !mutations.some((m) => {
          const el =
            m.target.nodeType === 1
              ? (m.target as Element)
              : m.target.parentElement;
          return el && !el.closest(excluded);
        })
      )
        return;
      this.win.clearTimeout(this.timer);
      this.timer = this.win.setTimeout(() => void this.refresh(), 35);
    });
    this.unsubscribe = host.subscribe(() => void this.refresh());
    void this.refresh();
  }
  private observe() {
    if (!this.dead)
      this.observer.observe(this.root, {
        subtree: true,
        childList: true,
        characterData: true,
      });
  }
  private mutate(action: () => void) {
    // Save external changes before suppressing our own wrapper mutations.
    const pending = this.observer.takeRecords();
    this.observer.disconnect();
    try {
      action();
    } finally {
      this.observe();
      if (pending.length && !this.dead) {
        this.win.clearTimeout(this.timer);
        this.timer = this.win.setTimeout(() => void this.refresh(), 35);
      }
    }
  }
  private clear(block: HTMLElement) {
    const record = this.records.get(block);
    if (record)
      for (const span of record.spans)
        if (span.parentNode) span.replaceWith(...Array.from(span.childNodes));
    this.records.delete(block);
  }
  async refresh() {
    const generation = ++this.generation;
    const path = this.path(),
      rule = resolveRule(path, this.host.settings);
    if (this.dead) return;
    if (
      !this.host.active ||
      !rule?.enabled ||
      rule.paletteOnly ||
      (!rule.proseLines && !rule.proseInline)
    ) {
      this.mutate(() => {
        for (const block of this.records.keys()) this.clear(block);
      });
      for (const block of this.claims)
        if (owners.get(block) === this) owners.delete(block);
      this.claims.clear();
      this.observer.disconnect();
      return;
    }
    this.observe();
    const lang = canonicalLanguage(rule.language),
      markdown = lang === "markdown";
    const html = lang === "html" || lang === "xml";
    let htmlSource: string | undefined;
    if (html) {
      try {
        htmlSource = this.source?.() ?? (await this.host.readSource?.(path));
      } catch (error) {
        if (!this.dead && generation === this.generation)
          this.host.reportError(error);
        return;
      }
      if (this.dead || generation !== this.generation || path !== this.path())
        return;
    }
    const htmlNodes =
      htmlSource && htmlSource.length <= 200_000
        ? htmlCandidates(this.root, htmlSource)
        : [];
    const candidates = [
      ...this.root.querySelectorAll<HTMLElement>(blocks),
      ...htmlNodes,
    ];
    if (this.root.matches(blocks)) candidates.unshift(this.root);
    const live = new Set(
      candidates.filter((block) => !block.closest(excluded)),
    );
    this.mutate(() => {
      for (const block of this.claims)
        if (!live.has(block)) {
          this.clear(block);
          if (owners.get(block) === this) owners.delete(block);
          this.claims.delete(block);
        }
    });
    const theme = this.host.theme(this.root.ownerDocument);
    await Promise.all(
      [...live].map(async (block) => {
        if (owners.has(block) && owners.get(block) !== this) return;
        for (
          let ancestor = block.parentElement;
          ancestor;
          ancestor = ancestor.parentElement
        )
          if (owners.has(ancestor) && owners.get(ancestor) !== this) return;
        if (
          [...block.querySelectorAll<HTMLElement>(blocks)].some(
            (child) => owners.has(child) && owners.get(child) !== this,
          )
        )
          return;
        const serializeHTML = htmlNodes.includes(block);
        const unit = collect(block, markdown, serializeHTML);
        const key =
          rule.language +
          "\0" +
          theme +
          "\0" +
          +!!rule.proseLines +
          +!!rule.proseInline +
          "\0" +
          unit.text;
        const existing = this.records.get(block);
        if (
          existing?.key === key &&
          existing.spans.every(
            (span) =>
              block.contains(span) && span.classList.contains("cp-prose-token"),
          )
        )
          return;
        const ranges = serializeHTML
          ? [{ from: 0, to: unit.text.length }]
          : detectProse(unit.text, rule.language, {
              lines: !!rule.proseLines,
              inline: !!rule.proseInline,
            });
        if (!ranges.length) {
          this.mutate(() => this.clear(block));
          if (owners.get(block) === this) owners.delete(block);
          this.claims.delete(block);
          return;
        }
        owners.set(block, this);
        this.claims.add(block);
        try {
          const results = await Promise.all(
            ranges.map(async (range) => ({
              range,
              result: await this.host.highlighter.highlight(
                unit.text.slice(range.from, range.to),
                rule.language,
                theme,
              ),
            })),
          );
          if (
            this.dead ||
            generation !== this.generation ||
            path !== this.path() ||
            owners.get(block) !== this ||
            collect(block, markdown, serializeHTML).text !== unit.text
          )
            return;
          this.mutate(() => {
            this.clear(block);
            const current = collect(block, markdown, serializeHTML),
              spans: HTMLElement[] = [];
            const tokens = results.flatMap(
              ({ range, result }) =>
                result?.tokens.map((token) => ({
                  ...token,
                  from: token.from + range.from,
                  to: token.to + range.from,
                })) ?? [],
            );
            const combined: HighlightResult = {
              tokens,
              foreground: "",
              background: "",
            };
            for (const entry of current.nodes) {
              const marks: { from: number; to: number; color: string }[] = [];
              this.marks(
                entry,
                { from: 0, to: current.text.length },
                combined,
                marks,
              );
              if (!marks.length || !entry.node.parentNode) continue;
              const frag = block.ownerDocument.createDocumentFragment(),
                text = entry.node.data;
              let at = 0;
              for (const mark of marks.sort((a, b) => a.from - b.from)) {
                if (mark.from > at)
                  frag.append(
                    block.ownerDocument.createTextNode(
                      text.slice(at, mark.from),
                    ),
                  );
                const span = block.ownerDocument.createElement("span");
                span.className = "cp-prose-token";
                span.style.setProperty("color", mark.color, "important");
                span.textContent = text.slice(mark.from, mark.to);
                frag.append(span);
                spans.push(span);
                at = mark.to;
              }
              if (at < text.length)
                frag.append(block.ownerDocument.createTextNode(text.slice(at)));
              entry.node.replaceWith(frag);
            }
            this.records.set(block, { key, spans });
          });
        } catch (e) {
          if (!this.dead && generation === this.generation)
            this.host.reportError(e);
        }
      }),
    );
  }
  private marks(
    entry: Unit["nodes"][number],
    range: { from: number; to: number },
    result: HighlightResult,
    marks: { from: number; to: number; color: string }[],
  ) {
    const start = entry.from - range.from,
      end = entry.to - range.from;
    if (end <= 0 || start >= range.to - range.from) return;
    let low = 0,
      high = result.tokens.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (result.tokens[middle].to <= start) low = middle + 1;
      else high = middle;
    }
    for (
      let i = low;
      i < result.tokens.length && result.tokens[i].from < end;
      i++
    ) {
      const token = result.tokens[i];
      const from = Math.max(entry.from, range.from + token.from),
        to = Math.min(entry.to, range.from + token.to);
      if (to > from)
        marks.push({
          from: from - entry.from,
          to: to - entry.from,
          color: token.color,
        });
    }
  }
  dispose() {
    if (this.dead) return;
    this.dead = true;
    this.generation++;
    this.win.clearTimeout(this.timer);
    this.unsubscribe();
    this.observer.disconnect();
    for (const block of this.records.keys()) this.clear(block);
    for (const block of this.claims)
      if (owners.get(block) === this) owners.delete(block);
    this.claims.clear();
  }
}

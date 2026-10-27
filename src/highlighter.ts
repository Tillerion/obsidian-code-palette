import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";
import { canonicalLanguage, languages, themes } from "./catalog";
export interface ColoredToken {
  from: number;
  to: number;
  text: string;
  color: string;
  fontStyle: number;
}
export interface HighlightResult {
  tokens: ColoredToken[];
  foreground: string;
  background: string;
}
export class Highlighter {
  private engine?: Promise<HighlighterCore>;
  private disposed = false;
  private loads = new Map<string, Promise<void>>();
  private cache = new Map<string, HighlightResult>();
  private cachedChars = 0;
  private getEngine(): Promise<HighlighterCore> {
    return (this.engine ??= createHighlighterCore({
      langs: [],
      themes: [],
      engine: createOnigurumaEngine(import("shiki/wasm")),
    }));
  }
  private async load(
    key: string,
    action: (h: HighlighterCore) => Promise<void>,
  ) {
    let job = this.loads.get(key);
    if (!job) {
      job = this.getEngine().then(async (h) => {
        if (!this.disposed) await action(h);
      });
      this.loads.set(key, job);
      job.catch(() => this.loads.delete(key));
    }
    await job;
  }
  async highlight(
    code: string,
    lang: string,
    theme: string,
  ): Promise<HighlightResult | null> {
    const canonical = canonicalLanguage(lang),
      palette = themes.find((t) => t.id === theme);
    if (this.disposed || !canonical || !palette || code.length > 200000)
      return null;
    const key = `${canonical}\0${theme}\0${code}`;
    const cached = this.cache.get(key);
    if (cached) {
      this.cache.delete(key);
      this.cache.set(key, cached);
      return cached;
    }
    const grammar = languages.find((l) => l.id === canonical);
    await Promise.all([
      this.load("theme:" + theme, async (h) =>
        h.loadTheme((await palette.load()).default),
      ),
      grammar
        ? this.load("lang:" + canonical, async (h) =>
            h.loadLanguage((await grammar.load()).default),
          )
        : Promise.resolve(),
    ]);
    if (this.disposed) return null;
    const h = await this.getEngine();
    if (this.disposed) return null;
    const r = h.codeToTokens(code, { lang: canonical, theme });
    const foreground = r.fg ?? "#cccccc",
      background = r.bg ?? "#202020";
    const tokens: ColoredToken[] = [];
    let cursor = 0;
    for (const line of r.tokens)
      for (const t of line) {
        if (t.offset > cursor)
          tokens.push({
            from: cursor,
            to: t.offset,
            text: code.slice(cursor, t.offset),
            color: foreground,
            fontStyle: 0,
          });
        const from = t.offset,
          to = from + t.content.length;
        if (to > from)
          tokens.push({
            from,
            to,
            text: code.slice(from, to),
            color: t.color ?? foreground,
            fontStyle: t.fontStyle ?? 0,
          });
        cursor = to;
      }
    if (cursor < code.length)
      tokens.push({
        from: cursor,
        to: code.length,
        text: code.slice(cursor),
        color: foreground,
        fontStyle: 0,
      });
    const result = { tokens, foreground, background };
    this.cache.set(key, result);
    this.cachedChars += key.length;
    while (this.cache.size > 128 || this.cachedChars > 2000000) {
      const first = this.cache.keys().next().value;
      if (first === undefined) break;
      this.cache.delete(first);
      this.cachedChars -= first.length;
    }
    return result;
  }
  dispose() {
    this.disposed = true;
    this.cache.clear();
    this.cachedChars = 0;
    void this.engine?.then((h) => h.dispose()).catch(() => {});
  }
}

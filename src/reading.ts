import type { PaletteHost, MarkdownRenderHandle } from "./host";
import { chooseLanguage, resolveRule, rendersMarkdownBody } from "./rules";
import {
  applyCode,
  restoreCode,
  isCodePaintIntact,
  type CodeRecord,
} from "./rendering";
const owners = new WeakMap<HTMLElement, ReadingController>();
export function readingRoot(el: HTMLElement): HTMLElement {
  return el.tagName === "PRE" || el.tagName === "CODE"
    ? (el.closest("pre")?.parentElement ?? el)
    : el;
}
interface MarkdownRecord {
  code: HTMLElement;
  pre: HTMLElement;
  preview: HTMLElement;
  handle: MarkdownRenderHandle;
}

export class ReadingController {
  private records: CodeRecord[] = [];
  private markdownRecords: MarkdownRecord[] = [];
  private generation = 0;
  private disposed = false;
  private unsubscribe: () => void;
  private observer?: MutationObserver;
  private timer?: number;
  private window: Window;
  constructor(
    private root: HTMLElement,
    private path: string | (() => string),
    private host: PaletteHost,
  ) {
    this.root = root = readingRoot(root);
    this.window = root.ownerDocument.defaultView ?? window;
    const Observer = root.ownerDocument.defaultView?.MutationObserver;
    if (Observer) {
      this.observer = new Observer((mutations) => this.onMutations(mutations));
      this.observe();
    }
    this.unsubscribe = host.subscribe(() => void this.refresh());
    void this.refresh();
  }
  renamePath(oldPath: string, newPath: string) {
    if (typeof this.path === "function") return;
    if (this.path === oldPath || this.path.startsWith(oldPath + "/"))
      this.path = newPath + this.path.slice(oldPath.length);
  }
  async refresh() {
    this.window.clearTimeout(this.timer);
    this.timer = undefined;
    const generation = ++this.generation;
    this.release();
    if (this.disposed || !this.host.active) return;
    const path = this.getPath();
    const rule = resolveRule(path, this.host.settings);
    if (!rule?.enabled) return;
    const theme = this.host.theme(this.root.ownerDocument);
    const codes = Array.from(this.root.querySelectorAll<HTMLElement>("code"));
    if (this.root.tagName === "CODE") codes.unshift(this.root);
    await Promise.all(
      codes.map(async (code) => {
        if (owners.has(code)) return;
        if (code.closest(".cp-markdown-preview")) return;
        // An enclosing note's postprocessor must not take over its embedded notes.
        const embed = code.closest(".internal-embed");
        if (embed && this.root.contains(embed) && embed !== this.root) return;
        if (
          code.closest(
            ".mermaid, .block-language-dataview, .block-language-dataviewjs, .block-language-tasks",
          )
        )
          return;
        const block = code.parentElement?.tagName === "PRE";
        if (block ? !rule.blocks : !rule.inline) return;
        const explicit = block
          ? ([...code.classList, ...(code.parentElement?.classList ?? [])]
              .find((c) => c.startsWith("language-"))
              ?.slice(9) ?? "")
          : "";
        const lang = chooseLanguage(
          explicit,
          rule.language,
          rule.paletteOnly,
          rule.existingLanguage,
        );
        if (!lang) return;
        const text = code.textContent ?? "";
        if (
          block &&
          !!code.parentElement?.parentNode &&
          text.length <= 200_000 &&
          rendersMarkdownBody(rule, explicit) &&
          this.host.renderMarkdown
        ) {
          let record: MarkdownRecord | undefined;
          try {
            const preview = code.ownerDocument
              .createDocumentFragment()
              .createEl("div", {
                cls: "cp-markdown-preview markdown-rendered",
                attr: {
                  "data-language": "markdown",
                  "aria-label": "Markdown 正文预览",
                },
              });
            const handle = this.host.renderMarkdown(text, preview, path);
            record = { code, pre: code.parentElement!, preview, handle };
            this.markdownRecords.push(record);
            owners.set(code, this);
            this.withoutObservation(() => record!.pre.replaceWith(preview));
            await handle.ready;
            return;
          } catch (error) {
            if (record)
              this.withoutObservation(() => this.restoreMarkdown(record!));
            if (this.disposed || generation !== this.generation) return;
            this.host.reportError(error);
            // Preserve an editable code block if native Markdown rendering fails.
          }
        }
        try {
          const result = await this.host.highlighter.highlight(
            text,
            lang,
            theme,
          );
          if (
            !result ||
            this.disposed ||
            !this.host.active ||
            generation !== this.generation ||
            this.getPath() !== path ||
            owners.has(code) ||
            code.textContent !== text
          )
            return;
          const record = this.withoutObservation(() =>
            applyCode(
              code,
              result,
              block
                ? this.host.settings.blockBackground
                : this.host.settings.inlineBackground === "theme",
            ),
          );
          owners.set(code, this);
          this.records.push(record);
        } catch (error) {
          this.host.reportError(error);
        }
      }),
    );
  }
  dispose() {
    this.disposed = true;
    this.generation++;
    this.unsubscribe();
    this.window.clearTimeout(this.timer);
    this.observer?.disconnect();
    this.release();
  }
  private getPath() {
    return typeof this.path === "function" ? this.path() : this.path;
  }
  private release() {
    this.withoutObservation(() => {
      for (const record of [...this.markdownRecords])
        this.restoreMarkdown(record);
      for (const record of this.records) {
        if (owners.get(record.el) === this) {
          owners.delete(record.el);
          restoreCode(record);
        }
      }
      this.records = [];
    });
  }
  private restoreMarkdown(record: MarkdownRecord) {
    const index = this.markdownRecords.indexOf(record);
    if (index < 0) return;
    this.markdownRecords.splice(index, 1);
    record.handle.dispose();
    if (owners.get(record.code) === this) {
      owners.delete(record.code);
      if (record.preview.parentNode) record.preview.replaceWith(record.pre);
    }
  }
  private observe() {
    if (!this.disposed)
      this.observer?.observe(this.root, {
        subtree: true,
        childList: true,
        characterData: true,
      });
  }
  private withoutObservation<T>(action: () => T): T {
    const pending = this.observer?.takeRecords() ?? [];
    this.observer?.disconnect();
    try {
      return action();
    } finally {
      this.observe();
      if (pending.length) this.onMutations(pending);
    }
  }
  private onMutations(mutations: MutationRecord[]) {
    if (this.disposed || !this.host.active) return;
    const candidates = new Set<HTMLElement>();
    for (const mutation of mutations) {
      const target =
        mutation.target.nodeType === 1
          ? (mutation.target as Element)
          : mutation.target.parentElement;
      if (target?.closest(".cp-markdown-preview")) continue;
      const code = target?.closest<HTMLElement>("code");
      if (code) candidates.add(code);
      for (const node of mutation.addedNodes)
        if (node.nodeType === 1) {
          const element = node as HTMLElement;
          if (element.closest(".cp-markdown-preview")) continue;
          if (element.tagName === "CODE") candidates.add(element);
          for (const child of element.querySelectorAll<HTMLElement>("code"))
            candidates.add(child);
        }
    }
    const changed =
      [...candidates].some((code) => {
        const owner = owners.get(code);
        if (owner && owner !== this) return false;
        const record = this.records.find((r) => r.el === code);
        return !record || !isCodePaintIntact(record);
      }) ||
      this.records.some((r) => !this.root.contains(r.el)) ||
      this.markdownRecords.some((r) => !this.root.contains(r.preview));
    if (changed && this.timer === undefined)
      this.timer = this.window.setTimeout(() => void this.refresh(), 0);
  }
}

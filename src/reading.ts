import type { PaletteHost } from "./host";
import { chooseLanguage, resolveRule } from "./rules";
import {
  applyCode,
  restoreCode,
  isCodePaintIntact,
  type CodeRecord,
} from "./rendering";
const owners = new WeakMap<HTMLElement, ReadingController>();

export class ReadingController {
  private records: CodeRecord[] = [];
  private generation = 0;
  private disposed = false;
  private unsubscribe: () => void;
  private observer?: MutationObserver;
  private timer?: ReturnType<typeof setTimeout>;
  constructor(
    private root: HTMLElement,
    private path: string | (() => string),
    private host: PaletteHost,
  ) {
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
    clearTimeout(this.timer);
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
        const lang = chooseLanguage(explicit, rule.language);
        if (!lang) return;
        const text = code.textContent ?? "";
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
    clearTimeout(this.timer);
    this.observer?.disconnect();
    this.release();
  }
  private getPath() {
    return typeof this.path === "function" ? this.path() : this.path;
  }
  private release() {
    this.withoutObservation(() => {
      for (const record of this.records) {
        if (owners.get(record.el) === this) {
          owners.delete(record.el);
          restoreCode(record);
        }
      }
      this.records = [];
    });
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
      const code = target?.closest<HTMLElement>("code");
      if (code) candidates.add(code);
      for (const node of mutation.addedNodes)
        if (node.nodeType === 1) {
          const element = node as HTMLElement;
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
      }) || this.records.some((r) => !this.root.contains(r.el));
    if (changed && this.timer === undefined)
      this.timer = setTimeout(() => void this.refresh(), 0);
  }
}

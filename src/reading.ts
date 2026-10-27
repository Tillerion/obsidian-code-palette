import type { PaletteHost } from "./host";
import { chooseLanguage, resolveRule } from "./rules";
import { applyCode, restoreCode, type CodeRecord } from "./rendering";

export class ReadingController {
  private records: CodeRecord[] = [];
  private generation = 0;
  private disposed = false;
  private unsubscribe: () => void;
  constructor(
    private root: HTMLElement,
    private path: string,
    private host: PaletteHost,
  ) {
    this.unsubscribe = host.subscribe(() => void this.refresh());
    void this.refresh();
  }
  renamePath(oldPath: string, newPath: string) {
    if (this.path === oldPath || this.path.startsWith(oldPath + "/"))
      this.path = newPath + this.path.slice(oldPath.length);
  }
  async refresh() {
    const generation = ++this.generation;
    for (const r of this.records) restoreCode(r);
    this.records = [];
    if (this.disposed || !this.host.active) return;
    const rule = resolveRule(this.path, this.host.settings);
    if (!rule?.enabled) return;
    const theme = this.host.theme(this.root.ownerDocument);
    const codes = Array.from(this.root.querySelectorAll<HTMLElement>("code"));
    if (this.root.tagName === "CODE") codes.unshift(this.root);
    await Promise.all(
      codes.map(async (code) => {
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
            code.textContent !== text
          )
            return;
          this.records.push(
            applyCode(
              code,
              result,
              block
                ? this.host.settings.blockBackground
                : this.host.settings.inlineBackground === "theme",
            ),
          );
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
    for (const r of this.records) restoreCode(r);
    this.records = [];
  }
}

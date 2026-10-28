import {
  Facet,
  StateEffect,
  StateField,
  type EditorState,
  type Transaction,
} from "@codemirror/state";
import {
  Decoration,
  EditorView,
  WidgetType,
  type DecorationSet,
} from "@codemirror/view";
import type { PaletteHost } from "./host";
import { codeRegions } from "./editor-regions";
import { resolveRule, rendersMarkdownBody } from "./rules";
import { MarkdownPreviewWidget } from "./markdown-widget";
export const refreshEditor = StateEffect.define<number>();
const finish = StateEffect.define<null>();
type Lock = { from: number; to: number };
const sessions = Facet.define<readonly Lock[]>();
export function finishMarkdownEditing(view: EditorView): boolean {
  const locks = view.state.facet(sessions).flat();
  if (view.composing || !locks.length) return false;
  view.dispatch({
    effects: finish.of(null),
    selection: {
      anchor: Math.min(view.state.doc.length, locks[locks.length - 1].to),
    },
    scrollIntoView: true,
  });
  return true;
}
class FinishWidget extends WidgetType {
  eq() {
    return true;
  }
  toDOM(view: EditorView) {
    const el = view.dom.ownerDocument
      .createDocumentFragment()
      .createEl("span", { cls: "cp-finish-edit" });
    const button = el.createEl("button", {
      text: "完成编辑",
      attr: {
        type: "button",
        "aria-label": "完成 Markdown 编辑并恢复正文预览",
      },
    });
    button.addEventListener("mousedown", (e) => e.preventDefault());
    button.addEventListener("click", () => {
      finishMarkdownEditing(view);
    });
    return el;
  }
  ignoreEvent() {
    return true;
  }
}
export function createMarkdownPreviews(
  host: PaletteHost,
  getPath: (s: EditorState) => string,
  isLive: (s: EditorState) => boolean,
) {
  function build(
    state: EditorState,
    old: readonly Lock[] = [],
    tr?: Transaction,
  ) {
    const path = getPath(state),
      rule = resolveRule(path, host.settings);
    const regions =
      host.active &&
      host.settings.markdownPreview &&
      rule?.enabled &&
      rendersMarkdownBody(rule, "text")
        ? codeRegions(state, tr?.startState, tr?.changes).filter(
            (r) =>
              r.kind === "block" &&
              r.text.length <= 200000 &&
              rendersMarkdownBody(rule, r.language),
          )
        : [];
    const finished = tr?.effects.some((e) => e.is(finish)) ?? false;
    const mapped = tr?.docChanged
      ? old.map((r) => ({
          from: tr.changes.mapPos(r.from, 1),
          to: tr.changes.mapPos(r.to, 1),
        }))
      : old;
    const locks: Lock[] = [];
    const widgets = [];
    for (const r of regions) {
      // A closing fence can grow at its boundary while the caret is exactly at
      // region.to. Preserve the editing identity through that structural edit.
      const wasEditing = mapped.some((p) => p.from < r.to && p.to > r.from);
      const selected = state.selection.ranges.some((s) =>
        s.empty
          ? s.from > r.from && s.from < r.to
          : s.from < r.to && s.to > r.from,
      );
      if (!finished && (wasEditing || selected)) {
        locks.push({ from: r.from, to: r.to });
        if (isLive(state))
          widgets.push(
            Decoration.widget({ widget: new FinishWidget(), side: 1 }).range(
              r.to,
            ),
          );
      } else if (isLive(state) && host.renderMarkdown && r.to > r.from) {
        const anchor = Math.min(
          r.to - 1,
          Math.max(r.from + 1, r.segments[0]?.from ?? r.from),
        );
        widgets.push(
          Decoration.replace({
            block: true,
            widget: new MarkdownPreviewWidget(host, r.text, path, anchor, 0),
          }).range(r.from, r.to),
        );
      }
    }
    return { locks, decorations: Decoration.set(widgets, true) };
  }
  return StateField.define<{ locks: Lock[]; decorations: DecorationSet }>({
    create: (s) => build(s),
    update(value, tr) {
      if (
        tr.docChanged ||
        tr.selection ||
        tr.reconfigured ||
        getPath(tr.startState) !== getPath(tr.state) ||
        isLive(tr.startState) !== isLive(tr.state) ||
        tr.effects.some((e) => e.is(refreshEditor) || e.is(finish))
      )
        return build(
          tr.state,
          getPath(tr.startState) === getPath(tr.state) ? value.locks : [],
          tr,
        );
      return value;
    },
    provide: (field) => [
      EditorView.decorations.from(field, (v) => v.decorations),
      sessions.from(field, (v) => v.locks),
    ],
  });
}

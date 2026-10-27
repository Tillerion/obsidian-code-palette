import type { HighlightResult } from "./highlighter";
type Paint = {
  el: HTMLElement;
  classes: string[];
  values: [string, string, string][];
  originalStyle: string | null;
  originalCss: string;
  hadClass: boolean;
};
export interface CodeRecord {
  el: HTMLElement;
  children: Node[];
  text: string;
  paint: Paint[];
  renderedChildren: Node[];
}
function paint(
  el: HTMLElement,
  classes: string[],
  values: Record<string, string>,
): Paint {
  const record: Paint = {
    el,
    classes: classes.filter((c) => !el.classList.contains(c)),
    values: [],
    originalStyle: el.getAttribute("style"),
    originalCss: el.style.cssText,
    hadClass: el.hasAttribute("class"),
  };
  el.classList.add(...classes);
  for (const [key, val] of Object.entries(values)) {
    record.values.push([
      key,
      el.style.getPropertyValue(key),
      el.style.getPropertyPriority(key),
    ]);
    el.style.setProperty(key, val);
  }
  return record;
}
export function tokenStyle(color: string, fontStyle: number): string {
  return `color:${color}!important;font-style:${fontStyle & 1 ? "italic" : "normal"};font-weight:${fontStyle & 2 ? "bold" : "normal"};text-decoration:${fontStyle & 4 ? "underline" : "none"}`;
}
export function appendTokens(el: HTMLElement, result: HighlightResult) {
  const frag = el.ownerDocument.createDocumentFragment();
  for (const token of result.tokens) {
    const span = el.ownerDocument.createElement("span");
    span.className = "cp-token";
    span.style.cssText = tokenStyle(token.color, token.fontStyle);
    span.textContent = token.text;
    frag.append(span);
  }
  el.replaceChildren(frag);
}
export function applyCode(
  el: HTMLElement,
  result: HighlightResult,
  background: boolean,
): CodeRecord {
  const pre = el.parentElement?.tagName === "PRE" ? el.parentElement : null;
  const record: CodeRecord = {
    el,
    children: Array.from(el.childNodes),
    text: el.textContent ?? "",
    paint: [],
    renderedChildren: [],
  };
  const vars = { "--cp-fg": result.foreground, "--cp-bg": result.background };
  record.paint.push(
    paint(
      el,
      [
        "cp-code",
        pre ? "cp-block" : "cp-inline",
        ...(background ? ["cp-background"] : []),
      ],
      vars,
    ),
  );
  if (pre)
    record.paint.push(
      paint(pre, ["cp-pre", ...(background ? ["cp-background"] : [])], vars),
    );
  appendTokens(el, result);
  record.renderedChildren = Array.from(el.childNodes);
  return record;
}
export function isCodePaintIntact(record: CodeRecord): boolean {
  return (
    record.el.textContent === record.text &&
    record.el.childNodes.length === record.renderedChildren.length &&
    record.renderedChildren.every(
      (node, index) => record.el.childNodes[index] === node,
    )
  );
}
export function restoreCode(record: CodeRecord) {
  if (isCodePaintIntact(record)) record.el.replaceChildren(...record.children);
  else
    for (const node of record.renderedChildren) {
      if (
        node.parentNode === record.el &&
        node.nodeType === 1 &&
        (node as Element).classList.contains("cp-token")
      )
        (node as ChildNode).replaceWith(...Array.from(node.childNodes));
    }
  for (const r of record.paint) {
    r.el.classList.remove(...r.classes);
    for (const [key, val, priority] of r.values) {
      if (val) r.el.style.setProperty(key, val, priority);
      else r.el.style.removeProperty(key);
    }
    if (r.el.style.cssText === r.originalCss) {
      if (r.originalStyle === null) r.el.removeAttribute("style");
      else r.el.setAttribute("style", r.originalStyle);
    }
    if (!r.hadClass && !r.el.getAttribute("class"))
      r.el.removeAttribute("class");
  }
}

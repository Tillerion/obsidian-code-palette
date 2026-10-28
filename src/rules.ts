import { canonicalLanguage, functionalLanguages, themes } from "./catalog";
export type ExistingLanguagePolicy = "preserve" | "replace";
export interface Rule {
  kind: "file" | "folder";
  path: string;
  enabled: boolean;
  language: string;
  existingLanguage?: ExistingLanguagePolicy;
  inline: boolean;
  blocks: boolean;
  recursive: boolean;
}
export interface Settings {
  enabled: boolean;
  globalPalette: boolean;
  rules: Rule[];
  defaultRule: Rule | null;
  themeMode: "auto" | "fixed";
  darkTheme: string;
  lightTheme: string;
  fixedTheme: string;
  inlineBackground: "theme" | "obsidian";
  blockBackground: boolean;
}
export function defaultSettings(): Settings {
  return {
    enabled: true,
    globalPalette: false,
    rules: [],
    defaultRule: null,
    themeMode: "auto",
    darkTheme: "one-dark-pro",
    lightTheme: "light-plus",
    fixedTheme: "one-dark-pro",
    inlineBackground: "theme",
    blockBackground: true,
  };
}
export function cleanPath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}
export function setRule(rules: Rule[], rule: Rule): Rule[] {
  const next = { ...rule, path: cleanPath(rule.path) };
  const index = rules.findIndex(
    (r) => r.kind === next.kind && cleanPath(r.path) === next.path,
  );
  if (index < 0) return [...rules, next];
  return rules.map((r, i) => (i === index ? next : r));
}
export function resolveRule(
  path: string,
  settings: Settings,
): (Rule & { source: string; paletteOnly?: boolean }) | null {
  if (!settings.enabled) return null;
  if (settings.globalPalette)
    return {
      kind: "folder",
      path: "",
      enabled: true,
      language: "text",
      inline: true,
      blocks: true,
      recursive: true,
      source: "全局代码配色（不匹配语言）",
      paletteOnly: true,
    };
  path = cleanPath(path);
  const file = settings.rules.find((r) => r.kind === "file" && r.path === path);
  if (file) return { ...file, source: `文件：${file.path}` };
  const folders = settings.rules.filter(
    (r) =>
      r.kind === "folder" &&
      (r.path === "" || path.startsWith(r.path + "/")) &&
      (r.recursive ||
        path.slice(r.path.length + (r.path ? 1 : 0)).indexOf("/") === -1),
  );
  folders.sort((a, b) => b.path.length - a.path.length);
  if (folders[0])
    return { ...folders[0], source: `文件夹：${folders[0].path || "/"}` };
  return settings.defaultRule
    ? { ...settings.defaultRule, source: "仓库默认规则" }
    : null;
}
export function chooseLanguage(
  explicit: string,
  fallback: string,
  paletteOnly = false,
  existingLanguage: ExistingLanguagePolicy = "preserve",
): string | null {
  const id = explicit.trim().split(/\s+/)[0].toLowerCase();
  if (id && (functionalLanguages.has(id) || id.startsWith("ad-"))) return null;
  if (paletteOnly) return id ? (canonicalLanguage(id) ?? "text") : "text";
  if (existingLanguage === "replace") return canonicalLanguage(fallback);
  return id ? canonicalLanguage(id) : canonicalLanguage(fallback);
}
export function moveRules(
  rules: Rule[],
  oldPath: string,
  newPath: string,
): Rule[] {
  const old = cleanPath(oldPath),
    next = cleanPath(newPath);
  return rules.map((r) =>
    r.path === old || r.path.startsWith(old + "/")
      ? { ...r, path: next + r.path.slice(old.length) }
      : r,
  );
}
export function normalizeSettings(raw: unknown): Settings {
  const d = defaultSettings();
  if (!raw || typeof raw !== "object") return d;
  const v = raw as Record<string, unknown>;
  for (const k of ["enabled", "globalPalette", "blockBackground"] as const)
    if (typeof v[k] === "boolean") d[k] = v[k];
  if (v.themeMode === "auto" || v.themeMode === "fixed")
    d.themeMode = v.themeMode;
  if (v.inlineBackground === "theme" || v.inlineBackground === "obsidian")
    d.inlineBackground = v.inlineBackground;
  for (const k of ["darkTheme", "lightTheme", "fixedTheme"] as const)
    if (typeof v[k] === "string" && themes.some((t) => t.id === v[k]))
      d[k] = v[k];
  function validRule(rawRule: unknown): Rule | null {
    if (!rawRule || typeof rawRule !== "object") return null;
    const r = rawRule as Record<string, unknown>;
    if (
      (r.kind !== "file" && r.kind !== "folder") ||
      typeof r.path !== "string" ||
      typeof r.language !== "string"
    )
      return null;
    const path = cleanPath(r.path);
    if (
      path.split("/").some((p) => p === ".." || p === ".") ||
      path.includes(":")
    )
      return null;
    const language = canonicalLanguage(r.language);
    if (!language) return null;
    return {
      kind: r.kind,
      path,
      language,
      existingLanguage:
        r.existingLanguage === "replace" ? "replace" : "preserve",
      enabled: r.enabled !== false,
      inline: r.inline !== false,
      blocks: r.blocks !== false,
      recursive: r.recursive !== false,
    };
  }
  if (Array.isArray(v.rules)) {
    const seen = new Set<string>();
    for (const item of v.rules.slice(0, 10000)) {
      const r = validRule(item);
      if (r) {
        const key = r.kind + ":" + r.path;
        if (!seen.has(key)) {
          seen.add(key);
          d.rules.push(r);
        }
      }
    }
  }
  d.defaultRule = validRule(v.defaultRule);
  return d;
}
export function activeTheme(s: Settings, dark: boolean): string {
  return s.themeMode === "fixed"
    ? s.fixedTheme
    : dark
      ? s.darkTheme
      : s.lightTheme;
}

// Explicit imports keep the offline bundle limited to the promised languages/themes.
export const languages = [
  {
    id: "python",
    name: "Python",
    aliases: ["py"],
    load: () => import("shiki/langs/python.mjs"),
  },
  { id: "c", name: "C", aliases: [], load: () => import("shiki/langs/c.mjs") },
  {
    id: "cpp",
    name: "C++",
    aliases: ["c++", "cc", "cxx", "h", "hpp"],
    load: () => import("shiki/langs/cpp.mjs"),
  },
  {
    id: "java",
    name: "Java",
    aliases: [],
    load: () => import("shiki/langs/java.mjs"),
  },
  {
    id: "csharp",
    name: "C#",
    aliases: ["cs", "c#"],
    load: () => import("shiki/langs/csharp.mjs"),
  },
  {
    id: "javascript",
    name: "JavaScript",
    aliases: ["js"],
    load: () => import("shiki/langs/javascript.mjs"),
  },
  {
    id: "typescript",
    name: "TypeScript",
    aliases: ["ts"],
    load: () => import("shiki/langs/typescript.mjs"),
  },
  {
    id: "go",
    name: "Go",
    aliases: ["golang"],
    load: () => import("shiki/langs/go.mjs"),
  },
  {
    id: "rust",
    name: "Rust",
    aliases: ["rs"],
    load: () => import("shiki/langs/rust.mjs"),
  },
  {
    id: "kotlin",
    name: "Kotlin",
    aliases: ["kt", "kts"],
    load: () => import("shiki/langs/kotlin.mjs"),
  },
  {
    id: "swift",
    name: "Swift",
    aliases: [],
    load: () => import("shiki/langs/swift.mjs"),
  },
  {
    id: "php",
    name: "PHP",
    aliases: [],
    load: () => import("shiki/langs/php.mjs"),
  },
  {
    id: "ruby",
    name: "Ruby",
    aliases: ["rb"],
    load: () => import("shiki/langs/ruby.mjs"),
  },
  {
    id: "sql",
    name: "SQL",
    aliases: [],
    load: () => import("shiki/langs/sql.mjs"),
  },
  {
    id: "bash",
    name: "Bash / Shell",
    aliases: ["sh", "shell", "zsh"],
    load: () => import("shiki/langs/bash.mjs"),
  },
  {
    id: "powershell",
    name: "PowerShell",
    aliases: ["ps", "ps1"],
    load: () => import("shiki/langs/powershell.mjs"),
  },
  {
    id: "bat",
    name: "Windows Batch",
    aliases: ["batch", "cmd"],
    load: () => import("shiki/langs/bat.mjs"),
  },
  {
    id: "html",
    name: "HTML",
    aliases: [],
    load: () => import("shiki/langs/html.mjs"),
  },
  {
    id: "css",
    name: "CSS",
    aliases: [],
    load: () => import("shiki/langs/css.mjs"),
  },
  {
    id: "json",
    name: "JSON",
    aliases: ["jsonc"],
    load: () => import("shiki/langs/json.mjs"),
  },
  {
    id: "yaml",
    name: "YAML",
    aliases: ["yml"],
    load: () => import("shiki/langs/yaml.mjs"),
  },
  {
    id: "toml",
    name: "TOML",
    aliases: [],
    load: () => import("shiki/langs/toml.mjs"),
  },
  {
    id: "xml",
    name: "XML",
    aliases: ["svg"],
    load: () => import("shiki/langs/xml.mjs"),
  },
  {
    id: "markdown",
    name: "Markdown",
    aliases: ["md"],
    load: () => import("shiki/langs/markdown.mjs"),
  },
];
export const themes = [
  {
    id: "one-dark-pro",
    name: "One Dark Pro",
    dark: true,
    load: () => import("shiki/themes/one-dark-pro.mjs"),
  },
  {
    id: "dark-plus",
    name: "VS Code Dark+",
    dark: true,
    load: () => import("shiki/themes/dark-plus.mjs"),
  },
  {
    id: "light-plus",
    name: "VS Code Light+",
    dark: false,
    load: () => import("shiki/themes/light-plus.mjs"),
  },
  {
    id: "github-dark",
    name: "GitHub Dark",
    dark: true,
    load: () => import("shiki/themes/github-dark.mjs"),
  },
  {
    id: "github-light",
    name: "GitHub Light",
    dark: false,
    load: () => import("shiki/themes/github-light.mjs"),
  },
  {
    id: "dracula",
    name: "Dracula",
    dark: true,
    load: () => import("shiki/themes/dracula.mjs"),
  },
  {
    id: "nord",
    name: "Nord",
    dark: true,
    load: () => import("shiki/themes/nord.mjs"),
  },
  {
    id: "monokai",
    name: "Monokai",
    dark: true,
    load: () => import("shiki/themes/monokai.mjs"),
  },
  {
    id: "solarized-dark",
    name: "Solarized Dark",
    dark: true,
    load: () => import("shiki/themes/solarized-dark.mjs"),
  },
  {
    id: "solarized-light",
    name: "Solarized Light",
    dark: false,
    load: () => import("shiki/themes/solarized-light.mjs"),
  },
];
export function canonicalLanguage(value: string): string | null {
  const id = value.toLowerCase().trim();
  if (["text", "txt", "plain", "plaintext", "none"].includes(id)) return "text";
  return (
    languages.find((x) => x.id === id || x.aliases.includes(id))?.id ?? null
  );
}
export function languageName(id: string): string {
  return id === "text"
    ? "纯文本"
    : (languages.find((x) => x.id === id)?.name ?? id);
}
export function themeName(id: string): string {
  return themes.find((x) => x.id === id)?.name ?? id;
}
export const functionalLanguages = new Set([
  "mermaid",
  "dataview",
  "dataviewjs",
  "tasks",
  "query",
  "chart",
  "charts",
  "button",
  "buttons",
  "base",
  "bases",
  "leaflet",
  "ad-note",
  "ad-info",
  "ad-warning",
  "desmos",
  "plot",
  "table-of-contents",
]);

import type { Settings } from "./rules";
import type { Highlighter } from "./highlighter";
export interface PaletteHost {
  settings: Settings;
  highlighter: Highlighter;
  active: boolean;
  revision: number;
  theme(document?: Document): string;
  subscribe(callback: () => void): () => void;
  reportError(error: unknown): void;
}

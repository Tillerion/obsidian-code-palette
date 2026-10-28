import type { Settings } from "./rules";
import type { Highlighter } from "./highlighter";
export interface MarkdownRenderHandle {
  ready: Promise<void>;
  dispose(): void;
}
export interface PaletteHost {
  settings: Settings;
  highlighter: Highlighter;
  active: boolean;
  revision: number;
  theme(document?: Document): string;
  subscribe(callback: () => void): () => void;
  reportError(error: unknown): void;
  renderMarkdown?(
    source: string,
    container: HTMLElement,
    path: string,
  ): MarkdownRenderHandle;
}

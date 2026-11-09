import type { MenuItem } from "obsidian";
export type AddMenuItem = (callback: (item: MenuItem) => void) => unknown;
interface API {
  menus?: {
    registerFileMenu?: (
      callback: (context: {
        addItem: AddMenuItem;
        file: { path: string; extension: string };
        selection: { mode: string };
      }) => void,
    ) => () => void;
    registerFolderMenu?: (
      callback: (context: {
        addItem: AddMenuItem;
        folder: { path: string };
      }) => void,
    ) => () => void;
  };
}
export class NavigatorMenus {
  private api?: unknown;
  private cleanups: (() => void)[] = [];
  private dead = false;
  constructor(
    private getAPI: () => unknown,
    private addActions: (
      add: AddMenuItem,
      kind: "file" | "folder",
      path: string,
    ) => void,
  ) {}
  sync() {
    if (this.dead) return;
    const api = this.getAPI() as API | undefined;
    if (api === this.api) return;
    this.detach();
    if (
      typeof api?.menus?.registerFileMenu !== "function" ||
      typeof api.menus.registerFolderMenu !== "function"
    )
      return;
    this.api = api;
    try {
      this.cleanups.push(
        api.menus.registerFileMenu((context) => {
          if (
            this.dead ||
            this.api !== api ||
            context.selection?.mode !== "single" ||
            context.file.extension !== "md"
          )
            return;
          this.addActions(
            (callback) => context.addItem(callback),
            "file",
            context.file.path,
          );
        }),
      );
      this.cleanups.push(
        api.menus.registerFolderMenu((context) => {
          if (this.dead || this.api !== api) return;
          this.addActions(
            (callback) => context.addItem(callback),
            "folder",
            context.folder.path,
          );
        }),
      );
    } catch {
      this.detach(); // Optional integrations must not prevent the plugin loading.
    }
  }
  private detach() {
    for (const cleanup of this.cleanups.splice(0)) {
      try {
        cleanup();
      } catch {
        /* Navigator may already have unloaded. */
      }
    }
    this.api = undefined;
  }
  dispose() {
    if (this.dead) return;
    this.dead = true;
    this.detach();
  }
}

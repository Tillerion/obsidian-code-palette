import { test } from "node:test";
import assert from "node:assert/strict";
import { NavigatorMenus } from "../src/navigator.ts";

test("Navigator menus use clicked paths, filter multi-selection/non-Markdown and clean up API replacements", () => {
  let fileHook: any,
    folderHook: any,
    disposed = 0,
    registered = 0;
  const makeAPI = () => ({
    menus: {
      registerFileMenu: (f: any) => {
        fileHook = f;
        registered++;
        return () => disposed++;
      },
      registerFolderMenu: (f: any) => {
        folderHook = f;
        registered++;
        return () => disposed++;
      },
    },
  });
  let api: unknown;
  const actions: unknown[] = [];
  const menus = new NavigatorMenus(
    () => api,
    (_add, kind, path) => {
      actions.push([kind, path]);
    },
  );
  menus.sync();
  assert.equal(registered, 0);
  api = makeAPI();
  menus.sync();
  menus.sync();
  assert.equal(registered, 2);
  fileHook({
    file: { path: "clicked.md", extension: "md" },
    selection: { mode: "single" },
    addItem() {},
  });
  fileHook({
    file: { path: "image.png", extension: "png" },
    selection: { mode: "single" },
    addItem() {},
  });
  fileHook({
    file: { path: "multiple.md", extension: "md" },
    selection: { mode: "multiple" },
    addItem() {},
  });
  folderHook({ folder: { path: "Exercises/Python" }, addItem() {} });
  assert.deepEqual(actions, [
    ["file", "clicked.md"],
    ["folder", "Exercises/Python"],
  ]);
  api = makeAPI();
  menus.sync();
  assert.equal(disposed, 2);
  assert.equal(registered, 4);
  api = undefined;
  menus.sync();
  assert.equal(disposed, 4);
  api = { menus: {} };
  menus.sync();
  assert.equal(registered, 4);
  api = makeAPI();
  menus.sync();
  menus.dispose();
  menus.dispose();
  assert.equal(disposed, 6);
  menus.sync();
  assert.equal(registered, 6);
});

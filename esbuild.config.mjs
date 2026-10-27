import * as esbuild from "esbuild";
import { readFileSync } from "node:fs";
const { version } = JSON.parse(
  readFileSync(new URL("./manifest.json", import.meta.url), "utf8"),
);
const options = {
  entryPoints: ["src/main.ts"],
  bundle: true,
  format: "cjs",
  target: "es2022",
  platform: "browser",
  outfile: "main.js",
  external: [
    "obsidian",
    "electron",
    "@codemirror/state",
    "@codemirror/view",
    "@codemirror/language",
  ],
  minify: !process.argv.includes("--watch"),
  sourcemap: false,
  banner: {
    js: `/* Code Palette v${version} | MIT | See THIRD_PARTY_NOTICES.md */`,
  },
};
if (process.argv.includes("--watch")) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
} else {
  await esbuild.build(options);
}

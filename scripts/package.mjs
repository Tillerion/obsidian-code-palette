import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const manifest = JSON.parse(
  await fs.readFile(path.join(root, "manifest.json"), "utf8"),
);
const pkg = JSON.parse(
  await fs.readFile(path.join(root, "package.json"), "utf8"),
);
if (pkg.version !== manifest.version)
  throw new Error("Package and manifest versions must match");
const filename = `code-palette-v${manifest.version}.zip`;
const stage = path.join(dist, "code-palette");
// Reset only the known staging child so stale files cannot enter a new ZIP.
if (path.dirname(stage) !== dist || path.basename(stage) !== "code-palette")
  throw new Error("Unexpected package staging path");
await fs.rm(stage, { recursive: true, force: true });
await fs.mkdir(stage, { recursive: true });
const files = [
  "main.js",
  "manifest.json",
  "styles.css",
  "README.md",
  "README.EN.md",
  "LICENSE",
  "THIRD_PARTY_NOTICES.md",
  "CHANGELOG.md",
];
for (const file of files)
  await fs.copyFile(path.join(root, file), path.join(stage, file));
await fs.cp(path.join(root, "licenses"), path.join(stage, "licenses"), {
  recursive: true,
});
await fs.cp(path.join(root, "examples"), path.join(stage, "examples"), {
  recursive: true,
});
await fs.mkdir(path.join(stage, "docs"), { recursive: true });
await fs.copyFile(
  path.join(root, "docs", "verification.md"),
  path.join(stage, "docs", "verification.md"),
);
await fs.cp(
  path.join(root, "docs", "screenshots"),
  path.join(stage, "docs", "screenshots"),
  { recursive: true },
);
const lock = JSON.parse(
  await fs.readFile(path.join(root, "package-lock.json"), "utf8"),
);
const notices = [];
for (const [relative, meta] of Object.entries(lock.packages)) {
  if (!relative || meta.dev || meta.devOptional) continue;
  const directory = path.join(root, relative);
  for (const filename of await fs.readdir(directory)) {
    if (!/^(?:licen[sc]e|notice|copying)(?:[.-]|$)/i.test(filename)) continue;
    const full = path.join(directory, filename);
    if (!(await fs.stat(full)).isFile()) continue;
    notices.push(
      `\n${"=".repeat(72)}\n${relative} @ ${meta.version} / ${filename}\n${"=".repeat(72)}\n${await fs.readFile(full, "utf8")}`,
    );
  }
}
await fs.writeFile(
  path.join(stage, "licenses", "dependency-licenses.txt"),
  notices.join("\n"),
  "utf8",
);
const zip = path.join(dist, filename);
if (
  path.dirname(zip) !== dist ||
  !/^code-palette-v\d+\.\d+\.\d+\.zip$/.test(filename)
)
  throw new Error("Unexpected package archive path");
await fs.rm(zip, { force: true });
// Environment variables carry paths without interpolating them into PowerShell code.
const result =
  process.platform === "win32"
    ? spawnSync(
        "powershell.exe",
        [
          "-NoProfile",
          "-Command",
          "Compress-Archive -LiteralPath $env:CP_STAGE -DestinationPath $env:CP_ZIP -CompressionLevel Optimal -Force",
        ],
        {
          env: { ...process.env, CP_STAGE: stage, CP_ZIP: zip },
          encoding: "utf8",
          windowsHide: true,
        },
      )
    : spawnSync("zip", ["-r", "-q", zip, path.basename(stage)], {
        cwd: dist,
        encoding: "utf8",
      });
if (result.status !== 0)
  throw new Error(result.stderr || result.stdout || "ZIP packaging failed");
const hash = createHash("sha256")
  .update(await fs.readFile(zip))
  .digest("hex");
await fs.writeFile(path.join(dist, "SHA256SUMS.txt"), `${hash}  ${filename}\n`);
console.log(`Created ${zip}\nSHA256 ${hash}`);

import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(process.cwd());
const PAPERS_DIR = path.join(ROOT, "public", "2025");
const PAPERS_JSON = path.join(ROOT, "public", "papers.json");

const slugify = (value) =>
  String(value || "")
    .replace(/&/g, " and ")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

async function renameFolders() {
  const entries = await fs.readdir(PAPERS_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const current = entry.name;
    const next = slugify(current);
    if (!next || next === current) continue;
    const from = path.join(PAPERS_DIR, current);
    const to = path.join(PAPERS_DIR, next);
    await fs.rename(from, to);
    console.log(`[INFO] Renamed folder: "${current}" -> "${next}"`);
  }
}

async function updateJson() {
  const raw = JSON.parse(await fs.readFile(PAPERS_JSON, "utf-8"));
  for (const folder of raw) {
    folder.folder = slugify(folder.folder);
  }
  await fs.writeFile(PAPERS_JSON, JSON.stringify(raw, null, 2));
  console.log("[INFO] Updated folder slugs inside papers.json");
}

async function main() {
  await renameFolders();
  await updateJson();
}

await main();

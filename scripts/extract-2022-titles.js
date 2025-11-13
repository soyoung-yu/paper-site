import fs from "node:fs/promises";
import path from "node:path";
import xlsx from "xlsx";
import { PDFParse } from "pdf-parse";

const ROOT = process.cwd();
const YEAR = "2022";
const PDF_DIR = path.join(ROOT, "public", YEAR);
const WORKBOOK_PATH = path.join(ROOT, `${YEAR}_pdfs.xlsx`);

const HEADER_SKIP = [
  /ifscc/i,
  /congress/i,
  /confidential/i,
  /internal use/i,
  /^topic\b/i,
  /^session\b/i,
  /^category\b/i,
  /^track\b/i,
  /^event\b/i,
  /^presentation\b/i,
  /^chair\b/i,
  /^moderator\b/i,
  /^poster\b/i,
  /^oral\b/i,
  /^speaker\b/i,
  /^venue\b/i,
];

const STOP_PATTERNS = [
  /^abstract\b/i,
  /^introduction\b/i,
  /^background\b/i,
  /^materials?\b/i,
  /^methods?\b/i,
  /^results?\b/i,
  /^discussion\b/i,
  /^conclusion\b/i,
  /^keywords?\b/i,
  /^authors?\b/i,
];

const AUTHOR_CLUES = [
  /@/i,
  /;\s*[A-Z]/,
  /\b[A-Z][a-z]+,\s*[A-Z]/,
  /\b\d+\s*(?:;|,|\*|\))/,
  /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){2,}\s*\d/,
  /corresponding author/i,
];

const normalizeWhitespace = (text = "") =>
  text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\u00ad/g, "") // soft hyphen
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const extractTitle = (raw = "") => {
  if (!raw) return "";
  const normalized = normalizeWhitespace(raw);
  const firstPage = normalized.split("\f")[0] || normalized;
  const abstractSplit = firstPage.split(/\babstract\b/i)[0] || firstPage;
  const blockLines = abstractSplit
    .split(/\n{2,}/)
    .map((block) =>
      block
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
    )
    .filter((lines) => lines.length);

  for (const lines of blockLines) {
    let collected = [];
    for (const line of lines) {
      if (!collected.length && HEADER_SKIP.some((rx) => rx.test(line))) {
        continue;
      }
      if (STOP_PATTERNS.some((rx) => rx.test(line))) break;
      const normalizedLine = line.replace(/\s+/g, " ").trim();
      if (!normalizedLine) continue;
      if (
        collected.length &&
        AUTHOR_CLUES.some((rx) => rx.test(normalizedLine))
      ) {
        break;
      }
      collected.push(normalizedLine);
      if (/[.!?]"?$/.test(normalizedLine) && collected.join(" ").length > 40) {
        break;
      }
      if (collected.length >= 3) break;
    }
    let candidate = collected.join(" ").replace(/\s{2,}/g, " ").trim();
    candidate = candidate.replace(/^[\d\W]+(?=[A-Za-z0-9])/, "");
    if (candidate.length >= 15 && !AUTHOR_CLUES.some((rx) => rx.test(candidate))) {
      return candidate;
    }
  }

  const fallback =
    blockLines.flat().find((line) => !HEADER_SKIP.some((rx) => rx.test(line))) ||
    blockLines[0]?.[0];
  return fallback || "";
};

const main = async () => {
  const workbook = xlsx.readFile(WORKBOOK_PATH);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

  if (!rows.length) {
    throw new Error("No rows found in workbook");
  }

  const updated = [];
  for (const row of rows) {
    const filename = row.filename || row.Filename;
    if (!filename) {
      updated.push({ filename: "", title: "" });
      continue;
    }
    const pdfPath = path.join(PDF_DIR, filename);
    let parser;
    try {
      const data = await fs.readFile(pdfPath);
      parser = new PDFParse({ data });
      const parsed = await parser.getText();
      const title = extractTitle(parsed.text || "");
      updated.push({ filename, title });
    } catch (err) {
      console.error(`Failed to extract title for ${filename}: ${err.message}`);
      updated.push({ filename, title: row.title || "" });
    } finally {
      await parser?.destroy();
    }
  }

  const outSheet = xlsx.utils.json_to_sheet(updated, {
    header: ["filename", "title"],
  });
  const outBook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(outBook, outSheet, sheetName || YEAR);
  xlsx.writeFile(outBook, WORKBOOK_PATH);

  console.log(`Updated titles for ${updated.length} PDFs → ${WORKBOOK_PATH}`);
};

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

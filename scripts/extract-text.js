import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFParse } from "pdf-parse";

const ROOT = path.resolve(process.cwd());
const PAPERS_JSON = path.join(ROOT, "public", "papers.json");
const PAPERS_DIR = path.join(ROOT, "public", "papers");
const OUTPUT_JSON = path.join(ROOT, "public", "papers-search.json");
const AFFILIATION_FILE = path.join(ROOT, "public", "affiliation.txt");
const MAX_HEADER_LINES = 220;
const SECTION_START_RE = /^\d+\.\s/;
const KEYWORDS_RE = /^keywords?\b/i;

const normalizeWhitespace = (raw) =>
  raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();

const normalizeAffKey = (input) =>
  String(input || "")
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const LOCATION_KEYWORDS = [
  "korea",
  "republic of",
  "usa",
  "united states",
  "china",
  "people's republic",
  "japan",
  "france",
  "germany",
  "uk",
  "united kingdom",
  "england",
  "scotland",
  "ireland",
  "spain",
  "italy",
  "singapore",
  "australia",
  "austria",
  "canada",
  "switzerland",
  "india",
  "hong kong",
  "taiwan",
  "brazil",
  "mexico",
  "thailand",
  "indonesia",
  "russia",
  "greece",
  "poland",
  "turkey",
  "malaysia",
  "philippines",
  "vietnam",
  "argentina",
  "chile",
  "peru",
  "israel",
  "saudi",
  "emirates",
  "dubai",
  "abu dhabi",
  "south africa",
  "nigeria",
  "egypt",
  "belgium",
  "netherlands",
  "sweden",
  "norway",
  "finland",
  "denmark",
  "portugal",
  "czech",
  "slovakia",
  "romania",
  "bulgaria",
  "croatia",
  "colombia",
  "venezuela",
  "uruguay",
  "new zealand",
  "pakistan",
  "bangladesh",
  "sri lanka",
  "nepal",
  "darmstadt",
  "paris",
  "seoul",
  "tokyo",
  "yokohama",
  "osaka",
  "shanghai",
  "beijing",
  "guangzhou",
  "shenzhen",
  "nanjing",
  "wuhan",
  "taipei",
  "kaohsiung",
  "new york",
  "los angeles",
  "chicago",
  "boston",
  "houston",
  "atlanta",
  "washington",
  "philadelphia",
  "london",
  "cambridge",
  "oxford",
  "berlin",
  "munich",
  "hamburg",
  "frankfurt",
  "madrid",
  "barcelona",
  "rome",
  "milan",
  "turin",
  "zurich",
  "geneva",
  "lausanne",
  "montreal",
  "toronto",
  "vancouver",
  "sao paulo",
  "rio de janeiro",
  "curitiba",
  "lisbon",
  "porto",
  "jakarta",
  "bangkok",
];

const ORG_KEYWORD_PATTERNS = [
  /\buniversity\b/i,
  /\bcollege\b/i,
  /\bacademy\b/i,
  /\bschool\b/i,
  /\bdepartment\b/i,
  /\bdept\./i,
  /\bfaculty\b/i,
  /\binstitute\b/i,
  /\bcenter\b/i,
  /\bcentre\b/i,
  /laborator/i,
  /\bresearch\b/i,
  /r&d/i,
  /\bhospital\b/i,
  /\bclinic\b/i,
  /dermatolog/i,
  /\bpharma\b/i,
  /\bbiotech\b/i,
  /\bcompany\b/i,
  /\bco\./i,
  /\bcorporation\b/i,
  /\bcorp\b/i,
  /\binc\b/i,
  /\bltd\b/i,
  /\blimited\b/i,
  /laboratories/i,
  /institut/i,
  /\bindustry\b/i,
  /\bgroup\b/i,
];

const GEO_SEGMENT_REGEX =
  /\b(city|province|state|district|road|street|st\.|rd\.|ave\.|avenue|boulevard|blvd\.|park|technopark|science park|industrial park|valley|tower|building|bldg\.|floor|suite|room)\b/i;
const KOREAN_SUFFIX_REGEX = /-(si|gun|gu|do|ri|eup)\b/i;
const ORG_SEGMENT_KEYWORDS = [
  "university",
  "college",
  "academy",
  "school",
  "department",
  "division",
  "faculty",
  "institute",
  "center",
  "centre",
  "laboratory",
  "laboratories",
  "research",
  "company",
  "co.",
  "corp",
  "inc",
  "ltd",
  "limited",
  "hospital",
  "clinic",
  "dermatolog",
  "pharma",
  "biotech",
  "cosmetic",
  "beauty",
  "skin",
  "personal care",
  "technology",
  "science",
  "innovation",
  "r&d",
  "group",
  "unit",
];

const MANUAL_SYNONYMS = {
  loreal: [
    "l'oreal",
    "loreal",
    "loreal usa",
    "loreal research and innovation",
    "loreal r&i",
  ],
  kolma: ["kolma", "kolmar", "kolmar korea", "kolmar laboratories"],
  cosmax: ["cosmax", "cosmax bti", "cosmax usa", "cosmax china"],
  amorepacific: ["amorepacific", "amore pacific", "amorepacific r&i center"],
  lg: ["lg", "lg h&h", "lg household", "lg household & health care", "lg household and health care"],
  chanel: ["chanel"],
  pola: ["pola", "pola orbis"],
  pg: ["p&g", "procter & gamble", "procter and gamble", "proctor & gamble", "proctor and gamble"],
  kao: ["kao"],
  lvmh: ["lvmh"],
  esteelauder: ["estee lauder", "estée lauder", "estee lauder companies", "elc"],
  shiseido: ["shiseido"],
};

const escapeRegex = (value) => value.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");

const createAliasEntry = (value) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const pattern = escapeRegex(trimmed)
    .replace(/\s*[&]\s*/g, "\\s*&\\s*")
    .replace(/[-\s]+/g, "[\\s\\-]+");
  const regex = new RegExp(`\\b${pattern}\\b`, "i");
  return { regex };
};

const buildCanonicalMatchers = (canonicalNames) => {
  return canonicalNames.map((label) => {
    const key = normalizeAffKey(label).replace(/[^a-z0-9]/g, "");
    const manual = MANUAL_SYNONYMS[key] || [];
  const aliases = [];

  const addAlias = (value) => {
    const entry = createAliasEntry(value);
    if (entry) aliases.push(entry);
  };

  addAlias(label);
  for (const variant of manual) {
    addAlias(variant);
  }
  return { label, aliases };
});
};

let canonicalMatchers = [];

const matchCanonicalFromText = (text) => {
  const matches = [];
  for (const matcher of canonicalMatchers) {
    const hit = matcher.aliases.some(({ regex }) => regex?.test(text));
    if (hit) matches.push(matcher.label);
  }
  return matches;
};

const collectCanonicalMatches = (entries) => {
  const seen = new Set();
  const collected = [];
  for (const entry of entries) {
    for (const label of matchCanonicalFromText(entry)) {
      const key = normalizeAffKey(label);
      if (seen.has(key)) continue;
      seen.add(key);
      collected.push(label);
    }
  }
  return collected;
};

const uniqueLabels = (labels) => {
  const seen = new Set();
  const result = [];
  for (const label of labels) {
    const key = normalizeAffKey(label);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(label);
  }
  return result;
};

const loadCanonicalNames = async () => {
  const raw = await fs.readFile(AFFILIATION_FILE, "utf-8");
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
};

const shouldStopBlock = (line) =>
  /^(abstract|keywords?|introduction|materials?|methods?|background)/i.test(line) ||
  /^\d+\.\s/.test(line) ||
  /^corresponding\s+author/i.test(line) ||
  /^contact\s+author/i.test(line);

const startsNumberedAff = (line) => /^\d+\s*[A-Z]/.test(line);

const hasOrgKeyword = (line) => ORG_KEYWORD_PATTERNS.some((re) => re.test(line));

const explodeEntries = (text) => {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const parts = normalized.split(/;/g);
  const tokens = [];
  for (const part of parts) {
    const cleaned = part.trim();
    if (!cleaned) continue;
    const numberedSplit = cleaned
      .replace(/(\d+)\s*(?=[A-Za-z])/g, "|")
      .split("|")
      .map((seg) => seg.trim())
      .filter(Boolean);
    tokens.push(...numberedSplit);
  }
  return tokens;
};

const HEADER_ZONE = 150;

const collectHeaderText = (lines) => {
  const headerLines = [];
  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (SECTION_START_RE.test(trimmed)) break;
    if (KEYWORDS_RE.test(trimmed)) break;
    if (/^--\s*\d+\s+of\s+\d+\s*--$/i.test(trimmed)) break;
    headerLines.push(trimmed);
  }
  return headerLines.join(" ");
};

const parseNumberedAffiliations = (headerText) => {
  if (!headerText) return [];
  const prepared = headerText
    .replace(/(\d)([A-Za-z(])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
  if (!/\d/.test(prepared)) return [];

  const marked = prepared.replace(/(^|\s)(\d{1,2})(?=\s*[A-Z(])/g, "$1|$2");
  const segments = marked
    .split("|")
    .map((seg) => seg.trim())
    .filter(Boolean);
  const entries = [];
  for (const seg of segments) {
    if (!/^\d+/.test(seg)) continue;
    const spaceIdx = seg.indexOf(" ");
    if (spaceIdx === -1) continue;
    const content = seg.slice(spaceIdx + 1).trim().replace(/;+$/, "").trim();
    if (content) entries.push(content);
  }
  return collectCanonicalMatches(entries);
};

const extractByScan = (lines) => {
  const window = lines.slice(0, MAX_HEADER_LINES);
  const rawEntries = [];
  let buffer = "";
  let capturing = false;
  let capturedAnything = false;

  const flush = () => {
    if (!buffer.trim()) {
      buffer = "";
      capturing = false;
      return;
    }
    rawEntries.push(buffer.trim());
    buffer = "";
    capturing = false;
  };

  for (let idx = 0; idx < window.length; idx++) {
    const rawLine = window[idx];
    const line = rawLine.replace(/\s+/g, " ").trim();
    const withinHeader = idx < HEADER_ZONE;

    if (!withinHeader && !capturing) break;

    if (!line) {
      flush();
      continue;
    }
    if (/^--\s*\d+\s+of\s+\d+\s*--$/i.test(line)) continue;

    if (shouldStopBlock(line)) {
      flush();
      if (capturedAnything) break;
      continue;
    }

    const beginsWithAff = /^affiliations?\b/i.test(line);
    const numbered = startsNumberedAff(line);
    const numberedCandidate = numbered && /,/.test(line);
    const keyworded = hasOrgKeyword(line);

    if (beginsWithAff) {
      capturedAnything = true;
      const content = line.replace(/^affiliations?\s*\d*\s*[:;,-]?\s*/i, "").trim();
      if (capturing) flush();
      buffer = content;
      capturing = true;
      continue;
    }

    const candidateStart =
      beginsWithAff ||
      numberedCandidate ||
      (keyworded && /,/.test(line) && withinHeader);

    if (!capturing && candidateStart) {
      capturedAnything = true;
      buffer = line;
      capturing = true;
      continue;
    }

    if (capturing) {
      if (numberedCandidate) {
        flush();
        buffer = line;
        capturing = true;
      } else {
        buffer = `${buffer} ${line}`.trim();
      }
    }
  }

  flush();

  const exploded = rawEntries.flatMap((entry) => explodeEntries(entry));

  return collectCanonicalMatches(exploded);
};

const extractAffiliationsFromText = (text = "") => {
  const lines = text.split(/\n/);
  const headerText = collectHeaderText(lines.slice(0, MAX_HEADER_LINES));
  const headerMatches = matchCanonicalFromText(headerText);
  const numberedMatches = parseNumberedAffiliations(headerText);
  const scanMatches = extractByScan(lines);
  return uniqueLabels([...headerMatches, ...numberedMatches, ...scanMatches]);
};

async function extractText(pdfPath) {
  let parser;
  try {
    const buff = await fs.readFile(pdfPath);
    parser = new PDFParse({ data: buff });
    const parsed = await parser.getText();
    return normalizeWhitespace(parsed.text || "");
  } catch (err) {
    console.warn(`[WARN] Failed to parse ${pdfPath}: ${err.message}`);
    return "";
  } finally {
    await parser?.destroy();
  }
}

const legacyAffToArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return String(value)
    .split(/[,;\/|]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
};

async function buildIndex() {
  const canonicalNames = await loadCanonicalNames();
  canonicalMatchers = buildCanonicalMatchers(canonicalNames);
  const raw = JSON.parse(await fs.readFile(PAPERS_JSON, "utf-8"));
  const aggregated = [];
  const extractedMap = new Map();

  console.log(`[INFO] Generating search index from ${PAPERS_JSON}`);

  for (const folder of raw) {
    const folderSlug = folder.folder;
    const folderName = folder.name;

    for (const paper of folder.papers || []) {
      const pdfPath = path.join(PAPERS_DIR, folderSlug, paper.filename);
      const text = await extractText(pdfPath);
      const affiliations = extractAffiliationsFromText(text);
      extractedMap.set(paper.id, affiliations);
      aggregated.push({
        id: paper.id,
        title: paper.title,
        filename: paper.filename,
        folder: folderSlug,
        folderName,
        affiliation: affiliations,
        text,
        charCount: text.length,
      });
      console.log(
        `[INFO] Indexed ${paper.id} (${folderSlug}) — ${text.length} chars, ${affiliations.length} affiliations`
      );
    }
  }

  const updatedFolders = raw.map((folder) => ({
    ...folder,
    papers: folder.papers.map((paper) => {
      return {
        ...paper,
        affiliation: extractedMap.get(paper.id) || [],
      };
    }),
  }));

  const payload = {
    generatedAt: new Date().toISOString(),
    paperCount: aggregated.length,
    papers: aggregated,
  };

  await fs.writeFile(OUTPUT_JSON, JSON.stringify(payload, null, 2));
  await fs.writeFile(PAPERS_JSON, JSON.stringify(updatedFolders, null, 2));
  console.log(
    `[INFO] Search index saved to ${OUTPUT_JSON} (${aggregated.length} entries)`
  );
  console.log(`[INFO] Updated affiliations written back to ${PAPERS_JSON}`);
}

const entryPath = fileURLToPath(import.meta.url);

if (process.argv[1] && path.resolve(process.argv[1]) === entryPath) {
  buildIndex().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}

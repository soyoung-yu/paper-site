import React, { useEffect, useMemo, useRef, useState } from "react";
import { Folder, FileText, Download, ChevronLeft, Award, Search } from "lucide-react";

const LOG_URL =
  "https://script.google.com/macros/s/AKfycbyclExJ3KFF4Mtf2zn9m3FOVuGsL1SuPnUi53GCfKIMh8gfIrsquuLgSgIPkpxx4dkw2A/exec";

const PAGE_SIZE = 10;
const DEFAULT_YEAR_TITLE = "IFSCC Full Paper Library";
const YEAR_TITLES = {
  "2025": "IFSCC 2025",
  "2024": "IFSCC 2024",
  "2022": "IFSCC 2022",
};

const getYearTitle = (year) => {
  if (!year) return DEFAULT_YEAR_TITLE;
  return YEAR_TITLES[year] ?? `IFSCC ${year} Full Paper`;
};

const YearBadge = ({ value }) => (
  <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
    {value}
  </span>
);

const buildPdfPath = (year, folder, filename) => {
  const base = import.meta.env.BASE_URL || "/";
  const segments = [year];
  if (folder) segments.push(folder);
  segments.push(filename);
  return `${base}${segments.map((part) => encodeURIComponent(part)).join("/")}`;
};

const logAndOpen = (year, folder, paper) => {
  const href = buildPdfPath(year, folder, paper.filename);

  const payload = {
    paper_id: paper.id,
    title: paper.title,
    year,
    folder,
    href,
    ua: navigator.userAgent,
    ref: document.referrer || "",
    ts: new Date().toISOString(),
  };

  try {
    navigator.sendBeacon(
      LOG_URL,
      new Blob([new URLSearchParams(payload).toString()], {
        type: "application/x-www-form-urlencoded",
      })
    );
  } catch (_) {}

  window.open(href, "_blank", "noopener");
};

const logAffiliationEvent = ({ year, folder, value, scope }) => {
  if (!value || value === "ALL") return;
  const payload = {
    event: "affiliation",
    sheet: "affiliation",
    sheetName: "affiliation",
    paper_id: `AFF-${scope}-${value}`,
    title: `Affiliation Filter: ${value}`,
    href: window.location.href,
    scope,
    year: year || "",
    folder: folder || "",
    filter: value,
    ua: navigator.userAgent,
    ref: document.referrer || "",
    ts: new Date().toISOString(),
  };

  try {
    navigator.sendBeacon(
      LOG_URL,
      new Blob([new URLSearchParams(payload).toString()], {
        type: "application/x-www-form-urlencoded",
      })
    );
  } catch (_) {
    //
  }
};

const logSearchEvent = ({ year, folder, value, scope }) => {
  if (!value) return;
  const payload = {
    event: "search",
    sheet: "search",
    sheetName: "search",
    paper_id: `SEARCH-${scope}-${value}`,
    title: `Search Query: ${value}`,
    href: window.location.href,
    scope,
    year: year || "",
    folder: folder || "",
    query: value,
    ua: navigator.userAgent,
    ref: document.referrer || "",
    ts: new Date().toISOString(),
  };

  try {
    navigator.sendBeacon(
      LOG_URL,
      new Blob([new URLSearchParams(payload).toString()], {
        type: "application/x-www-form-urlencoded",
      })
    );
  } catch (_) {
    //
  }
};

const logHomeVisit = () => {
  const payload = {
    event: "home",
    sheet: "home",
    sheetName: "home",
    paper_id: "HOME-VISIT",
    title: "Home Page Visit",
    href: window.location.href,
    ua: navigator.userAgent,
    ref: document.referrer || "",
    ts: new Date().toISOString(),
  };

  try {
    navigator.sendBeacon(
      LOG_URL,
      new Blob([new URLSearchParams(payload).toString()], {
        type: "application/x-www-form-urlencoded",
      })
    );
  } catch (_) {
    //
  }
};

const buildSearchKey = ({ scope, year, folder }) =>
  `${scope}|${year || ""}|${folder || ""}`;

const recordSearchLog = ({ scope, year, folder, value, cacheRef }) => {
  const trimmed = (value || "").trim();
  if (!trimmed) return;
  const key = buildSearchKey({ scope, year, folder });
  if (cacheRef.current[key] === trimmed) return;
  cacheRef.current[key] = trimmed;
  logSearchEvent({
    year,
    folder,
    value: trimmed,
    scope,
  });
};

/* ---------- Affiliation 유틸 ---------- */
// 보기용 라벨 매핑 (없으면 적당히 Capitalize)
const AFFIL_LABELS = {
  cosmax: "COSMAX",
  amorepacific: "AMOREPACIFIC",
  shiseido: "Shiseido",
  kolma: "Kolma",
  "l’oréal": "L’Oréal",
  "l'oreal": "L’Oréal",
  "l’occitane": "L’Occitane",
  "l'occitane": "L’Occitane",
  "estee lauder": "Estee Lauder",
  chanel: "Chanel",
  lvmh: "LVMH",
};
const normalizeAff = (aff) => {
  if (!aff) return "";
  return String(aff)
    .normalize("NFKD")           // 악센트 분해
    .replace(/\p{M}+/gu, "")     // 결합 악센트 제거 (é -> e)
    .replace(/[‘’]/g, "'")       // 특수 따옴표 통일
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
};

const prettyLabel = (normKey, fallback = "") => {
  if (!normKey) return fallback;
  if (AFFIL_LABELS[normKey]) return AFFIL_LABELS[normKey];
  if (fallback) return fallback;
  return normKey.replace(/\b\p{L}/gu, (m) => m.toUpperCase());
};

// "a, b / c | d" → ["a","b","c","d"] (정규화, 중복 제거)
const toAffiliationArray = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  return String(raw)
    .split(/[,;\/|]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
};

const splitAffiliations = (raw) => {
  const entries = toAffiliationArray(raw);
  const seen = new Set();
  const tokens = [];
  for (const entry of entries) {
    const label = entry.replace(/\s+/g, " ").trim();
    const norm = normalizeAff(label);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    tokens.push({ value: norm, label: prettyLabel(norm, label) });
  }
  return tokens;
};
/* ------------------------------------- */

const normalizeSearchQuery = (input) => {
  if (!input) return "";
  return input.toLowerCase().trim().replace(/\s+/g, " ");
};

export default function PaperSite() {
  const [folders, setFolders] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [podiumMap, setPodiumMap] = useState({});

  // 폴더 내부 필터
  const [affFilter, setAffFilter] = useState("ALL"); // "ALL" | normalized
  // All Papers 전역 필터/페이지
  const [allAffFilter, setAllAffFilter] = useState("ALL");
  const [allPage, setAllPage] = useState(1);
  // 검색 상태
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [searchIndex, setSearchIndex] = useState(null); // { [paperId]: lowercased body }
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const normalizedSearch = normalizeSearchQuery(searchQuery);
  const hasSearchQuery = normalizedSearch.length > 0;
  const lastSearchLogRef = useRef({});
  const homeStateRef = useRef(false);
  const skipNextHomeLogRef = useRef(false);

  const yearGroups = useMemo(() => {
    const map = new Map();
    for (const folder of folders) {
      const year = folder.year ?? "2025";
      if (!map.has(year)) map.set(year, []);
      map.get(year).push(folder);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return map;
  }, [folders]);

  const sortedYears = useMemo(() => {
    return Array.from(yearGroups.keys()).sort((a, b) => Number(b) - Number(a));
  }, [yearGroups]);

  const yearSummaries = useMemo(() => {
    return sortedYears.map((year) => {
      const list = yearGroups.get(year) || [];
      const paperCount = list.reduce(
        (sum, folder) => sum + (folder.papers?.length ?? 0),
        0
      );
      const autoSelectSingleFolder = list.length === 1 && !list[0].folder;
      return {
        year,
        title: getYearTitle(year),
        paperCount,
        folderCount: list.length,
        autoSelectSingleFolder,
      };
    });
  }, [sortedYears, yearGroups]);

  const currentYearFolders = useMemo(() => {
    if (!selectedYear) return [];
    return yearGroups.get(selectedYear) || [];
  }, [selectedYear, yearGroups]);

  const sortedSessionFolders = useMemo(() => {
    if (!currentYearFolders?.length) return [];
    return [...currentYearFolders].sort(
      (a, b) => (b.papers?.length ?? 0) - (a.papers?.length ?? 0)
    );
  }, [currentYearFolders]);

  const getPodiumCount = (folder) =>
    folder.papers?.reduce(
      (count, paper) => count + (isPodium(paper.id) ? 1 : 0),
      0
    ) ?? 0;

  const scopedFolders = useMemo(() => {
    if (selectedYear) return currentYearFolders;
    return folders;
  }, [selectedYear, currentYearFolders, folders]);

  const autoFolderForYear = useMemo(() => {
    if (!selectedYear) return null;
    if (currentYearFolders.length === 1 && !currentYearFolders[0].folder) {
      return currentYearFolders[0];
    }
    return null;
  }, [selectedYear, currentYearFolders]);

  const isAutoFolderYear =
    Boolean(selectedYear) &&
    currentYearFolders.length === 1 &&
    !currentYearFolders[0]?.folder;

  const activeFolder = selectedFolder ?? autoFolderForYear;

  const applySearch = (inputValue, scope) => {
    const trimmed = inputValue.trim();
    setSearchQuery(trimmed);
    setSearchDraft(trimmed);
    setAllPage(1);

    const params = new URLSearchParams(window.location.search);
    if (selectedYear) params.set("year", selectedYear);
    else params.delete("year");
    const folderSlug = activeFolder?.folder || selectedFolder?.folder || "";
    if (folderSlug) params.set("folder", folderSlug);
    else params.delete("folder");
    if (trimmed) params.set("q", trimmed);
    else params.delete("q");
    params.set("apage", "1");
    window.history.pushState({}, "", params.toString() ? `?${params}` : "/");

    const logYear = activeFolder?.year ?? selectedYear ?? "";
    const logFolder = folderSlug;
    recordSearchLog({
      scope,
      year: logYear,
      folder: scope === "folder" ? logFolder : "",
      value: trimmed,
      cacheRef: lastSearchLogRef,
    });
  };

  const handleSearchSubmit = (scope) => (e) => {
    e.preventDefault();
    applySearch(searchDraft, scope);
  };

  const combinedPodiumMap = useMemo(() => {
    const map = { ...podiumMap };
    for (const folder of folders) {
      for (const paper of folder.papers || []) {
        if (paper.podium) {
          map[paper.id] = true;
        }
      }
    }
    return map;
  }, [folders, podiumMap]);

  const isPodium = (id) => {
    if (!id) return false;
    const k = String(id).trim();
    return Boolean(
      combinedPodiumMap[k] ??
        combinedPodiumMap[k.toUpperCase()] ??
        combinedPodiumMap[k.toLowerCase()]
    );
  };

  const handleSelectYear = (year) => {
    setSelectedYear(year);
    setSelectedFolder(null);
    setAffFilter("ALL");
    setAllAffFilter("ALL");
    setAllPage(1);
    const params = new URLSearchParams(window.location.search);
    params.set("year", year);
    params.delete("folder");
    params.delete("aff");
    params.delete("aaff");
    params.delete("apage");
    window.history.pushState({}, "", `?${params.toString()}`);
  };

  const handleSelectFolder = (folder) => {
    const year = folder.year ?? selectedYear ?? "2025";
    setSelectedYear(year);
    setSelectedFolder(folder);
    const params = new URLSearchParams(window.location.search);
    params.set("year", year);
    if (folder.folder) params.set("folder", folder.folder);
    else params.delete("folder");
    if (affFilter && affFilter !== "ALL") params.set("aff", affFilter);
    else params.delete("aff");
    window.history.pushState({}, "", `?${params.toString()}`);
    const existingQuery = searchQuery.trim();
    if (existingQuery) {
      recordSearchLog({
        scope: "folder",
        year,
        folder: folder.folder || "",
        value: existingQuery,
        cacheRef: lastSearchLogRef,
      });
    }
  };

  const handleBackToFolders = () => {
    setSelectedFolder(null);
    setAffFilter("ALL");
    const params = new URLSearchParams(window.location.search);
    if (selectedYear) params.set("year", selectedYear);
    else params.delete("year");
    params.delete("folder");
    params.delete("aff");
    window.history.pushState({}, "", params.toString() ? `?${params}` : "/");
  };

  const handleBackToYears = () => {
    skipNextHomeLogRef.current = true;
    setSelectedYear(null);
    setSelectedFolder(null);
    setAffFilter("ALL");
    setAllAffFilter("ALL");
    setAllPage(1);
    const params = new URLSearchParams(window.location.search);
    params.delete("year");
    params.delete("folder");
    params.delete("aff");
    params.delete("aaff");
    params.delete("apage");
    window.history.pushState({}, "", params.toString() ? `?${params}` : "/");
  };

  const handleBackOneLevel = () => {
    if (showingFolderView) {
      if (isAutoFolderYear) {
        handleBackToYears();
        return;
      }
      handleBackToFolders();
    } else if (selectedYear) {
      handleBackToYears();
    }
  };

  useEffect(() => {
    const base = import.meta.env.BASE_URL || "/";

    fetch(`${base}papers.json`)
      .then((r) => r.json())
      .then((data) => {
        setFolders(data);

        const params = new URLSearchParams(window.location.search);
        const yearParam = params.get("year");
        const folderParam = params.get("folder");
        const affParam = params.get("aff");
        const aaffParam = params.get("aaff");
        const apageParam = params.get("apage");
        const searchParam = params.get("q");

        if (folderParam) {
          const match = data.find((f) => f.folder === folderParam);
          if (match) {
            setSelectedFolder(match);
            setSelectedYear(match.year ?? "2025");
          }
        } else if (yearParam) {
          setSelectedYear(yearParam);
        }
        if (affParam) setAffFilter(affParam);
        if (aaffParam) setAllAffFilter(aaffParam);
        if (apageParam && !Number.isNaN(Number(apageParam))) {
          setAllPage(Math.max(1, Number(apageParam)));
        }
        if (searchParam !== null) {
          setSearchQuery(searchParam);
          setSearchDraft(searchParam);
        }
      });

    fetch(`${base}podium.json`)
      .then((r) => r.json())
      .then(setPodiumMap);
  }, []);

  useEffect(() => {
    const isHome = !selectedYear && !selectedFolder;
    const wasHome = homeStateRef.current;
    if (isHome) {
      if (skipNextHomeLogRef.current) {
        skipNextHomeLogRef.current = false;
      } else if (!wasHome) {
        logHomeVisit();
      }
    }
    homeStateRef.current = isHome;
  }, [selectedYear, selectedFolder]);

  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const yearParam = params.get("year");
      const folderParam = params.get("folder");
      const affParam = params.get("aff");
      const aaffParam = params.get("aaff");
      const apageParam = params.get("apage");
      const searchParam = params.get("q");

      if (folderParam) {
        const match = folders.find((f) => f.folder === folderParam);
        if (match) {
          setSelectedFolder(match);
          setSelectedYear(match.year ?? "2025");
        } else {
          setSelectedFolder(null);
          setSelectedYear(yearParam);
        }
      } else {
        setSelectedFolder(null);
        setSelectedYear(yearParam);
      }

      setAffFilter(affParam || "ALL");
      setAllAffFilter(aaffParam || "ALL");
      setAllPage(apageParam ? Math.max(1, Number(apageParam)) : 1);
      const synced = searchParam ?? "";
      setSearchQuery(synced);
      setSearchDraft(synced);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [folders]);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    if (!activeFolder) return;
    const logYear = activeFolder.year ?? selectedYear ?? "";
    const logFolder = activeFolder.folder || "";
    recordSearchLog({
      scope: "folder",
      year: logYear,
      folder: logFolder,
      value: trimmed,
      cacheRef: lastSearchLogRef,
    });
  }, [activeFolder, selectedYear, searchQuery]);

  useEffect(() => {
    if (!hasSearchQuery || searchIndex) return;
    let cancelled = false;
    const controller = new AbortController();
    const base = import.meta.env.BASE_URL || "/";
    setSearchLoading(true);
    setSearchError("");

    fetch(`${base}papers-search.json`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load PDF search index");
        return r.json();
      })
      .then((payload) => {
        if (cancelled) return;
        const map = {};
        for (const doc of payload?.papers || []) {
          if (!doc?.id) continue;
          map[doc.id] = normalizeSearchQuery(doc.text || "");
        }
        setSearchIndex(map);
      })
      .catch((err) => {
        if (cancelled || err.name === "AbortError") return;
        console.error(err);
        setSearchError("PDF 본문 데이터를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!cancelled) setSearchLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [hasSearchQuery, searchIndex]);

  /* ---------- 폴더 내부 옵션/필터/표시 (다중 소속 대응) ---------- */
  const matchesSearch = useMemo(() => {
    if (!hasSearchQuery) {
      return () => true;
    }
    return (paper) => {
      const title = paper.title?.toLowerCase() ?? "";
      if (title.includes(normalizedSearch)) return true;
      const body = searchIndex?.[paper.id];
      if (!body) return false;
      return body.includes(normalizedSearch);
    };
  }, [hasSearchQuery, normalizedSearch, searchIndex]);

  const affOptions = useMemo(() => {
    if (!activeFolder?.papers) return [];
    const counts = new Map(); // key: normalized → {count, label}
    for (const p of activeFolder.papers) {
      const toks = splitAffiliations(p.affiliation);
      for (const token of toks) {
        const prev = counts.get(token.value);
        counts.set(token.value, {
          count: (prev?.count ?? 0) + 1,
          label: token.label,
        });
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => {
        if (b[1].count !== a[1].count) return b[1].count - a[1].count;
        return a[1].label.localeCompare(b[1].label);
      })
      .map(([value, { count, label }]) => ({ value, label: `${label} (${count})` }));
  }, [activeFolder]);

  const sortedPapers = useMemo(() => {
    if (!activeFolder?.papers) return [];
    const filtered = activeFolder.papers.filter((p) => {
      if (affFilter !== "ALL") {
        const toks = splitAffiliations(p.affiliation);
        if (!toks.some((t) => t.value === affFilter)) return false;
      }
      return matchesSearch(p);
    });

    return filtered
      .map((p, idx) => ({ p, idx, podium: isPodium(p.id) ? 1 : 0 }))
      .sort((a, b) => {
        if (b.podium !== a.podium) return b.podium - a.podium;
        return a.idx - b.idx;
      })
      .map((x) => x.p);
  }, [activeFolder, podiumMap, affFilter, matchesSearch]);
  /* ---------------------------------------------------------- */

  /* ---------- All Papers 옵션/필터/표시 (다중 소속 대응) ---------- */
  const allPapersFlat = useMemo(() => {
    if (!scopedFolders?.length) return [];
    let idx = 0;
    const acc = [];
    for (const f of scopedFolders) {
      const entryYear = f.year ?? "2025";
      for (const p of f.papers || []) {
        acc.push({
          p,
          folder: f.folder,
          year: entryYear,
          folderName: f.name,
          idx: idx++,
          podium: isPodium(p.id) ? 1 : 0,
        });
      }
    }
    return acc.sort((a, b) => {
      if (b.podium !== a.podium) return b.podium - a.podium;
      return a.idx - b.idx;
    });
  }, [scopedFolders, podiumMap]);

  const allAffOptions = useMemo(() => {
    const counts = new Map();
    for (const { p } of allPapersFlat) {
      const toks = splitAffiliations(p.affiliation);
      for (const token of toks) {
        const prev = counts.get(token.value);
        counts.set(token.value, {
          count: (prev?.count ?? 0) + 1,
          label: token.label,
        });
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => {
        if (b[1].count !== a[1].count) return b[1].count - a[1].count;
        return a[1].label.localeCompare(b[1].label);
      })
      .map(([value, { count, label }]) => ({ value, label: `${label} (${count})` }));
  }, [allPapersFlat]);

  const allPapersFiltered = useMemo(() => {
    return allPapersFlat.filter(({ p }) => {
      if (allAffFilter !== "ALL") {
        const toks = splitAffiliations(p.affiliation);
        if (!toks.some((t) => t.value === allAffFilter)) return false;
      }
      return matchesSearch(p);
    });
  }, [allPapersFlat, allAffFilter, matchesSearch]);

  const allTotalPages = Math.max(1, Math.ceil(allPapersFiltered.length / PAGE_SIZE));
  const allPageSafe = Math.min(Math.max(1, allPage), allTotalPages);
  const allPagedSlice = useMemo(() => {
    const start = (allPageSafe - 1) * PAGE_SIZE;
    return allPapersFiltered.slice(start, start + PAGE_SIZE);
  }, [allPapersFiltered, allPageSafe]);
  /* ---------------------------------------------------------- */

  // 폴더 내부 드롭다운 변경 시 URL 반영
  const onChangeAff = (e) => {
    const v = e.target.value;
    setAffFilter(v);
    const params = new URLSearchParams(window.location.search);
    if (selectedYear) params.set("year", selectedYear);
    else params.delete("year");
    const folderSlug = selectedFolder?.folder ?? activeFolder?.folder;
    if (folderSlug) params.set("folder", folderSlug);
    else params.delete("folder");
    if (v && v !== "ALL") params.set("aff", v);
    else params.delete("aff");
    window.history.pushState({}, "", `?${params.toString()}`);
    if (activeFolder || selectedYear) {
      logAffiliationEvent({
        year: activeFolder?.year ?? selectedYear ?? "",
        folder: activeFolder?.folder ?? "",
        value: v,
        scope: "folder",
      });
    }
  };

  // All Papers 드롭다운 변경 시 URL 반영 + 페이지 초기화
  const onChangeAllAff = (e) => {
    const v = e.target.value;
    setAllAffFilter(v);
    const params = new URLSearchParams(window.location.search);
    if (selectedYear) params.set("year", selectedYear);
    else params.delete("year");
    if (v && v !== "ALL") params.set("aaff", v);
    else params.delete("aaff");
    params.set("apage", "1");
    setAllPage(1);
    window.history.pushState({}, "", `?${params.toString()}`);
    logAffiliationEvent({
      year: selectedYear ?? "",
      folder: "",
      value: v,
      scope: "all",
    });
  };

  const gotoAllPage = (page) => {
    const next = Math.min(Math.max(1, page), allTotalPages);
    setAllPage(next);
    const params = new URLSearchParams(window.location.search);
    if (selectedYear) params.set("year", selectedYear);
    else params.delete("year");
    params.set("apage", String(next));
    if (allAffFilter && allAffFilter !== "ALL") params.set("aaff", allAffFilter);
    else params.delete("aaff");
    window.history.pushState({}, "", `?${params.toString()}`);
  };

  const onSearchInputChange = (e) => {
    setSearchDraft(e.target.value);
  };

  const searchStatusMessage = useMemo(() => {
    if (!hasSearchQuery) return "";
    if (searchLoading) return "PDF 본문 데이터를 불러오는 중입니다...";
    if (searchError) return `${searchError} 새로고침 후 다시 시도해주세요.`;
    if (searchIndex) return `제목/본문에서 "${searchQuery.trim()}" 검색 중입니다.`;
    return "본문 데이터 준비 중이라 현재는 제목만 검색됩니다.";
  }, [hasSearchQuery, searchLoading, searchError, searchIndex, searchQuery]);

  const searchStatusColor = searchError ? "text-red-600" : "text-gray-500";

  const Pagination = ({ page, total, onChange }) => {
    if (total <= 1) return null;
    const windowSize = 7;
    let start = Math.max(1, page - Math.floor(windowSize / 2));
    let end = start + windowSize - 1;
    if (end > total) {
      end = total;
      start = Math.max(1, end - windowSize + 1);
    }
    const pages = [];
    for (let i = start; i <= end; i++) pages.push(i);

    return (
      <div className="flex items-center justify-center gap-2 mt-4">
        <button onClick={() => onChange(page - 1)} disabled={page <= 1}
          className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50">Prev</button>
        {start > 1 && (
          <>
            <button onClick={() => onChange(1)}
              className={`px-3 py-1 text-sm border rounded-lg ${page === 1 ? "bg-indigo-600 text-white" : ""}`}>1</button>
            {start > 2 && <span className="px-1">…</span>}
          </>
        )}
        {pages.map((n) => (
          <button key={n} onClick={() => onChange(n)}
            className={`px-3 py-1 text-sm border rounded-lg ${page === n ? "bg-indigo-600 text-white" : ""}`}>
            {n}
          </button>
        ))}
        {end < total && (
          <>
            {end < total - 1 && <span className="px-1">…</span>}
            <button onClick={() => onChange(total)}
              className={`px-3 py-1 text-sm border rounded-lg ${page === total ? "bg-indigo-600 text-white" : ""}`}>{total}</button>
          </>
        )}
        <button onClick={() => onChange(page + 1)} disabled={page >= total}
          className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50">Next</button>
      </div>
    );
  };

  const showingYearGrid = !selectedYear;
  const showingFolderView = Boolean(activeFolder);
  const showSessionsList = Boolean(selectedYear) && !showingFolderView;
  const showSessionsTable =
    showSessionsList &&
    selectedYear !== "2022" &&
    selectedYear !== "2024";
  const headerTitle = getYearTitle(selectedYear);

  return (
    <div className="min-h-screen w-full">
      <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12">

        <header className="w-full bg-white rounded-2xl shadow-lg mt-4 sm:mt-6 p-6 sm:p-8 mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-indigo-900 text-center leading-tight">
            {headerTitle}
          </h1>
          <p className="text-center text-gray-600 mt-2 text-sm sm:text-base lg:text-lg">
            International Federation of Societies of Cosmetic Chemists
          </p>
          <div className="mt-4 flex justify-end">
            <p className="text-[12px] text-gray-400 text-right max-w-xs">
              신규 논문 등록을 원하시는 분은 DA팀 유소영 사원에게 연락 바랍니다.
            </p>
          </div>
          {selectedYear && (
            <div className="flex justify-center mt-4">
              <button
                onClick={handleBackToYears}
                className="inline-flex items-center justify-center px-4 py-2 text-sm sm:text-base border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50 transition-colors"
              >
                Home으로 돌아가기
              </button>
            </div>
          )}
        </header>

        <main className="w-full bg-white rounded-2xl shadow-lg p-4 sm:p-6 md:p-8">
          {selectedYear && (
            <div className="flex justify-start mb-4 sm:mb-6">
              <button
                onClick={handleBackOneLevel}
                className="inline-flex items-center text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 mr-1" />
                <span className="text-sm sm:text-base">Back to Page</span>
              </button>
            </div>
          )}

          {showingYearGrid && (
            <section>
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4 sm:mb-6">
                Years
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {yearSummaries.map((summary) => (
                  <button
                    key={summary.year}
                    onClick={() => handleSelectYear(summary.year)}
                    className="w-full text-left border border-gray-200 bg-white rounded-lg px-4 py-3 hover:border-indigo-400 hover:bg-indigo-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Folder className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                        <p className="text-sm sm:text-base font-semibold text-gray-800 leading-tight line-clamp-1">
                          {summary.title}
                        </p>
                      </div>
                      <span className="text-xs sm:text-sm text-gray-600 font-medium">
                        {summary.paperCount} papers
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {showingFolderView && (
            <section className="mt-8 sm:mt-10">

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">{selectedYear}</p>
                  <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">
                    {activeFolder?.folder
                      ? activeFolder.name
                      : `All Papers (${selectedYear || activeFolder?.year || "All"})`}
                  </h2>
                  {isAutoFolderYear && searchStatusMessage && (
                    <p className={`mt-1 text-xs sm:text-sm ${searchStatusColor}`}>
                      {searchStatusMessage}
                    </p>
                  )}
                </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
                <form
                  onSubmit={handleSearchSubmit("folder")}
                  className="relative w-full sm:w-[24rem]"
                >
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="search"
                      value={searchDraft}
                      onChange={onSearchInputChange}
                      placeholder="제목 또는 본문 검색"
                      aria-label="폴더 검색어 입력"
                      className="w-full pl-9 pr-14 py-2 border border-gray-300 rounded-lg text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="submit"
                      className="absolute right-1 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs sm:text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                    >
                      검색
                    </button>
                  </form>

                <select
                  value={affFilter}
                  onChange={onChangeAff}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg text-sm sm:text-base bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">All affiliations</option>
                  {affOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {!isAutoFolderYear && searchStatusMessage && (
                <p className={`text-xs sm:text-sm ${searchStatusColor}`}>
                  {searchStatusMessage}
                </p>
              )}
            </div>

              <div className="space-y-3 sm:space-y-4">
                {sortedPapers.map((paper) => {
                  const folderYear = activeFolder?.year ?? selectedYear ?? "2025";
                  const tokens = splitAffiliations(paper.affiliation);
                  const podium = isPodium(paper.id);
                  return (
                    <div
                      key={`${activeFolder?.folder || "root"}__${paper.id}`}
                      className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start sm:items-center flex-1 min-w-0">
                        <FileText className="w-6 h-6 text-red-500 mr-3 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <YearBadge value={folderYear} />
                            <span className="text-xs sm:text-sm text-gray-500">
                              {paper.id}
                            </span>
                            {podium && (
                              <Award className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                            )}
                          </div>
                          <span className="block text-gray-800 text-sm sm:text-base lg:text-lg leading-snug line-clamp-2">
                            {paper.title}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 sm:gap-3 flex-wrap">
                        {tokens.map((token) => (
                          <span
                            key={token.value}
                            title={token.label}
                            className="px-2 py-1 text-xs sm:text-sm bg-gray-100 text-gray-700 rounded-md border border-gray-200 max-w-[40vw] truncate"
                          >
                            {token.label}
                          </span>
                        ))}
                        <button
                          onClick={() =>
                            logAndOpen(
                              activeFolder?.year ?? selectedYear ?? "2025",
                              activeFolder?.folder || "",
                              paper
                            )
                          }
                          className="flex items-center justify-center px-4 py-2 sm:px-5 sm:py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors w-full sm:w-auto"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          <span className="text-sm sm:text-base">Download</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {sortedPapers.length === 0 && (
                  <div className="text-center text-gray-500 py-10">
                    {hasSearchQuery ? "검색 결과가 없습니다." : "표시할 논문이 없습니다."}
                  </div>
                )}
              </div>
            </section>
          )}

          {!showingFolderView && showSessionsTable && (
            <section className="mt-8 sm:mt-10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">
                  Sessions
                </h2>
                <p className="text-xs sm:text-sm text-gray-500">
                  세션을 클릭하면 해당 폴더로 이동합니다.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                {sortedSessionFolders.map((folder) => (
                  <button
                    key={`${folder.year}-${folder.folder || "root"}`}
                    onClick={() => handleSelectFolder(folder)}
                    className="group flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm hover:-translate-y-0.5 hover:border-indigo-400 hover:shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <Folder className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-indigo-900">
                          {folder.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {folder.papers.length} papers
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs sm:text-sm font-medium text-gray-600">
                      <span className="flex items-center gap-1 text-yellow-600">
                        <Award className="w-4 h-4" />
                        {getPodiumCount(folder)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {!showingFolderView && (
            <section className="mt-8 sm:mt-10">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">
                  {selectedYear ? `All Papers (${selectedYear})` : "All Papers (All Years)"}
                </h2>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto">
                <form
                  onSubmit={handleSearchSubmit("all")}
                  className="relative w-full sm:w-[27rem]"
                >
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="search"
                      value={searchDraft}
                      onChange={onSearchInputChange}
                      placeholder="제목 또는 본문 검색"
                      aria-label="검색어 입력"
                      className="w-full pl-9 pr-14 py-2 border border-gray-300 rounded-lg text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="submit"
                      className="absolute right-1 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs sm:text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                    >
                      검색
                    </button>
                  </form>

                  <select
                    value={allAffFilter}
                    onChange={onChangeAllAff}
                    className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg text-sm sm:text-base bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ALL">All affiliations</option>
                    {allAffOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {searchStatusMessage && (
                <p className={`text-xs sm:text-sm mb-3 ${searchStatusColor}`}>
                  {searchStatusMessage}
                </p>
              )}

              <div className="space-y-3 sm:space-y-4">
                {allPagedSlice.map(({ p: paper, folder, year }) => {
                  const entryYear = year ?? selectedYear ?? "2025";
                  const podium = isPodium(paper.id);
                  const tokens = splitAffiliations(paper.affiliation);
                  return (
                    <div
                      key={`${year || selectedYear || "all"}__${folder || "root"}__${paper.id}`}
                      className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start sm:items-center flex-1 min-w-0">
                        <FileText className="w-6 h-6 text-red-500 mr-3 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <YearBadge value={entryYear} />
                              <span className="text-xs sm:text-sm text-gray-500">
                                {paper.id}
                              </span>
                            {podium && (
                              <Award className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                            )}
                          </div>
                          <span className="block text-gray-800 text-sm sm:text-base lg:text-lg leading-snug line-clamp-2">
                            {paper.title}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 sm:gap-3 flex-wrap">
                        {tokens.map((token) => (
                          <span
                            key={token.value}
                            title={token.label}
                            className="px-2 py-1 text-xs sm:text-sm bg-gray-100 text-gray-700 rounded-md border border-gray-200 max-w-[40vw] truncate"
                          >
                            {token.label}
                          </span>
                        ))}
                        <button
                          onClick={() =>
                            logAndOpen(year ?? selectedYear ?? "2025", folder || "", paper)
                          }
                          className="flex items-center justify-center px-4 py-2 sm:px-5 sm:py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors w-full sm:w-auto"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          <span className="text-sm sm:text-base">Download</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {allPagedSlice.length === 0 && (
                  <div className="text-center text-gray-500 py-10">
                    {hasSearchQuery ? "검색 결과가 없습니다." : "표시할 논문이 없습니다."}
                  </div>
                )}
              </div>

              <Pagination
                page={allPageSafe}
                total={allTotalPages}
                onChange={gotoAllPage}
              />
            </section>
          )}
        </main>

      </div>
    </div>
  );
}

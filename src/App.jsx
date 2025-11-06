import React, { useEffect, useMemo, useState } from "react";
import { Folder, FileText, Download, ChevronLeft, Award } from "lucide-react";

const LOG_URL =
  "https://script.google.com/macros/s/AKfycbw293prF5n3ggPR64puvjtSgdVsIza1lXAl6EPQclpaKXkU5Puy5u4E_Zm67RitJ6g6rw/exec";

const PAGE_SIZE = 10;

const buildPdfPath = (folder, filename) => {
  const base = import.meta.env.BASE_URL || "/";
  return `${base}papers/${encodeURIComponent(folder)}/${encodeURIComponent(filename)}`;
};

const logAndOpen = (folder, paper) => {
  const href = buildPdfPath(folder, paper.filename);

  const payload = {
    paper_id: paper.id,
    title: paper.title,
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

  try {
    const img = new Image();
    img.src = `${LOG_URL}?${new URLSearchParams(payload).toString()}`;
  } catch (_) {}

  window.open(href, "_blank", "noopener");
};

/* ---------- Affiliation 유틸 ---------- */
// 보기용 라벨 매핑 (없으면 적당히 Capitalize)
const AFFIL_LABELS = {
  "cosmax": "COSMAX",
  "amorepacific": "AMOREPACIFIC",
  "shiseido": "Shiseido",
  "kolma": "Kolma",
  "l’oréal": "L’Oréal",
  "l'oreal": "L’Oréal",
  "l’occitane": "L’Occitane",
  "l'occitane": "L’Occitane",
};

const normalizeAff = (aff) => {
  if (!aff) return "";
  return String(aff)
    .normalize("NFKC")      // 유니코드 정규화
    .replace(/[‘’]/g, "'")  // 특수 따옴표 정규화
    .replace(/[“”]/g, '"')
    .trim()
    .toLowerCase();
};

const prettyLabel = (normKey) => {
  if (!normKey) return "";
  return AFFIL_LABELS[normKey] || normKey.replace(/\b[a-z]/g, (m) => m.toUpperCase());
};

// "a, b / c | d" → ["a","b","c","d"] (정규화, 중복 제거)
const splitAffiliations = (raw) => {
  if (!raw) return [];
  const arr = String(raw)
    .split(/[,;\/|]+/g)
    .map((s) => normalizeAff(s))
    .filter(Boolean);
  return Array.from(new Set(arr));
};
/* ------------------------------------- */

const renderAffiliation = (aff) => {
  if (!aff) return null;
  const key = normalizeAff(aff);
  return prettyLabel(key) || aff;
};

export default function PaperSite() {
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [podiumMap, setPodiumMap] = useState({});

  // 폴더 내부 필터
  const [affFilter, setAffFilter] = useState("ALL"); // "ALL" | normalized
  // All Papers 전역 필터/페이지
  const [allAffFilter, setAllAffFilter] = useState("ALL");
  const [allPage, setAllPage] = useState(1);

  const isPodium = (id) => {
    if (!id) return false;
    const k = String(id).trim();
    return Boolean(
      podiumMap[k] ?? podiumMap[k.toUpperCase()] ?? podiumMap[k.toLowerCase()]
    );
  };

  const handleSelectFolder = (folder) => {
    setSelectedFolder(folder);
    const params = new URLSearchParams(window.location.search);
    params.set("folder", folder.folder);
    if (affFilter && affFilter !== "ALL") params.set("aff", affFilter);
    else params.delete("aff");
    window.history.pushState({}, "", `?${params.toString()}`);
  };

  const handleBack = () => {
    setSelectedFolder(null);
    setAffFilter("ALL");
    const params = new URLSearchParams(window.location.search);
    params.delete("folder");
    params.delete("aff");
    window.history.pushState({}, "", params.toString() ? `?${params}` : "/");
  };

  useEffect(() => {
    const base = import.meta.env.BASE_URL || "/";

    fetch(`${base}papers.json`)
      .then((r) => r.json())
      .then((data) => {
        setFolders(data);

        const params = new URLSearchParams(window.location.search);
        const folderParam = params.get("folder");
        const affParam = params.get("aff");
        const aaffParam = params.get("aaff");
        const apageParam = params.get("apage");

        if (folderParam) {
          const match = data.find((f) => f.folder === folderParam);
          if (match) setSelectedFolder(match);
        }
        if (affParam) setAffFilter(affParam);
        if (aaffParam) setAllAffFilter(aaffParam);
        if (apageParam && !Number.isNaN(Number(apageParam))) {
          setAllPage(Math.max(1, Number(apageParam)));
        }
      });

    const base2 = import.meta.env.BASE_URL || "/";
    fetch(`${base2}podium.json`)
      .then((r) => r.json())
      .then(setPodiumMap);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const folderParam = params.get("folder");
      const affParam = params.get("aff");
      const aaffParam = params.get("aaff");
      const apageParam = params.get("apage");

      if (!folderParam) setSelectedFolder(null);
      else {
        const match = folders.find((f) => f.folder === folderParam);
        setSelectedFolder(match || null);
      }

      setAffFilter(affParam || "ALL");
      setAllAffFilter(aaffParam || "ALL");
      setAllPage(apageParam ? Math.max(1, Number(apageParam)) : 1);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [folders]);

  /* ---------- 폴더 내부 옵션/필터/표시 (다중 소속 대응) ---------- */
  const affOptions = useMemo(() => {
    if (!selectedFolder?.papers) return [];
    const counts = new Map(); // key: normalized → {count, label}
    for (const p of selectedFolder.papers) {
      const toks = splitAffiliations(p.affiliation);
      const uniq = new Set(toks);
      for (const key of uniq) {
        const prev = counts.get(key);
        counts.set(key, { count: (prev?.count ?? 0) + 1, label: prettyLabel(key) });
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => a[1].label.localeCompare(b[1].label))
      .map(([value, { count, label }]) => ({ value, label: `${label} (${count})` }));
  }, [selectedFolder]);

  const sortedPapers = useMemo(() => {
    if (!selectedFolder?.papers) return [];
    const filtered = selectedFolder.papers.filter((p) => {
      if (affFilter === "ALL") return true;
      const toks = splitAffiliations(p.affiliation);
      return toks.includes(affFilter); // OR 매칭
    });

    return filtered
      .map((p, idx) => ({ p, idx, podium: isPodium(p.id) ? 1 : 0 }))
      .sort((a, b) => {
        if (b.podium !== a.podium) return b.podium - a.podium;
        return a.idx - b.idx;
      })
      .map((x) => x.p);
  }, [selectedFolder, podiumMap, affFilter]);
  /* ---------------------------------------------------------- */

  /* ---------- All Papers 옵션/필터/표시 (다중 소속 대응) ---------- */
  const allPapersFlat = useMemo(() => {
    if (!folders?.length) return [];
    let idx = 0;
    const acc = [];
    for (const f of folders) {
      for (const p of f.papers || []) {
        acc.push({
          p,
          folder: f.folder,
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
  }, [folders, podiumMap]);

  const allAffOptions = useMemo(() => {
    const counts = new Map();
    for (const { p } of allPapersFlat) {
      const toks = splitAffiliations(p.affiliation);
      const uniq = new Set(toks);
      for (const key of uniq) {
        const prev = counts.get(key);
        counts.set(key, { count: (prev?.count ?? 0) + 1, label: prettyLabel(key) });
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => a[1].label.localeCompare(b[1].label))
      .map(([value, { count, label }]) => ({ value, label: `${label} (${count})` }));
  }, [allPapersFlat]);

  const allPapersFiltered = useMemo(() => {
    if (allAffFilter === "ALL") return allPapersFlat;
    return allPapersFlat.filter(({ p }) =>
      splitAffiliations(p.affiliation).includes(allAffFilter)
    );
  }, [allPapersFlat, allAffFilter]);

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
    if (selectedFolder) params.set("folder", selectedFolder.folder);
    if (v && v !== "ALL") params.set("aff", v);
    else params.delete("aff");
    window.history.pushState({}, "", `?${params.toString()}`);
  };

  // All Papers 드롭다운 변경 시 URL 반영 + 페이지 초기화
  const onChangeAllAff = (e) => {
    const v = e.target.value;
    setAllAffFilter(v);
    const params = new URLSearchParams(window.location.search);
    if (v && v !== "ALL") params.set("aaff", v);
    else params.delete("aaff");
    params.set("apage", "1");
    setAllPage(1);
    window.history.pushState({}, "", `?${params.toString()}`);
  };

  const gotoAllPage = (page) => {
    const next = Math.min(Math.max(1, page), allTotalPages);
    setAllPage(next);
    const params = new URLSearchParams(window.location.search);
    params.set("apage", String(next));
    if (allAffFilter && allAffFilter !== "ALL") params.set("aaff", allAffFilter);
    else params.delete("aaff");
    window.history.pushState({}, "", `?${params.toString()}`);
  };

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

  return (
    <div className="min-h-screen w-full">
      <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12">

        <header className="w-full bg-white rounded-2xl shadow-lg mt-4 sm:mt-6 p-6 sm:p-8 mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-indigo-900 text-center leading-tight">
            IFSCC 2025 Full Paper
          </h1>
          <p className="text-center text-gray-600 mt-2 text-sm sm:text-base lg:text-lg">
            International Federation of Societies of Cosmetic Chemists
          </p>
        </header>

        <main className="w-full bg-white rounded-2xl shadow-lg p-4 sm:p-6 md:p-8">
          {!selectedFolder ? (
            <>
              {/* Sessions 섹션 */}
              <section>
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4 sm:mb-6">
                  Sessions
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-6 4xl:grid-cols-8 gap-4">
                  {folders.map((folder) => (
                    <button
                      key={folder.folder}
                      onClick={() => handleSelectFolder(folder)}
                      className="flex items-center w-full p-4 sm:p-6 border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all"
                    >
                      <Folder className="w-10 h-10 sm:w-12 sm:h-12 text-indigo-600 mr-3 sm:mr-4 flex-shrink-0" />
                      <div className="text-left min-w-0">
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-800 truncate">
                          {folder.name}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-500">
                          {folder.papers.length} papers
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              {/* All Papers 섹션 */}
              <section className="mt-8 sm:mt-10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">
                    All Papers
                  </h2>

                  {/* 전역 affiliation 필터 (단일 소속 리스트) */}
                  <div className="flex items-center gap-2">
                    <label htmlFor="allAffFilter" className="text-sm text-gray-600">
                      Affiliation
                    </label>
                    <select
                      id="allAffFilter"
                      value={allAffFilter}
                      onChange={onChangeAllAff}
                      className="text-sm sm:text-base border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

                <div className="space-y-3 sm:space-y-4">
                  {allPagedSlice.map(({ p: paper, folder }) => {
                    const podium = isPodium(paper.id);
                    const tokens = splitAffiliations(paper.affiliation);
                    return (
                      <div
                        key={`${folder}__${paper.id}`}
                        className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                      >
                        {/* 왼쪽: 아이콘 + 정보 */}
                        <div className="flex items-start sm:items-center flex-1 min-w-0">
                          <FileText className="w-6 h-6 text-red-500 mr-3 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
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

                        {/* 오른쪽: affiliation 여러 개 뱃지 + 다운로드 버튼 */}
                        <div className="flex items-center justify-end gap-2 sm:gap-3 flex-wrap">
                          {tokens.map((t) => (
                            <span
                              key={t}
                              title={prettyLabel(t)}
                              className="px-2 py-1 text-xs sm:text-sm bg-gray-100 text-gray-700 rounded-md border border-gray-200 max-w-[40vw] truncate"
                            >
                              {prettyLabel(t)}
                            </span>
                          ))}
                          <button
                            onClick={() => logAndOpen(folder, paper)}
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
                      표시할 논문이 없습니다.
                    </div>
                  )}
                </div>

                {/* 페이지네이션 */}
                <Pagination
                  page={allPageSafe}
                  total={allTotalPages}
                  onChange={gotoAllPage}
                />
              </section>
            </>
          ) : (
            // 폴더 내부 뷰
            <section>
              <button
                onClick={handleBack}
                className="flex items-center text-indigo-600 hover:text-indigo-800 mb-4 sm:mb-6 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 mr-1" />
                <span className="text-sm sm:text-base">Back to Categories</span>
              </button>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">
                  {selectedFolder.name}
                </h2>

                {/* 폴더 내부 affiliation 필터 (단일 소속 리스트) */}
                <div className="flex items-center gap-2">
                  <label htmlFor="affFilter" className="text-sm text-gray-600">
                    Affiliation
                  </label>
                  <select
                    id="affFilter"
                    value={affFilter}
                    onChange={onChangeAff}
                    className="text-sm sm:text-base border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ALL">All affiliations</option>
                    {affOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {sortedPapers.map((paper) => {
                  const tokens = splitAffiliations(paper.affiliation);
                  return (
                    <div
                      key={paper.id}
                      className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      {/* 왼쪽: 아이콘 + 정보 */}
                      <div className="flex items-start sm:items-center flex-1 min-w-0">
                        <FileText className="w-6 h-6 text-red-500 mr-3 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs sm:text-sm text-gray-500">
                              {paper.id}
                            </span>
                            {isPodium(paper.id) && (
                              <Award className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                            )}
                          </div>
                          <span className="block text-gray-800 text-sm sm:text-base lg:text-lg leading-snug line-clamp-2">
                            {paper.title}
                          </span>
                        </div>
                      </div>

                      {/* 오른쪽: affiliation 여러 개 뱃지 + 다운로드 버튼 */}
                      <div className="flex items-center justify-end gap-2 sm:gap-3 flex-wrap">
                        {tokens.map((t) => (
                          <span
                            key={t}
                            title={prettyLabel(t)}
                            className="px-2 py-1 text-xs sm:text-sm bg-gray-100 text-gray-700 rounded-md border border-gray-200 max-w-[40vw] truncate"
                          >
                            {prettyLabel(t)}
                          </span>
                        ))}
                        <button
                          onClick={() => logAndOpen(selectedFolder.folder, paper)}
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
                    해당 affiliation의 논문이 없습니다.
                  </div>
                )}
              </div>
            </section>
          )}
        </main>

        <footer className="text-center mt-6 sm:mt-8 mb-6 text-gray-600">
          <p className="text-xs sm:text-sm">
            © 2025 COSMAX. Internal research tool for IFSCC paper reference.
          </p>
        </footer>
      </div>
    </div>
  );
}



import React, { useEffect, useState } from "react";
import { Folder, FileText, Download, ChevronLeft, Award } from "lucide-react";

// Apps Script 웹앱 URL
const LOG_URL =
  "https://script.google.com/macros/s/AKfycbw293prF5n3ggPR64puvjtSgdVsIza1lXAl6EPQclpaKXkU5Puy5u4E_Zm67RitJ6g6rw/exec";

const buildPdfPath = (folder, filename) => {
  const base = import.meta.env.BASE_URL || "/";
  return `${base}papers/${encodeURIComponent(folder)}/${encodeURIComponent(filename)}`;
};

// 같은 파일을 연속 클릭할 때 중복 카운트 방지(2초 내 중복 제거)
const dedupe = (paperId) => {
  const key = `dl:${paperId}`;
  const last = Number(localStorage.getItem(key) || 0);
  const now = Date.now();
  if (now - last < 2000) return true;
  localStorage.setItem(key, String(now));
  return false;
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
    const body = new URLSearchParams(payload).toString();
    const blob = new Blob([body], { type: "application/x-www-form-urlencoded" });
    navigator.sendBeacon(LOG_URL, blob);
  } catch (_) {}

  try {
    const img = new Image();
    img.src = `${LOG_URL}?${new URLSearchParams(payload).toString()}`;
  } catch (_) {}

  window.open(href, "_blank", "noopener");
};

export default function PaperSite() {
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL || "/"}papers.json`)
      .then((r) => r.json())
      .then(setFolders)
      .catch((e) => console.error("Failed to load papers.json", e));
  }, []);

  return (
    // ✅ 화면 가로폭을 그대로 쓰도록 w-screen
    <div className="min-h-screen w-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* ✅ 어떤 max-width도 걸리지 않게 max-w-none, 좌우 패딩만 부여 */}
      <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 2xl:px-12 3xl:px-16 4xl:px-20">
        {/* 헤더: 폭 제한 제거 */}
        <header className="w-full bg-white rounded-2xl shadow-lg mt-4 sm:mt-6 p-6 sm:p-8 mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-indigo-900 text-center leading-tight">
            IFSCC 2025 Full Paper
          </h1>
          <p className="text-center text-gray-600 mt-2 text-sm sm:text-base lg:text-lg">
            International Federation of Societies of Cosmetic Chemists
          </p>
        </header>

        {/* 메인 패널: 폭 제한 제거 */}
        <main className="w-full bg-white rounded-2xl shadow-lg p-4 sm:p-6 md:p-8">
          {!selectedFolder ? (
            <section>
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4 sm:mb-6">
                Categories
              </h2>

              {/* ✅ 초대형 모니터에서도 계속 펼쳐지도록 칼럼 확장 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-6 4xl:grid-cols-8 gap-4">
                {folders.map((folder) => (
                  <button
                    key={folder.folder}
                    onClick={() => setSelectedFolder(folder)}
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
          ) : (
            <section>
              <button
                onClick={() => setSelectedFolder(null)}
                className="flex items-center text-indigo-600 hover:text-indigo-800 mb-4 sm:mb-6 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 mr-1" />
                <span className="text-sm sm:text-base">Back to Categories</span>
              </button>

              <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4 sm:mb-6">
                {selectedFolder.name}
              </h2>

              <div className="space-y-3 sm:space-y-4">
                {selectedFolder.papers.map((paper) => (
                  // ✅ 각 행도 전체 너비로 확장
                  <div
                    key={paper.id}
                    className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start sm:items-center flex-1 min-w-0">
                      <FileText className="w-6 h-6 text-red-500 mr-3 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs sm:text-sm text-gray-500">{paper.id}</span>
                          {paper.podium && <Award className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
                        </div>
                        <span className="block text-gray-800 text-sm sm:text-base lg:text-lg leading-snug line-clamp-2">
                          {paper.title}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => logAndOpen(selectedFolder.folder, paper)}
                      className="flex items-center justify-center px-4 py-2 sm:px-5 sm:py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors w-full sm:w-auto"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      <span className="text-sm sm:text-base">Download</span>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>

        <footer className="text-center mt-6 sm:mt-8 mb-6 text-gray-600">
          <p className="text-xs sm:text-sm">© 2025 IFSCC Conference | All Rights Reserved</p>
        </footer>
      </div>
    </div>
  );
}

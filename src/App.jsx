import React, { useEffect, useState } from "react";
import { Folder, FileText, Download, ChevronLeft, Award } from "lucide-react";

const buildPdfPath = (folder, filename) =>
  new URL(`/papers/${folder}/${filename}`, import.meta.env.BASE_URL).toString();

export default function PaperSite() {
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);

  useEffect(() => {
    // public/papers.json 로드
    fetch(new URL("/papers.json", import.meta.env.BASE_URL))
      .then((r) => r.json())
      .then(setFolders)
      .catch((e) => console.error("Failed to load papers.json", e));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h1 className="text-4xl font-bold text-indigo-900 text-center">
            IFSCC 2025 Full Paper
          </h1>
          <p className="text-center text-gray-600 mt-2">
            International Federation of Societies of Cosmetic Chemists
          </p>
        </div>

        {/* 메인 */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {!selectedFolder ? (
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">Categories</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {folders.map((folder) => (
                  <button
                    key={folder.folder}
                    onClick={() => setSelectedFolder(folder)}
                    className="flex items-center p-6 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all duration-200"
                  >
                    <Folder className="w-12 h-12 text-indigo-600 mr-4" />
                    <div className="text-left">
                      <h3 className="text-xl font-semibold text-gray-800">{folder.name}</h3>
                      <p className="text-sm text-gray-500">{folder.papers.length} papers</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <button
                onClick={() => setSelectedFolder(null)}
                className="flex items-center text-indigo-600 hover:text-indigo-800 mb-6 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 mr-1" />
                Back to Categories
              </button>

              <h2 className="text-2xl font-semibold text-gray-800 mb-6">
                {selectedFolder.name}
              </h2>

              <div className="space-y-3">
                {selectedFolder.papers.map((paper) => {
                  const href = buildPdfPath(selectedFolder.folder, paper.filename);
                  return (
                    <div
                      key={paper.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center flex-1">
                        <FileText className="w-6 h-6 text-red-500 mr-3 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">{paper.id}</span>
                            {paper.podium && <Award className="w-4 h-4 text-yellow-500" />}
                          </div>
                          <span className="text-gray-800">{paper.title}</span>
                        </div>
                      </div>

                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors ml-4"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="text-center mt-8 text-gray-600">
          <p className="text-sm">© 2025 IFSCC Conference | All Rights Reserved</p>
        </div>
      </div>
    </div>
  );
}

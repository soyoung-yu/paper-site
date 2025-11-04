import React, { useState } from 'react';
import { Folder, FileText, Download, ChevronLeft, Award } from 'lucide-react';

const PaperSite = () => {
  const [selectedFolder, setSelectedFolder] = useState(null);

  const folders = [
    {
      id: 1,
      name: 'Microbiome',
      papers: [
        { id: 'IFSCC2025-183', title: 'Integrated Analysis of the Age-related Microbiome and Metabolites in Korean Women Skin', url: 'https://ifscc2025-papers.s3.amazonaws.com/microbiome/IFSCC2025-183.pdf', podium: false },
        { id: 'IFSCC2025-295', title: 'Lysophosphatidic acid inhibits proliferation of Cutibacterium acnes', url: 'https://ifscc2025-papers.s3.amazonaws.com/microbiome/IFSCC2025-295.pdf', podium: false },
        { id: 'IFSCC2025-299', title: 'Revitalizing the potential of skin microbiome for UV defense', url: 'https://ifscc2025-papers.s3.amazonaws.com/microbiome/IFSCC2025-299.pdf', podium: false },
        { id: 'IFSCC2025-312', title: 'Comprehensive study of botanical species for dermo-cosmetic applications', url: 'https://ifscc2025-papers.s3.amazonaws.com/microbiome/IFSCC2025-312.pdf', podium: false },
        { id: 'IFSCC2025-342', title: 'Hyaluronic Acid and Ectoine Inhibit Cutibacterium acnes Biofilm Formation', url: 'https://ifscc2025-papers.s3.amazonaws.com/microbiome/IFSCC2025-342.pdf', podium: false },
        { id: 'IFSCC2025-564', title: 'Ideal controlling of androgenetic alopecia via droplet digital PCR', url: 'https://ifscc2025-papers.s3.amazonaws.com/microbiome/IFSCC2025-564.pdf', podium: true },
        { id: 'IFSCC2025-662', title: 'Micrococcus luteus mediates skin anti-aging effects', url: 'https://ifscc2025-papers.s3.amazonaws.com/microbiome/IFSCC2025-662.pdf', podium: true },
        { id: 'IFSCC2025-688', title: 'Development of Bio Emulsion from Novel Skin Microbiome', url: 'https://ifscc2025-papers.s3.amazonaws.com/microbiome/IFSCC2025-688.pdf', podium: true },
        { id: 'IFSCC2025-926', title: 'Virulent bacteria trigger neuro-inflammatory responses', url: 'https://ifscc2025-papers.s3.amazonaws.com/microbiome/IFSCC2025-926.pdf', podium: true },
        { id: 'IFSCC2025-967', title: 'Corynebacterium in Skin Aging: Species Distribution', url: 'https://ifscc2025-papers.s3.amazonaws.com/microbiome/IFSCC2025-967.pdf', podium: true }
      ]
    },
    {
      id: 2,
      name: 'Sustainability',
      papers: [
        { id: 'IFSCC2025-215', title: 'Cosmetopoeia: a path to creativity and sustainability', url: 'https://ifscc2025-papers.s3.amazonaws.com/sustainability/IFSCC2025-215.pdf', podium: false },
        { id: 'IFSCC2025-247', title: 'Development of functional cosmetic ingredient from Okinawa', url: 'https://ifscc2025-papers.s3.amazonaws.com/sustainability/IFSCC2025-247.pdf', podium: false },
        { id: 'IFSCC2025-252', title: 'Characterization of extract from agri-food industry', url: 'https://ifscc2025-papers.s3.amazonaws.com/sustainability/IFSCC2025-252.pdf', podium: false },
        { id: 'IFSCC2025-273', title: 'Enhancing Deposition Efficiency: Impact of Glycolipids', url: 'https://ifscc2025-papers.s3.amazonaws.com/sustainability/IFSCC2025-273.pdf', podium: true },
        { id: 'IFSCC2025-329', title: 'Optimized Indoor Cultivation for Skin Biology', url: 'https://ifscc2025-papers.s3.amazonaws.com/sustainability/IFSCC2025-329.pdf', podium: false },
        { id: 'IFSCC2025-409', title: 'Innovation from Pearl Oysters: Sustainable Pearl Powder', url: 'https://ifscc2025-papers.s3.amazonaws.com/sustainability/IFSCC2025-409.pdf', podium: false },
        { id: 'IFSCC2025-438', title: 'Polysaccharide-Rich Fermentation with Skin Firming Effects', url: 'https://ifscc2025-papers.s3.amazonaws.com/sustainability/IFSCC2025-438.pdf', podium: false },
        { id: 'IFSCC2025-455', title: 'Transforming Oleochemical Production: Enzymatic Solutions', url: 'https://ifscc2025-papers.s3.amazonaws.com/sustainability/IFSCC2025-455.pdf', podium: false },
        { id: 'IFSCC2025-486', title: 'Deep eutectic solvent extract for anti-aging', url: 'https://ifscc2025-papers.s3.amazonaws.com/sustainability/IFSCC2025-486.pdf', podium: false },
        { id: 'IFSCC2025-1453', title: 'Sustainable Beauty: Bio-resins from Tomato Skin', url: 'https://ifscc2025-papers.s3.amazonaws.com/sustainability/IFSCC2025-1453.pdf', podium: true }
      ]
    },
    {
      id: 3,
      name: 'Well aging / Longevity',
      papers: [
        { id: 'IFSCC2025-146', title: 'Unveiling Slow Aging Factors in Korean Women', url: 'https://ifscc2025-papers.s3.amazonaws.com/wellaging/IFSCC2025-146.pdf', podium: false },
        { id: 'IFSCC2025-187', title: 'Increasing skin oxygenation using cosmetic energy drink', url: 'https://ifscc2025-papers.s3.amazonaws.com/wellaging/IFSCC2025-187.pdf', podium: true },
        { id: 'IFSCC2025-265', title: 'MAMs Interactions: Mitochondrial Hub for Rejuvenation', url: 'https://ifscc2025-papers.s3.amazonaws.com/wellaging/IFSCC2025-265.pdf', podium: true },
        { id: 'IFSCC2025-314', title: 'Stabilization of Retinal using Nanoparticle', url: 'https://ifscc2025-papers.s3.amazonaws.com/wellaging/IFSCC2025-314.pdf', podium: true },
        { id: 'IFSCC2025-452', title: 'Skin aging ameliorated via energy metabolism', url: 'https://ifscc2025-papers.s3.amazonaws.com/wellaging/IFSCC2025-452.pdf', podium: true },
        { id: 'IFSCC2025-528', title: 'Unveiling Cryptic Transcription in Skin Aging', url: 'https://ifscc2025-papers.s3.amazonaws.com/wellaging/IFSCC2025-528.pdf', podium: true },
        { id: 'IFSCC2025-570', title: '100-day cultured 3D skin model for chronological aging', url: 'https://ifscc2025-papers.s3.amazonaws.com/wellaging/IFSCC2025-570.pdf', podium: true },
        { id: 'IFSCC2025-690', title: 'Bioactive Compound for Mitochondrial Enhancement', url: 'https://ifscc2025-papers.s3.amazonaws.com/wellaging/IFSCC2025-690.pdf', podium: true },
        { id: 'IFSCC2025-1113', title: 'Collagen Supramolecular Vehicle for Skin Regeneration', url: 'https://ifscc2025-papers.s3.amazonaws.com/wellaging/IFSCC2025-1113.pdf', podium: true },
        { id: 'IFSCC2025-1171', title: 'Discovery of Telocytes in Skin Aging', url: 'https://ifscc2025-papers.s3.amazonaws.com/wellaging/IFSCC2025-1171.pdf', podium: true }
      ]
    },
    {
      id: 4,
      name: 'Make up',
      papers: [
        { id: 'IFSCC2025-157', title: 'Advanced Makeup with Cationic Polymer-Infused Skincare', url: 'https://ifscc2025-papers.s3.amazonaws.com/makeup/IFSCC2025-157.pdf', podium: false },
        { id: 'IFSCC2025-202', title: 'Physicochemical Properties of Acrylate Copolymer', url: 'https://ifscc2025-papers.s3.amazonaws.com/makeup/IFSCC2025-202.pdf', podium: false },
        { id: 'IFSCC2025-209', title: 'Natural European Mica for Long Lasting Effect', url: 'https://ifscc2025-papers.s3.amazonaws.com/makeup/IFSCC2025-209.pdf', podium: false },
        { id: 'IFSCC2025-242', title: 'Innovative concealing technology for every skin tone', url: 'https://ifscc2025-papers.s3.amazonaws.com/makeup/IFSCC2025-242.pdf', podium: false },
        { id: 'IFSCC2025-465', title: 'Generative AI for Advanced Virtual Makeup', url: 'https://ifscc2025-papers.s3.amazonaws.com/makeup/IFSCC2025-465.pdf', podium: true },
        { id: 'IFSCC2025-642', title: 'Science of Color in Lipstick Visual Perception', url: 'https://ifscc2025-papers.s3.amazonaws.com/makeup/IFSCC2025-642.pdf', podium: true },
        { id: 'IFSCC2025-789', title: 'Lipsticks color trend evolution from 1960 to today', url: 'https://ifscc2025-papers.s3.amazonaws.com/makeup/IFSCC2025-789.pdf', podium: true },
        { id: 'IFSCC2025-1479', title: 'Microfluidic Biomimetic Skin Model for Powder', url: 'https://ifscc2025-papers.s3.amazonaws.com/makeup/IFSCC2025-1479.pdf', podium: true },
        { id: 'IFSCC2025-1602', title: 'AI-Powered Lipstick Color Prediction', url: 'https://ifscc2025-papers.s3.amazonaws.com/makeup/IFSCC2025-1602.pdf', podium: false },
        { id: 'IFSCC2025-1684', title: 'Lip color diversity and makeup strategies', url: 'https://ifscc2025-papers.s3.amazonaws.com/makeup/IFSCC2025-1684.pdf', podium: false }
      ]
    },
    {
      id: 5,
      name: 'Analytical technologies',
      papers: [
        { id: 'IFSCC2025-163', title: 'Prediction of facial translucency using neural networks', url: 'https://ifscc2025-papers.s3.amazonaws.com/analytical/IFSCC2025-163.pdf', podium: true },
        { id: 'IFSCC2025-175', title: 'Understanding hair repair by Hybrid SIMS technique', url: 'https://ifscc2025-papers.s3.amazonaws.com/analytical/IFSCC2025-175.pdf', podium: false },
        { id: 'IFSCC2025-223', title: 'AI Redefining the Aesthetics of Makeup', url: 'https://ifscc2025-papers.s3.amazonaws.com/analytical/IFSCC2025-223.pdf', podium: false },
        { id: 'IFSCC2025-332', title: 'In vivo Study of Skin Barrier Repair using 3D LC-OCT', url: 'https://ifscc2025-papers.s3.amazonaws.com/analytical/IFSCC2025-332.pdf', podium: false },
        { id: 'IFSCC2025-1055', title: 'Novel Method for Evaluating Water in SC', url: 'https://ifscc2025-papers.s3.amazonaws.com/analytical/IFSCC2025-1055.pdf', podium: true },
        { id: 'IFSCC2025-1536', title: 'Advanced Lipidomics Analysis in Cosmetics', url: 'https://ifscc2025-papers.s3.amazonaws.com/analytical/IFSCC2025-1536.pdf', podium: true },
        { id: 'IFSCC2025-1599', title: 'Machine Learning Models in Clinical Research', url: 'https://ifscc2025-papers.s3.amazonaws.com/analytical/IFSCC2025-1599.pdf', podium: true },
        { id: 'IFSCC2025-1683', title: 'OMIC Skin Histology and AI Analysis', url: 'https://ifscc2025-papers.s3.amazonaws.com/analytical/IFSCC2025-1683.pdf', podium: true },
        { id: 'IFSCC2025-1697', title: 'In-Silico Identification of Antibacterial Molecules', url: 'https://ifscc2025-papers.s3.amazonaws.com/analytical/IFSCC2025-1697.pdf', podium: false },
        { id: 'IFSCC2025-1725', title: 'Skin Secrets Revealed using In vivo Raman analyzer', url: 'https://ifscc2025-papers.s3.amazonaws.com/analytical/IFSCC2025-1725.pdf', podium: false }
      ]
    },
    {
      id: 6,
      name: 'Hair',
      papers: [
        { id: 'IFSCC2025-154', title: 'Nanoliposomes for Alopecia Treatment', url: 'https://ifscc2025-papers.s3.amazonaws.com/hair/IFSCC2025-154.pdf', podium: false },
        { id: 'IFSCC2025-229', title: 'Genetic Roots of Gray Hair: Role of Plexin-A1', url: 'https://ifscc2025-papers.s3.amazonaws.com/hair/IFSCC2025-229.pdf', podium: false },
        { id: 'IFSCC2025-241', title: 'Novel hair damage mechanism: Glyco-oxidation', url: 'https://ifscc2025-papers.s3.amazonaws.com/hair/IFSCC2025-241.pdf', podium: false },
        { id: 'IFSCC2025-250', title: 'Hard Water Makes Hair and Scalp Barrier Weaker', url: 'https://ifscc2025-papers.s3.amazonaws.com/hair/IFSCC2025-250.pdf', podium: false },
        { id: 'IFSCC2025-504', title: 'Essential oil promotes hair growth via IGF-1', url: 'https://ifscc2025-papers.s3.amazonaws.com/hair/IFSCC2025-504.pdf', podium: true },
        { id: 'IFSCC2025-693', title: 'Recombinant Filaggrin 2 for DHT-Induced Damage', url: 'https://ifscc2025-papers.s3.amazonaws.com/hair/IFSCC2025-693.pdf', podium: true },
        { id: 'IFSCC2025-886', title: 'Stress-Induced Hair Greying Using Organoids', url: 'https://ifscc2025-papers.s3.amazonaws.com/hair/IFSCC2025-886.pdf', podium: true },
        { id: 'IFSCC2025-1130', title: 'Effects of Hordeum vulgare extract on Hair Loss', url: 'https://ifscc2025-papers.s3.amazonaws.com/hair/IFSCC2025-1130.pdf', podium: false },
        { id: 'IFSCC2025-1299', title: 'Machine Learning for Hair Volume Analysis', url: 'https://ifscc2025-papers.s3.amazonaws.com/hair/IFSCC2025-1299.pdf', podium: false },
        { id: 'IFSCC2025-1549', title: 'Olfactory receptor OR8D1 in Androgenetic Alopecia', url: 'https://ifscc2025-papers.s3.amazonaws.com/hair/IFSCC2025-1549.pdf', podium: false }
      ]
    }
  ];

  const handleDownload = (paper) => {
    const link = document.createElement('a');
    link.href = paper.url;
    link.download = `${paper.id}.pdf`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h1 className="text-4xl font-bold text-indigo-900 text-center">
            IFSCC 2025 Full Paper
          </h1>
          <p className="text-center text-gray-600 mt-2">
            International Federation of Societies of Cosmetic Chemists
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          {!selectedFolder ? (
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">
                Categories
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => setSelectedFolder(folder)}
                    className="flex items-center p-6 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all duration-200"
                  >
                    <Folder className="w-12 h-12 text-indigo-600 mr-4" />
                    <div className="text-left">
                      <h3 className="text-xl font-semibold text-gray-800">
                        {folder.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {folder.papers.length} papers
                      </p>
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
                {selectedFolder.papers.map((paper) => (
                  <div
                    key={paper.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center flex-1">
                      <FileText className="w-6 h-6 text-red-500 mr-3 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">{paper.id}</span>
                          {paper.podium && (
                            <Award className="w-4 h-4 text-yellow-500" />
                          )}
                        </div>
                        <span className="text-gray-800">{paper.title}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownload(paper)}
                      className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors ml-4"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="text-center mt-8 text-gray-600">
          <p className="text-sm">
            © 2025 IFSCC Conference | All Rights Reserved
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaperSite;

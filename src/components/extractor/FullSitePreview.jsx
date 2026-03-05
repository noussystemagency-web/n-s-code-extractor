import React, { useState } from 'react';
import { FileText, Download, ExternalLink } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CodeViewer from './CodeViewer';

export default function FullSitePreview({ siteData, onSendToBase44, isSending }) {
  const [selectedPageIdx, setSelectedPageIdx] = useState(0);

  if (!siteData || !siteData.pages || siteData.pages.length === 0) {
    return null;
  }

  const selectedPage = siteData.pages[selectedPageIdx];

  const handleDownloadProject = () => {
    const projectData = {
      name: siteData.siteName,
      baseUrl: siteData.baseUrl,
      pages: siteData.pages.map(p => ({
        title: p.title,
        pathname: p.pathname,
        url: p.url,
      }))
    };
    
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${siteData.siteName}-project.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">📦 Proyecto Completo</h2>
            <p className="text-sm text-slate-600">{siteData.totalPages} páginas extraídas de <span className="font-mono font-semibold text-slate-800">{siteData.baseUrl}</span></p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleDownloadProject}
              size="sm"
              variant="outline"
              className="bg-white border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Descargar
            </Button>
            <Button
              onClick={onSendToBase44}
              disabled={isSending}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSending ? '🚀 Enviando...' : '🚀 Enviar a Base44'}
            </Button>
          </div>
        </div>
      </div>

      {/* Pages Navigation */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Páginas Extraídas</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
          {siteData.pages.map((page, idx) => (
            <button
              key={page.url}
              onClick={() => setSelectedPageIdx(idx)}
              className={`p-2.5 rounded-lg text-left transition-all text-xs font-medium ${
                selectedPageIdx === idx
                  ? 'bg-emerald-100 border-2 border-emerald-500 text-emerald-900'
                  : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-3 h-3 mb-1" />
              <p className="truncate">{page.title}</p>
              <p className="text-[10px] text-slate-500 truncate">{page.pathname}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Page Preview */}
      {selectedPage && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">{selectedPage.title}</h3>
              <p className="text-xs text-slate-500 font-mono">{selectedPage.url}</p>
            </div>
            <a
              href={selectedPage.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-slate-600" />
            </a>
          </div>

          <Tabs defaultValue="html" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1 rounded-lg">
              <TabsTrigger value="html" className="text-xs">HTML</TabsTrigger>
              <TabsTrigger value="css" className="text-xs">CSS</TabsTrigger>
            </TabsList>

            <TabsContent value="html" className="mt-4">
              <CodeViewer
                code={selectedPage.html}
                language="html"
                maxHeight="h-96"
              />
            </TabsContent>

            <TabsContent value="css" className="mt-4">
              <CodeViewer
                code={selectedPage.css || '/* Sin CSS interno */'}
                language="css"
                maxHeight="h-96"
              />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
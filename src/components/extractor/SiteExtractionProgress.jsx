import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SiteExtractionProgress({ pages, isComplete, error }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="space-y-4">
        <div>
          {!isComplete ? (
            <div className="flex items-center gap-2 mb-4">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <h3 className="font-semibold text-slate-900">Extrayendo sitio completo...</h3>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <h3 className="font-semibold text-slate-900">Error en la extracción</h3>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-slate-900">Sitio completo extraído</h3>
            </div>
          )}
        </div>

        <div className="space-y-2">
          {pages.map((page, idx) => (
            <div
              key={page.url}
              className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100"
            >
              {page.status === 'completed' && (
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
              )}
              {page.status === 'loading' && (
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" />
              )}
              {page.status === 'pending' && (
                <div className="w-4 h-4 rounded-full border-2 border-slate-300 flex-shrink-0" />
              )}
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{page.title}</p>
                <p className="text-xs text-slate-500 truncate">{page.pathname}</p>
              </div>
              
              <span className="text-xs text-slate-500 flex-shrink-0">
                {idx + 1}/{pages.length}
              </span>
            </div>
          ))}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {isComplete && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">✅ {pages.length} páginas extraídas correctamente</p>
          </div>
        )}
      </div>
    </div>
  );
}
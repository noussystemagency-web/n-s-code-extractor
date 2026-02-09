import React from 'react';
import { Image, Type, ExternalLink } from "lucide-react";

export default function AssetsPanel({ assets }) {
  if (!assets) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-600 text-sm">
        Sin assets detectados
      </div>
    );
  }

  return (
    <div className="bg-[#0d1117] rounded-lg border border-white/5 max-h-[350px] overflow-auto p-4 space-y-5">
      {/* Images */}
      {assets.images?.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Image className="w-3 h-3" />
            Imágenes ({assets.images.length})
          </h4>
          <div className="grid grid-cols-4 gap-2">
            {assets.images.slice(0, 12).map((img, i) => (
              <a
                key={i}
                href={img}
                target="_blank"
                rel="noopener noreferrer"
                className="relative group aspect-square rounded-lg overflow-hidden bg-white/5 border border-white/5 hover:border-blue-500/30 transition-all"
              >
                <img
                  src={img}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ExternalLink className="w-4 h-4 text-white" />
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Fonts */}
      {assets.fonts?.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Type className="w-3 h-3" />
            Fuentes ({assets.fonts.length})
          </h4>
          <div className="space-y-1.5">
            {assets.fonts.map((font, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 border border-white/5"
              >
                <Type className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-sm text-slate-300" style={{ fontFamily: font }}>
                  {font}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
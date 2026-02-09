import React, { useState } from 'react';
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

export default function ColorPalette({ colors, fonts }) {
  const [copiedIdx, setCopiedIdx] = useState(null);

  const copyColor = async (color, idx) => {
    await navigator.clipboard.writeText(color);
    setCopiedIdx(idx);
    toast.success(`Color ${color} copiado`);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  if (!colors || colors.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-600 text-sm">
        Sin colores detectados
      </div>
    );
  }

  // Deduplicate and sort
  const uniqueColors = [...new Set(colors)].slice(0, 40);

  return (
    <div className="bg-[#0d1117] rounded-lg border border-white/5 max-h-[350px] overflow-auto p-4">
      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Paleta de colores ({uniqueColors.length})
      </h4>
      <div className="grid grid-cols-5 gap-2">
        {uniqueColors.map((color, i) => (
          <button
            key={i}
            onClick={() => copyColor(color, i)}
            className="group relative flex flex-col items-center gap-1.5"
          >
            <div
              className="w-full aspect-square rounded-lg border border-white/10 transition-transform group-hover:scale-105 shadow-lg"
              style={{ backgroundColor: color }}
            />
            <span className="text-[10px] font-mono text-slate-500 group-hover:text-slate-300 truncate w-full text-center transition-colors">
              {copiedIdx === i ? (
                <span className="text-green-400 flex items-center justify-center gap-0.5">
                  <Check className="w-2.5 h-2.5" /> Copiado
                </span>
              ) : color}
            </span>
          </button>
        ))}
      </div>

      {fonts && fonts.length > 0 && (
        <div className="mt-6 pt-4 border-t border-white/5">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Fuentes detectadas
          </h4>
          <div className="flex flex-wrap gap-2">
            {fonts.map((font, i) => (
              <span
                key={i}
                className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300"
                style={{ fontFamily: font }}
              >
                {font}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
import React from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Code2, Paintbrush, FileCode, Image, Type, LayoutGrid, Trash2, Minimize2, Zap } from "lucide-react";

const EXTRACTION_OPTIONS = [
  { id: 'html', label: 'HTML', icon: Code2, checked: true },
  { id: 'css_inline', label: 'CSS inline', icon: Paintbrush, checked: true },
  { id: 'css_external', label: 'CSS externo', icon: Paintbrush, checked: true },
  { id: 'javascript', label: 'JavaScript', icon: FileCode, checked: true },
  { id: 'images', label: 'Imágenes', icon: Image, checked: true },
  { id: 'fonts', label: 'Fuentes', icon: Type, checked: true },
  { id: 'structure', label: 'Estructura', icon: LayoutGrid, checked: true },
];

const CLEANUP_OPTIONS = [
  { id: 'remove_scripts', label: 'Quitar scripts', icon: Trash2 },
  { id: 'minify', label: 'Minificar', icon: Minimize2 },
  { id: 'optimize', label: 'Optimizar', icon: Zap },
];

export default function ExtractionOptions({ options, setOptions, cleanup, setCleanup }) {
  const toggleOption = (id) => {
    setOptions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleCleanup = (id) => {
    setCleanup(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          Opciones de extracción
        </h3>
        <div className="space-y-2">
          {EXTRACTION_OPTIONS.map(opt => (
            <label
              key={opt.id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors group"
            >
              <Checkbox
                checked={options[opt.id] !== false}
                onCheckedChange={() => toggleOption(opt.id)}
                className="border-slate-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <opt.icon className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-colors" />
              <span className="text-sm text-slate-300">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="border-t border-white/5 pt-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Limpieza
        </h3>
        <div className="space-y-2">
          {CLEANUP_OPTIONS.map(opt => (
            <label
              key={opt.id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors group"
            >
              <Checkbox
                checked={cleanup[opt.id] || false}
                onCheckedChange={() => toggleCleanup(opt.id)}
                className="border-slate-600 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
              />
              <opt.icon className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-colors" />
              <span className="text-sm text-slate-300">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
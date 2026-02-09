import React from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Zap, FileX, Minimize, Combine, Trash2, Bug } from "lucide-react";

const OPTIMIZATION_OPTIONS = [
  { id: 'removeScripts', label: 'Eliminar scripts', icon: FileX, desc: 'Quita todos los <script>' },
  { id: 'removeComments', label: 'Eliminar comentarios', icon: FileX, desc: 'HTML, CSS y JS' },
  { id: 'removeEmptyElements', label: 'Eliminar elementos vacíos', icon: Trash2, desc: 'Tags sin contenido' },
  { id: 'removeInlineStyles', label: 'Eliminar estilos inline', icon: FileX, desc: 'Atributos style=""' },
  { id: 'removeUnusedCSS', label: 'Eliminar CSS no usado', icon: Zap, desc: 'Solo clases usadas', recommended: true },
  { id: 'combineMediaQueries', label: 'Combinar media queries', icon: Combine, desc: 'Agrupa @media' },
  { id: 'removeConsole', label: 'Eliminar console.log', icon: Bug, desc: 'Quita logs de JS' },
  { id: 'removeDebugger', label: 'Eliminar debugger', icon: Bug, desc: 'Quita breakpoints' },
  { id: 'minifyHTML', label: 'Minificar HTML', icon: Minimize, desc: 'Comprime espacios' },
  { id: 'minifyCSS', label: 'Minificar CSS', icon: Minimize, desc: 'Comprime estilos' },
  { id: 'minifyJS', label: 'Minificar JS', icon: Minimize, desc: 'Comprime código' },
];

export default function AdvancedOptions({ options, setOptions }) {
  const toggleOption = (id) => {
    setOptions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          Optimización Avanzada
        </h3>
        <button
          onClick={() => {
            const recommended = { removeUnusedCSS: true, removeComments: true, minifyCSS: true };
            setOptions(prev => ({ ...prev, ...recommended }));
          }}
          className="text-[10px] text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
        >
          Aplicar recomendadas
        </button>
      </div>

      <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
        {OPTIMIZATION_OPTIONS.map(opt => (
          <label
            key={opt.id}
            className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors group"
          >
            <Checkbox
              checked={options[opt.id] || false}
              onCheckedChange={() => toggleOption(opt.id)}
              className="mt-0.5 border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <opt.icon className="w-3 h-3 text-slate-400 flex-shrink-0" />
                <span className="text-sm text-slate-700">{opt.label}</span>
                {opt.recommended && (
                  <Badge className="bg-indigo-50 text-indigo-600 border-indigo-200 text-[9px] px-1.5 py-0">
                    Recomendado
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 ml-5">{opt.desc}</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
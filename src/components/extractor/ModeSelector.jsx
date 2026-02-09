import React from 'react';
import { Globe, MousePointer, Component, FileStack } from "lucide-react";
import { cn } from "@/lib/utils";

const MODES = [
  { id: 'url_complete', label: 'URL completa', icon: Globe, desc: 'Extrae toda la URL' },
  { id: 'element', label: 'Elemento', icon: MousePointer, desc: 'Selecciona un elemento' },
  { id: 'component', label: 'Componente', icon: Component, desc: 'Detecta componentes' },
  { id: 'full_page', label: 'Página completa', icon: FileStack, desc: 'Scraping completo' },
];

export default function ModeSelector({ mode, setMode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Modo de extracción
      </h3>
      <div className="space-y-1.5">
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200",
              mode === m.id
                ? "bg-blue-600/20 border border-blue-500/30 text-white"
                : "hover:bg-white/5 text-slate-400 hover:text-slate-200 border border-transparent"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
              mode === m.id ? "bg-blue-600/30" : "bg-white/5"
            )}>
              <m.icon className={cn("w-4 h-4", mode === m.id ? "text-blue-400" : "text-slate-500")} />
            </div>
            <div>
              <div className="text-sm font-medium">{m.label}</div>
              <div className="text-[11px] text-slate-500">{m.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
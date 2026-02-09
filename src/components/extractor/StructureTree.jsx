import React from 'react';
import { ChevronRight, Code2 } from "lucide-react";

export default function StructureTree({ structure }) {
  if (!structure || structure.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-600 text-sm">
        Sin estructura detectada
      </div>
    );
  }

  return (
    <div className="bg-[#0d1117] rounded-lg border border-white/5 max-h-[350px] overflow-auto p-4">
      <div className="space-y-0.5">
        {structure.map((node, i) => (
          <div
            key={i}
            className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-white/5 transition-colors cursor-default group"
          >
            <ChevronRight className="w-3 h-3 text-slate-600 flex-shrink-0" />
            <Code2 className="w-3 h-3 text-blue-500/60 flex-shrink-0" />
            <span className="text-blue-400 text-xs font-mono">&lt;{node.tag}&gt;</span>
            {node.classes && (
              <span className="text-emerald-400/60 text-[11px] font-mono truncate max-w-xs">
                .{node.classes.split(' ').slice(0, 3).join(' .')}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
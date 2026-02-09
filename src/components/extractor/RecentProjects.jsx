import React from 'react';
import { Folder, Clock, Trash2 } from "lucide-react";
import moment from "moment";

export default function RecentProjects({ projects, onSelect, onDelete }) {
  if (!projects || projects.length === 0) return null;

  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">
        Proyectos recientes
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {projects.slice(0, 8).map((project) => (
          <div
            key={project.id}
            className="group relative bg-white rounded-xl border border-slate-200 p-3 hover:border-blue-400 transition-all hover:shadow-md"
          >
            <div
              onClick={() => onSelect(project)}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                  <Folder className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <p className="text-sm font-medium text-slate-900 truncate">
                {project.name || 'Sin nombre'}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <span className="text-[11px] text-slate-500">
                  {moment(project.created_date).fromNow()}
                </span>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-red-100"
            >
              <Trash2 className="w-3 h-3 text-red-500" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
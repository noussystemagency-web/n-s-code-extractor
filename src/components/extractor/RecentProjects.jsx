import React, { useState } from 'react';
import { Folder, Clock, Trash2, Eye, Rocket, Copy, Download, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import moment from "moment";
import ProjectDetailsModal from './ProjectDetailsModal';

export default function RecentProjects({ projects, onSelect, onDelete }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [frameworkFilter, setFrameworkFilter] = useState('all');
  const [selectedProject, setSelectedProject] = useState(null);

  if (!projects || projects.length === 0) return null;

  const frameworks = [...new Set(projects.map(p => p.metadata?.framework).filter(Boolean))];

  const filtered = projects.filter(p => {
    const matchSearch = !search || 
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.url?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchFramework = frameworkFilter === 'all' || p.metadata?.framework === frameworkFilter;
    return matchSearch && matchStatus && matchFramework;
  });

  const handleCopy = async (project, e) => {
    e.stopPropagation();
    const fullCode = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${project.name}</title>
  <style>${project.css_content || ''}</style>
</head>
<body>
${project.html_content || ''}
<script>${project.js_content || ''}</script>
</body>
</html>`;
    await navigator.clipboard.writeText(fullCode);
    toast.success('Código copiado');
  };

  const handleDownload = (project, e) => {
    e.stopPropagation();
    const fullCode = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${project.name}</title>
  <style>${project.css_content || ''}</style>
</head>
<body>
${project.html_content || ''}
<script>${project.js_content || ''}</script>
</body>
</html>`;
    const blob = new Blob([fullCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '-')}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Descargado');
  };

  const handleClone = async (project, e) => {
    e.stopPropagation();
    if (project.generated_prompt) {
      await navigator.clipboard.writeText(project.generated_prompt);
      toast.success('Prompt IA copiado');
    } else {
      await handleCopy(project, e);
    }
  };

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Proyectos recientes
          </h3>
          {projects.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="relative w-40">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="pl-7 h-7 text-xs bg-white border-slate-200"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-28 h-7 text-xs bg-white border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="completed">Completados</SelectItem>
                  <SelectItem value="extracting">Extrayendo</SelectItem>
                  <SelectItem value="error">Errores</SelectItem>
                </SelectContent>
              </Select>
              {frameworks.length > 0 && (
                <Select value={frameworkFilter} onValueChange={setFrameworkFilter}>
                  <SelectTrigger className="w-32 h-7 text-xs bg-white border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Frameworks</SelectItem>
                    {frameworks.map(fw => (
                      <SelectItem key={fw} value={fw}>{fw}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {filtered.slice(0, 8).map((project) => (
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
              
              {/* Action Buttons */}
              <div className="absolute top-2 right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedProject(project);
                  }}
                  className="h-6 w-6 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                  title="Ver detalles"
                >
                  <Eye className="w-3 h-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => handleClone(project, e)}
                  className="h-6 w-6 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                  title="Clonar"
                >
                  <Rocket className="w-3 h-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(project.id);
                  }}
                  className="h-6 w-6 text-slate-400 hover:text-red-600 hover:bg-red-50"
                  title="Eliminar"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ProjectDetailsModal
        open={!!selectedProject}
        onOpenChange={(open) => !open && setSelectedProject(null)}
        project={selectedProject}
      />
    </>
  );
}
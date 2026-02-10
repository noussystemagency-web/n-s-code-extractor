import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Search, Trash2, ExternalLink, ArrowLeft, Folder, Clock, Globe, Cpu, Eye, Copy, Download, Rocket } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { toast } from "sonner";
import moment from 'moment';
import ProjectDetailsModal from '../components/extractor/ProjectDetailsModal';

export default function ProjectHistory() {
  const [search, setSearch] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['all-projects'],
    queryFn: () => base44.entities.ExtractedProject.list('-created_date', 100),
  });

  const filtered = projects.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name?.toLowerCase().includes(q) || p.url?.toLowerCase().includes(q);
  });

  const handleDelete = async (id) => {
    await base44.entities.ExtractedProject.delete(id);
    queryClient.invalidateQueries({ queryKey: ['all-projects'] });
    toast.success('Proyecto eliminado');
  };

  const handleCopy = async (project) => {
    const fullCode = `<!-- ${project.name} -->

<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.name}</title>
  <style>
${project.css_content || ''}
  </style>
</head>
<body>
${project.html_content || ''}
<script>
${project.js_content || ''}
</script>
</body>
</html>`;
    await navigator.clipboard.writeText(fullCode);
    toast.success('Código copiado');
  };

  const handleDownload = (project) => {
    const fullCode = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.name}</title>
  <style>
${project.css_content || ''}
  </style>
</head>
<body>
${project.html_content || ''}
<script>
${project.js_content || ''}
</script>
</body>
</html>`;
    const blob = new Blob([fullCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '-')}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Proyecto descargado');
  };

  const handleClone = async (project) => {
    if (project.generated_prompt) {
      await navigator.clipboard.writeText(project.generated_prompt);
      toast.success('Prompt IA copiado');
      toast.info('Pégalo en Base44 IA', { duration: 4000 });
    } else {
      await handleCopy(project);
      toast.info('Código copiado - pégalo en Base44', { duration: 4000 });
    }
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Extractor')} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
              <ArrowLeft className="w-4 h-4 text-slate-600" />
            </Link>
            <Clock className="w-5 h-5 text-indigo-600" />
            <h1 className="text-sm font-bold tracking-tight text-slate-900">Historial de Proyectos</h1>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">
        <div className="relative max-w-sm mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o URL..."
            className="pl-10 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 h-10"
          />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200 hover:bg-transparent bg-slate-50">
                <TableHead className="text-slate-600 text-xs font-semibold">Proyecto</TableHead>
                <TableHead className="text-slate-600 text-xs font-semibold">URL</TableHead>
                <TableHead className="text-slate-600 text-xs font-semibold">Framework</TableHead>
                <TableHead className="text-slate-600 text-xs font-semibold">Fecha</TableHead>
                <TableHead className="text-slate-600 text-xs font-semibold">Estado</TableHead>
                <TableHead className="text-slate-600 text-xs font-semibold text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16 text-slate-500">
                    <Folder className="w-10 h-10 mx-auto mb-2 text-slate-400" />
                    <p className="text-sm text-slate-700">No hay proyectos</p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(project => (
                  <TableRow key={project.id} className="border-slate-200 hover:bg-slate-50">
                    <TableCell>
                      <button
                        onClick={() => setSelectedProject(project)}
                        className="flex items-center gap-2 text-slate-700 hover:text-blue-600 transition-colors text-left"
                      >
                        <Folder className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium">{project.name || 'Sin nombre'}</span>
                      </button>
                    </TableCell>
                    <TableCell>
                      <a
                        href={project.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 transition-colors truncate max-w-xs"
                      >
                        <Globe className="w-3 h-3 flex-shrink-0" />
                        {project.url}
                      </a>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-600 flex items-center gap-1">
                        <Cpu className="w-3 h-3" />
                        {project.metadata?.framework || '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-600">
                        {moment(project.created_date).format('DD MMM YYYY, HH:mm')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        project.status === 'completed'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : project.status === 'error'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                      }>
                        {project.status || 'completed'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedProject(project)}
                          className="h-7 px-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                          title="Ver detalles"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleClone(project)}
                          className="h-7 px-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                          title="Clonar a Base44"
                        >
                          <Rocket className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopy(project)}
                          className="h-7 px-2 text-slate-600 hover:text-slate-700 hover:bg-slate-100"
                          title="Copiar código"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownload(project)}
                          className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                          title="Descargar HTML"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(project.id)}
                          className="h-7 px-2 text-slate-500 hover:text-red-600 hover:bg-red-50"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <ProjectDetailsModal
        open={!!selectedProject}
        onOpenChange={(open) => !open && setSelectedProject(null)}
        project={selectedProject}
      />
    </div>
  );
}
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Search, Trash2, ExternalLink, ArrowLeft, Folder, Clock, Globe, Cpu } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { toast } from "sonner";
import moment from 'moment';

export default function ProjectHistory() {
  const [search, setSearch] = useState('');
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
                <TableHead className="text-slate-600 text-xs font-semibold">Modo</TableHead>
                <TableHead className="text-slate-600 text-xs font-semibold">Framework</TableHead>
                <TableHead className="text-slate-600 text-xs font-semibold">Fecha</TableHead>
                <TableHead className="text-slate-600 text-xs font-semibold">Estado</TableHead>
                <TableHead className="text-slate-600 text-xs font-semibold w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16 text-slate-500">
                    <Folder className="w-10 h-10 mx-auto mb-2 text-slate-400" />
                    <p className="text-sm text-slate-700">No hay proyectos</p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(project => (
                  <TableRow key={project.id} className="border-slate-200 hover:bg-slate-50">
                    <TableCell>
                      <Link
                        to={createPageUrl('Extractor') + `?projectId=${project.id}`}
                        className="flex items-center gap-2 text-slate-700 hover:text-blue-600 transition-colors"
                      >
                        <Folder className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium">{project.name || 'Sin nombre'}</span>
                      </Link>
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
                      <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-600">
                        {project.mode?.replace('_', ' ')}
                      </Badge>
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
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(project.id)}
                        className="h-7 w-7 text-slate-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
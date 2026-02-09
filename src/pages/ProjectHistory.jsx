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
    <div className="min-h-screen bg-[#0f1419] text-white">
      <header className="border-b border-white/5 bg-[#0f1419]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Extractor')} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
              <ArrowLeft className="w-4 h-4 text-slate-400" />
            </Link>
            <Clock className="w-5 h-5 text-violet-400" />
            <h1 className="text-sm font-bold tracking-tight">Historial de Proyectos</h1>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">
        <div className="relative max-w-sm mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o URL..."
            className="pl-10 bg-[#1a1f2e] border-white/10 text-white placeholder:text-slate-600 h-10"
          />
        </div>

        <div className="bg-[#161b22] rounded-xl border border-white/5 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="text-slate-400 text-xs">Proyecto</TableHead>
                <TableHead className="text-slate-400 text-xs">URL</TableHead>
                <TableHead className="text-slate-400 text-xs">Modo</TableHead>
                <TableHead className="text-slate-400 text-xs">Framework</TableHead>
                <TableHead className="text-slate-400 text-xs">Fecha</TableHead>
                <TableHead className="text-slate-400 text-xs">Estado</TableHead>
                <TableHead className="text-slate-400 text-xs w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16 text-slate-600">
                    <Folder className="w-10 h-10 mx-auto mb-2" />
                    <p className="text-sm">No hay proyectos</p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(project => (
                  <TableRow key={project.id} className="border-white/5 hover:bg-white/[0.02]">
                    <TableCell>
                      <Link
                        to={createPageUrl('Extractor') + `?projectId=${project.id}`}
                        className="flex items-center gap-2 text-slate-200 hover:text-white transition-colors"
                      >
                        <Folder className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-medium">{project.name || 'Sin nombre'}</span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <a
                        href={project.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-400 transition-colors truncate max-w-xs"
                      >
                        <Globe className="w-3 h-3 flex-shrink-0" />
                        {project.url}
                      </a>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] border-white/10 text-slate-400">
                        {project.mode?.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Cpu className="w-3 h-3" />
                        {project.metadata?.framework || '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-500">
                        {moment(project.created_date).format('DD MMM YYYY, HH:mm')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        project.status === 'completed'
                          ? 'bg-green-500/10 text-green-400 border-green-500/20'
                          : project.status === 'error'
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                      }>
                        {project.status || 'completed'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(project.id)}
                        className="h-7 w-7 text-slate-600 hover:text-red-400 hover:bg-red-500/10"
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
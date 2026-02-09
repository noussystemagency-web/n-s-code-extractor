import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Trash2, Copy, Check, ExternalLink, Component, Code2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { toast } from "sonner";
import CodeViewer from '../components/extractor/CodeViewer';
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: 'all', label: 'Todos' },
  { id: 'button', label: 'Botones' },
  { id: 'card', label: 'Cards' },
  { id: 'form', label: 'Formularios' },
  { id: 'modal', label: 'Modales' },
  { id: 'navigation', label: 'Navegación' },
  { id: 'header', label: 'Headers' },
  { id: 'footer', label: 'Footers' },
  { id: 'sidebar', label: 'Sidebars' },
  { id: 'table', label: 'Tablas' },
  { id: 'other', label: 'Otros' },
];

export default function ComponentLibrary() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedComp, setSelectedComp] = useState(null);
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const { data: components = [], isLoading } = useQuery({
    queryKey: ['components'],
    queryFn: () => base44.entities.SavedComponent.list('-created_date', 50),
  });

  const filtered = components.filter(c => {
    const matchSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'all' || c.category === category;
    return matchSearch && matchCat;
  });

  const handleDelete = async (id) => {
    await base44.entities.SavedComponent.delete(id);
    queryClient.invalidateQueries({ queryKey: ['components'] });
    if (selectedComp?.id === id) setSelectedComp(null);
    toast.success('Componente eliminado');
  };

  const handleCopy = async (code) => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Código copiado');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Extractor')} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
              <ArrowLeft className="w-4 h-4 text-slate-600" />
            </Link>
            <Component className="w-5 h-5 text-blue-600" />
            <h1 className="text-sm font-bold tracking-tight text-slate-900">Biblioteca de Componentes</h1>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar componente..."
              className="pl-10 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 h-10"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                  category === cat.id
                    ? "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-400"
                    : "bg-white text-slate-600 hover:text-slate-800 hover:bg-slate-50 border border-slate-200"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.length === 0 ? (
              <div className="col-span-2 flex flex-col items-center justify-center py-20 text-slate-500">
                <Component className="w-12 h-12 mb-3 text-slate-400" />
                <p className="text-sm text-slate-700">No hay componentes guardados</p>
                <p className="text-xs mt-1">Extrae componentes desde el Extractor</p>
              </div>
            ) : (
              filtered.map(comp => (
                <button
                  key={comp.id}
                  onClick={() => setSelectedComp(comp)}
                  className={cn(
                    "text-left p-4 rounded-xl border transition-all",
                    selectedComp?.id === comp.id
                      ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-400 shadow-sm"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-slate-900">{comp.name}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-600">
                      {comp.category}
                    </Badge>
                  </div>
                  {comp.source_url && (
                    <p className="text-[11px] text-slate-500 truncate">{comp.source_url}</p>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Detail Panel */}
          {selectedComp && (
            <div className="space-y-4">
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base text-slate-900">{selectedComp.name}</CardTitle>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(selectedComp.id)}
                      className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedComp.html && (
                    <div>
                      <h4 className="text-xs text-slate-600 font-semibold mb-2">HTML</h4>
                      <CodeViewer code={selectedComp.html} language="html" maxHeight="200px" />
                    </div>
                  )}
                  {selectedComp.css && (
                    <div>
                      <h4 className="text-xs text-slate-600 font-semibold mb-2">CSS</h4>
                      <CodeViewer code={selectedComp.css} language="css" maxHeight="200px" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
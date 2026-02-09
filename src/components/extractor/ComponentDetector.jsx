import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Component, Square, FormInput, Menu, Table, Columns, 
  Layout, Save, Code2 
} from "lucide-react";
import { toast } from "sonner";
import { base44 } from '@/api/base44Client';

const COMPONENT_ICONS = {
  button: Square,
  card: Layout,
  form: FormInput,
  navigation: Menu,
  modal: Layout,
  table: Table,
  header: Columns,
  footer: Columns,
  sidebar: Layout,
};

export default function ComponentDetector({ components, onSaveComponent }) {
  if (!components || components.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-600">
        <Component className="w-12 h-12 mb-3" />
        <p className="text-sm">No se detectaron componentes</p>
      </div>
    );
  }

  const handleSave = async (comp) => {
    try {
      await base44.entities.SavedComponent.create({
        name: comp.name,
        category: comp.type,
        html: comp.html,
        css: '',
        source_url: '',
      });
      toast.success(`Componente ${comp.name} guardado`);
      if (onSaveComponent) onSaveComponent(comp);
    } catch (err) {
      toast.error('Error guardando: ' + err.message);
    }
  };

  const summary = components.reduce((acc, c) => {
    acc[c.type] = (acc[c.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-300">
          {components.length} componentes detectados
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(summary).map(([type, count]) => (
            <Badge key={type} variant="outline" className="text-[10px] border-white/10 text-slate-500">
              {count} {type}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2">
        {components.map((comp, i) => {
          const Icon = COMPONENT_ICONS[comp.type] || Component;
          return (
            <Card key={i} className="bg-[#161b22] border-white/5">
              <CardHeader className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-blue-400" />
                    <CardTitle className="text-sm text-slate-200">{comp.name}</CardTitle>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleSave(comp)}
                    className="h-7 w-7 text-slate-500 hover:text-slate-300"
                  >
                    <Save className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="bg-[#0d1117] rounded-lg p-2 border border-white/5">
                  <pre className="text-[10px] text-slate-400 font-mono overflow-hidden">
                    <code>{comp.html.substring(0, 150)}...</code>
                  </pre>
                </div>
                {comp.text && (
                  <p className="text-xs text-slate-600 mt-2 truncate">
                    Texto: {comp.text}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, X, Code2, Paintbrush, FileCode, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export default function CodeEditor({ initialData, onSave, onCancel }) {
  const [html, setHtml] = useState(initialData?.html || '');
  const [css, setCSS] = useState(initialData?.css || '');
  const [js, setJS] = useState(initialData?.js || '');
  const [activeTab, setActiveTab] = useState('html');

  const handleReset = () => {
    setHtml(initialData?.html || '');
    setCSS(initialData?.css || '');
    setJS(initialData?.js || '');
    toast.info('Código restaurado');
  };

  const handleSave = () => {
    onSave({ html, css, js });
    toast.success('Cambios guardados');
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0d1117] rounded-2xl border border-white/10 w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Code2 className="w-5 h-5 text-blue-400" />
            Editor de Código
          </h2>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleReset}
              variant="outline"
              size="sm"
              className="bg-transparent border-white/10 text-slate-400 hover:text-white"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Restaurar
            </Button>
            <Button
              onClick={handleSave}
              size="sm"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              Guardar
            </Button>
            <Button
              onClick={onCancel}
              variant="ghost"
              size="icon"
              className="text-slate-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Editor */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-6 mt-3 bg-[#161b22] border border-white/5 rounded-lg p-1">
            <TabsTrigger value="html" className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400">
              <Code2 className="w-3.5 h-3.5 mr-1.5" />
              HTML
            </TabsTrigger>
            <TabsTrigger value="css" className="data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400">
              <Paintbrush className="w-3.5 h-3.5 mr-1.5" />
              CSS
            </TabsTrigger>
            <TabsTrigger value="js" className="data-[state=active]:bg-amber-600/20 data-[state=active]:text-amber-400">
              <FileCode className="w-3.5 h-3.5 mr-1.5" />
              JavaScript
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 p-6 pt-3 min-h-0">
            <TabsContent value="html" className="h-full m-0">
              <textarea
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                className="w-full h-full bg-[#161b22] border border-white/5 rounded-xl p-4 text-slate-300 font-mono text-[13px] leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                spellCheck={false}
              />
            </TabsContent>
            <TabsContent value="css" className="h-full m-0">
              <textarea
                value={css}
                onChange={(e) => setCSS(e.target.value)}
                className="w-full h-full bg-[#161b22] border border-white/5 rounded-xl p-4 text-slate-300 font-mono text-[13px] leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                spellCheck={false}
              />
            </TabsContent>
            <TabsContent value="js" className="h-full m-0">
              <textarea
                value={js}
                onChange={(e) => setJS(e.target.value)}
                className="w-full h-full bg-[#161b22] border border-white/5 rounded-xl p-4 text-slate-300 font-mono text-[13px] leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                spellCheck={false}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code2, Paintbrush, FileCode, LayoutGrid, Braces, Component, Image, Monitor, Tablet, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import CodeViewer from './CodeViewer';
import StructureTree from './StructureTree';
import AssetsPanel from './AssetsPanel';
import ColorPalette from './ColorPalette';

const TABS = [
  { id: 'html', label: 'HTML', icon: Code2 },
  { id: 'css', label: 'CSS', icon: Paintbrush },
  { id: 'js', label: 'JS', icon: FileCode },
  { id: 'structure', label: 'Estructura', icon: LayoutGrid },
  { id: 'json', label: 'JSON', icon: Braces },
  { id: 'assets', label: 'Assets', icon: Image },
  { id: 'colors', label: 'Colores', icon: Component },
];

export default function PreviewPanel({ data, screenshotUrl }) {
  const [viewMode, setViewMode] = useState('desktop');
  const [activeTab, setActiveTab] = useState('html');

  const getCSS = () => {
    if (!data?.css) return '';
    let css = '';
    if (data.css.inline) css += '/* === INLINE STYLES === */\n' + data.css.inline + '\n\n';
    if (data.css.external) {
      data.css.external.forEach(ext => {
        css += `/* === ${ext.url} === */\n${ext.content}\n\n`;
      });
    }
    return css;
  };

  const getJS = () => {
    if (!data?.js) return '';
    return (data.js.inline || []).join('\n\n// ─────────────────\n\n');
  };

  const getJSON = () => {
    if (!data) return '';
    return JSON.stringify({
      metadata: data.metadata,
      structure: data.structure,
      assets: data.assets,
      css_links: data.css?.links,
      js_links: data.js?.external_links,
    }, null, 2);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Preview Zone */}
      <div className="relative bg-[#0d1117] rounded-xl border border-white/5 overflow-hidden mb-4">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-[#161b22]">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
            </div>
            <span className="text-[11px] text-slate-500 ml-2 font-mono truncate max-w-xs">
              {data?.metadata?.title || 'Vista previa'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {[
              { id: 'desktop', icon: Monitor },
              { id: 'tablet', icon: Tablet },
              { id: 'mobile', icon: Smartphone },
            ].map(v => (
              <button
                key={v.id}
                onClick={() => setViewMode(v.id)}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  viewMode === v.id ? "bg-blue-600/20 text-blue-400" : "text-slate-500 hover:text-slate-300"
                )}
              >
                <v.icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        </div>
        <div className="h-48 flex items-center justify-center overflow-hidden">
          {screenshotUrl ? (
            <img src={screenshotUrl} alt="Preview" className="w-full h-full object-cover object-top" />
          ) : data?.html ? (
            <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">
              <div className="text-center">
                <Monitor className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p>Página cargada</p>
                <p className="text-xs text-slate-600 mt-1">{data?.metadata?.framework || 'HTML'} • {data?.metadata?.total_size}</p>
              </div>
            </div>
          ) : (
            <div className="text-slate-600 text-sm">Ingresa una URL para comenzar</div>
          )}
        </div>
      </div>

      {/* Code Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="bg-[#161b22] border border-white/5 rounded-lg p-1 h-auto flex-wrap justify-start">
          {TABS.map(tab => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400 text-slate-500 text-xs gap-1.5 px-3 py-1.5 rounded-md"
            >
              <tab.icon className="w-3 h-3" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex-1 mt-3 min-h-0">
          <TabsContent value="html" className="m-0 h-full">
            <CodeViewer code={data?.html} language="html" maxHeight="350px" />
          </TabsContent>
          <TabsContent value="css" className="m-0 h-full">
            <CodeViewer code={getCSS()} language="css" maxHeight="350px" />
          </TabsContent>
          <TabsContent value="js" className="m-0 h-full">
            <CodeViewer code={getJS()} language="javascript" maxHeight="350px" />
          </TabsContent>
          <TabsContent value="structure" className="m-0 h-full">
            <StructureTree structure={data?.structure} />
          </TabsContent>
          <TabsContent value="json" className="m-0 h-full">
            <CodeViewer code={getJSON()} language="json" maxHeight="350px" />
          </TabsContent>
          <TabsContent value="assets" className="m-0 h-full">
            <AssetsPanel assets={data?.assets} />
          </TabsContent>
          <TabsContent value="colors" className="m-0 h-full">
            <ColorPalette colors={data?.assets?.colors} fonts={data?.assets?.fonts} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Copy, Download, Rocket, FileText, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

export default function ActionBar({ data, onGeneratePrompt, isGenerating, onCloneToBase44 }) {
  const [copied, setCopied] = useState(false);

  const handleCopyAll = async () => {
    if (!data) return;
    const fullCode = [
      '<!-- HTML -->', data.html?.substring(0, 50000) || '',
      '\n/* CSS */', data.css?.inline || '',
      ...(data.css?.external || []).map(e => e.content),
    ].join('\n\n');
    await navigator.clipboard.writeText(fullCode);
    setCopied(true);
    toast.success('Todo el código copiado');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    if (!data) return;
    const css = [data.css?.inline || '', ...(data.css?.external || []).map(e => e.content || '')].join('\n\n');
    const js = (data.js?.inline || []).join('\n\n');
    
    // Create a simple HTML file with embedded resources
    const fullHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.metadata?.title || 'Extracted Page'}</title>
  <style>${css}</style>
</head>
<body>
${data.html || ''}
<script>${js}</script>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'extracted-page.html';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Archivo exportado');
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        onClick={handleCopyAll}
        disabled={!data}
        variant="outline"
        size="sm"
        className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 text-xs h-9"
      >
        {copied ? <Check className="w-3.5 h-3.5 mr-1.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
        Copiar
      </Button>
      <Button
        onClick={handleExport}
        disabled={!data}
        variant="outline"
        size="sm"
        className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 text-xs h-9"
      >
        <Download className="w-3.5 h-3.5 mr-1.5" />
        Exportar
      </Button>
      <Button
        onClick={onGeneratePrompt}
        disabled={!data || isGenerating}
        size="sm"
        className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs h-9"
      >
        {isGenerating ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <FileText className="w-3.5 h-3.5 mr-1.5" />}
        Generar Prompt
      </Button>
      <Button
        disabled={!data}
        size="sm"
        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs h-9"
        onClick={onCloneToBase44}
      >
        <Rocket className="w-3.5 h-3.5 mr-1.5" />
        Clonar a Base44
      </Button>
    </div>
  );
}
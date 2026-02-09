import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Copy, Check, Download } from "lucide-react";
import { toast } from "sonner";

export default function CodeViewer({ code, language = "html", maxHeight = "400px" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code || '');
    setCopied(true);
    toast.success('Código copiado al portapapeles');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = { html: 'html', css: 'css', javascript: 'js', json: 'json' }[language] || 'txt';
    const blob = new Blob([code || ''], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extracted.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!code) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-600 text-sm">
        No hay código para mostrar
      </div>
    );
  }

  return (
    <div className="relative group">
      <div className="absolute top-3 right-3 z-10 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="icon"
          variant="ghost"
          onClick={handleCopy}
          className="h-7 w-7 bg-slate-800/80 hover:bg-slate-700 backdrop-blur-sm"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={handleDownload}
          className="h-7 w-7 bg-slate-800/80 hover:bg-slate-700 backdrop-blur-sm"
        >
          <Download className="w-3.5 h-3.5 text-slate-300" />
        </Button>
      </div>
      <div
        className="bg-[#0d1117] rounded-lg border border-white/5 overflow-auto font-mono text-[13px] leading-relaxed"
        style={{ maxHeight }}
      >
        <pre className="p-4 text-slate-300 whitespace-pre-wrap break-words">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}
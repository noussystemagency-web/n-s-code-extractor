import React, { useEffect, useRef } from 'react';
import { Monitor, Tablet, Smartphone, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const DEVICES = [
  { id: 'desktop', label: 'Desktop', icon: Monitor, width: '100%' },
  { id: 'tablet', label: 'Tablet', icon: Tablet, width: '768px' },
  { id: 'mobile', label: 'Mobile', icon: Smartphone, width: '375px' },
];

export default function LivePreview({ html, css, js, device = 'desktop' }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    if (!iframeRef.current) return;

    const iframe = iframeRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow.document;

    const fullHTML = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: system-ui, -apple-system, sans-serif; }
          ${css || ''}
        </style>
      </head>
      <body>
        ${html || ''}
        <script>
          try {
            ${js || ''}
          } catch (e) {
            console.error('Error en JS:', e);
          }
        </script>
      </body>
      </html>
    `;

    doc.open();
    doc.write(fullHTML);
    doc.close();
  }, [html, css, js]);

  const selectedDevice = DEVICES.find(d => d.id === device) || DEVICES[0];

  return (
    <div className="bg-[#0d1117] rounded-xl border border-white/5 overflow-hidden h-full">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-[#161b22]">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
          </div>
          <span className="text-[11px] text-slate-500 ml-2 font-mono">
            Vista Previa en Vivo
          </span>
        </div>
        <selectedDevice.icon className="w-4 h-4 text-slate-500" />
      </div>
      <div className="flex items-center justify-center p-4 min-h-[500px]">
        <div 
          className="transition-all duration-300 bg-white rounded-lg shadow-2xl overflow-hidden"
          style={{ width: selectedDevice.width, maxWidth: '100%' }}
        >
          <iframe
            ref={iframeRef}
            className="w-full h-[500px] border-0"
            sandbox="allow-scripts allow-same-origin"
            title="Live Preview"
          />
        </div>
      </div>
    </div>
  );
}
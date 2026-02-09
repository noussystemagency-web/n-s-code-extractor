import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Code2, Sparkles, Copy, Check } from "lucide-react";
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import CodeViewer from './CodeViewer';

export default function ReactConverter({ html, css }) {
  const [componentName, setComponentName] = useState('ExtractedComponent');
  const [isConverting, setIsConverting] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleConvert = async () => {
    setIsConverting(true);
    try {
      const response = await base44.functions.invoke('convertToReact', {
        html,
        css,
        componentName,
      });
      if (response.data?.success) {
        setResult(response.data.data);
        toast.success('Código convertido a React');
      }
    } catch (err) {
      toast.error('Error convirtiendo: ' + err.message);
    } finally {
      setIsConverting(false);
    }
  };

  const handleCopy = async () => {
    const fullCode = [
      ...(result?.imports || []),
      '',
      result?.main_component,
      '',
      ...(result?.sub_components || []),
    ].join('\n');
    await navigator.clipboard.writeText(fullCode);
    setCopied(true);
    toast.success('Código copiado');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#0d1117] rounded-xl border border-white/5 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-violet-400" />
          <h3 className="text-sm font-semibold text-slate-200">Convertir a React</h3>
        </div>
        <Badge className="bg-violet-500/10 text-violet-400 border-violet-500/20 text-[10px]">
          IA
        </Badge>
      </div>

      {!result ? (
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-slate-400 mb-2 block">
              Nombre del componente
            </Label>
            <Input
              value={componentName}
              onChange={(e) => setComponentName(e.target.value)}
              placeholder="MiComponente"
              className="bg-[#161b22] border-white/10 text-white h-9 text-sm"
            />
          </div>
          <Button
            onClick={handleConvert}
            disabled={isConverting || !html}
            className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500"
          >
            {isConverting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Convirtiendo...</>
            ) : (
              <><Code2 className="w-4 h-4 mr-2" /> Convertir a React + Tailwind</>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-200">{result.component_name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{result.description}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
              className="bg-transparent border-white/10 text-slate-400"
            >
              {copied ? <Check className="w-3 h-3 mr-1.5" /> : <Copy className="w-3 h-3 mr-1.5" />}
              Copiar todo
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-slate-400">Componente principal:</Label>
            <CodeViewer code={result.main_component} language="javascript" maxHeight="300px" />
          </div>

          {result.sub_components?.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Sub-componentes ({result.sub_components.length}):</Label>
              {result.sub_components.map((sub, i) => (
                <CodeViewer key={i} code={sub} language="javascript" maxHeight="200px" />
              ))}
            </div>
          )}

          {result.usage_example && (
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Ejemplo de uso:</Label>
              <CodeViewer code={result.usage_example} language="javascript" maxHeight="150px" />
            </div>
          )}

          <Button
            onClick={() => setResult(null)}
            variant="ghost"
            size="sm"
            className="w-full text-slate-500"
          >
            Convertir otro
          </Button>
        </div>
      )}
    </div>
  );
}
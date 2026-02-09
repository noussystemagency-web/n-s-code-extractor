import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function PromptModal({ open, onOpenChange, promptData }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(promptData?.prompt_text || '');
    setCopied(true);
    toast.success('Prompt copiado');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#0f1419] border-white/10 text-white max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Prompt generado para Base44
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {/* Metadata */}
          {promptData?.layout_type && (
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-blue-600/20 text-blue-400 border-blue-500/30">
                Layout: {promptData.layout_type}
              </Badge>
              <Badge className="bg-violet-600/20 text-violet-400 border-violet-500/30">
                Complejidad: {promptData.complexity}
              </Badge>
            </div>
          )}

          {/* Color Palette */}
          {promptData?.color_palette?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Paleta detectada</h4>
              <div className="flex flex-wrap gap-2">
                {promptData.color_palette.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5 border border-white/5">
                    <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: c.color }} />
                    <span className="text-xs text-slate-300 font-mono">{c.color}</span>
                    <span className="text-[10px] text-slate-500">{c.usage}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Components */}
          {promptData?.components_detected?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Componentes detectados</h4>
              <div className="flex flex-wrap gap-1.5">
                {promptData.components_detected.map((c, i) => (
                  <Badge key={i} variant="outline" className="text-xs border-white/10 text-slate-300">
                    {c.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Prompt Text */}
          <div className="bg-[#161b22] rounded-xl border border-white/5 p-4">
            <pre className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">
              {promptData?.prompt_text || 'Generando...'}
            </pre>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-white/5">
          <Button
            onClick={handleCopy}
            className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white"
          >
            {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            {copied ? 'Copiado' : 'Copiar Prompt'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
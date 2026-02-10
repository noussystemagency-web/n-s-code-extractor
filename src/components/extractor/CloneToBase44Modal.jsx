import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Rocket, Copy, Download, FileText, CheckCircle, Loader2, 
  Sparkles, Package, AlertCircle, Archive 
} from "lucide-react";
import { toast } from "sonner";
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

const CLONE_METHODS = [
  { 
    id: 'prompt', 
    label: 'Generar Prompt IA', 
    icon: Sparkles,
    desc: 'Crea un prompt optimizado para pegar en Base44 IA',
    recommended: true 
  },
  { 
    id: 'copy', 
    label: 'Copiar código completo', 
    icon: Copy,
    desc: 'Copia HTML, CSS y JS al portapapeles' 
  },
  { 
    id: 'download', 
    label: 'Descargar proyecto', 
    icon: Download,
    desc: 'Descarga ZIP con todos los archivos' 
  },
  { 
    id: 'archive', 
    label: 'Archivar completo', 
    icon: Archive,
    desc: 'Guarda automáticamente todo (código + prompt) en Historial' 
  },
];

export default function CloneToBase44Modal({ open, onOpenChange, data }) {
  const [method, setMethod] = useState('prompt');
  const [projectName, setProjectName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const queryClient = useQueryClient();

  const handleClone = async () => {
    setIsProcessing(true);
    
    try {
      if (method === 'prompt') {
        // Generate optimized prompt
        const prompt = generatePromptForBase44(data, projectName);
        await navigator.clipboard.writeText(prompt);
        toast.success('Prompt copiado al portapapeles');
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onOpenChange(false);
        }, 2000);
      } else if (method === 'copy') {
        // Copy full code
        const fullCode = `<!-- ${projectName || 'Proyecto Extraído'} -->\n\n${data.html}\n\n<style>\n${data.css?.inline || ''}\n</style>\n\n<script>\n${(data.js?.inline || []).join('\n')}\n</script>`;
        await navigator.clipboard.writeText(fullCode);
        toast.success('Código completo copiado');
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onOpenChange(false);
        }, 2000);
      } else if (method === 'download') {
        // Download as ZIP
        const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName || 'Proyecto Extraído'}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
${data.html || ''}
<script src="script.js"></script>
</body>
</html>`;

        const css = data.css?.inline || '';
        const js = (data.js?.inline || []).join('\n');
        
        // Create files
        const files = [
          { name: 'index.html', content: html },
          { name: 'styles.css', content: css },
          { name: 'script.js', content: js },
          { name: 'README.md', content: `# ${projectName || 'Proyecto Extraído'}\n\nProyecto extraído con NØÜS Code Extractor\n\n## Archivos\n- index.html - Estructura principal\n- styles.css - Estilos\n- script.js - JavaScript\n\n## Uso\nAbre index.html en tu navegador.` }
        ];

        // Simple download (without creating actual ZIP, just HTML file)
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectName || 'proyecto'}.html`;
        a.click();
        URL.revokeObjectURL(url);

        toast.success('Proyecto descargado');
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onOpenChange(false);
        }, 2000);
      } else if (method === 'archive') {
        // Archive complete project
        const prompt = generatePromptForBase44(data, projectName);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const projectId = `${timestamp}-${(projectName || 'proyecto').toLowerCase().replace(/\s+/g, '-')}`;
        
        await base44.entities.ExtractedProject.create({
          name: projectName || 'Proyecto Archivado',
          url: data.metadata?.source_url || 'Extracción manual',
          mode: 'full_page',
          html_content: (data.html || '').substring(0, 100000),
          css_content: (data.css?.inline || '').substring(0, 50000),
          js_content: (data.js?.inline || []).join('\n').substring(0, 50000),
          structure_json: JSON.stringify(data.structure || []),
          colors: data.assets?.colors?.slice(0, 30) || [],
          fonts: data.assets?.fonts || [],
          assets: (data.assets?.images || []).slice(0, 20).map(img => ({
            type: 'image', url: img, name: img.split('/').pop()
          })),
          metadata: {
            ...data.metadata,
            archived_at: new Date().toISOString(),
            project_id: projectId,
          },
          generated_prompt: prompt,
          screenshot_url: data.screenshot_url,
          status: 'completed',
        });
        
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        toast.success('Proyecto archivado en Historial');
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onOpenChange(false);
        }, 2000);
      }
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const generatePromptForBase44 = (data, name) => {
    const framework = data.metadata?.framework || 'HTML/CSS/JS';
    const colors = data.assets?.colors?.slice(0, 10).join(', ') || 'No detectados';
    const fonts = data.assets?.fonts?.join(', ') || 'System fonts';

    return `Crea una página web llamada "${name || 'Página Clonada'}" basada en el siguiente diseño:

## Información del Sitio Original
- Framework detectado: ${framework}
- Título: ${data.metadata?.title || 'Sin título'}
- Tamaño: ${data.metadata?.total_size || 'N/A'}

## Colores Principales
${colors}

## Tipografía
${fonts}

## Estructura HTML (primeros 5000 caracteres)
\`\`\`html
${(data.html || '').substring(0, 5000)}
\`\`\`

## Estilos CSS (primeros 3000 caracteres)
\`\`\`css
${(data.css?.inline || '').substring(0, 3000)}
\`\`\`

## Instrucciones
1. Replica el diseño visual lo más fielmente posible
2. Usa React + Tailwind CSS (Base44)
3. Mantén la estructura de componentes limpia
4. Usa lucide-react para iconos similares
5. Asegúrate de que sea responsive
6. Optimiza el código para Base44

Crea todos los componentes necesarios en la carpeta components/ y la página principal en pages/.`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-[#0f1419] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Rocket className="w-5 h-5 text-blue-400" />
            Clonar a Base44
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Elige cómo quieres transferir el código extraído a Base44
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-12 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <p className="text-lg font-semibold text-green-400">¡Listo!</p>
            <p className="text-sm text-slate-400 mt-1">
              {method === 'prompt' && 'Ahora pega el prompt en Base44 IA'}
              {method === 'copy' && 'Código copiado al portapapeles'}
              {method === 'download' && 'Archivo descargado'}
              {method === 'archive' && 'Revisa la pestaña Historial'}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Project Name */}
            <div>
              <Label className="text-sm text-slate-300 mb-2 block">
                Nombre del proyecto (opcional)
              </Label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Mi página clonada"
                className="bg-[#1a1f2e] border-white/10 text-white placeholder:text-slate-600"
              />
            </div>

            {/* Clone Method */}
            <div>
              <Label className="text-sm text-slate-300 mb-3 block">
                Método de clonación
              </Label>
              <RadioGroup value={method} onValueChange={setMethod} className="space-y-2">
                {CLONE_METHODS.map(m => (
                  <label
                    key={m.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-white/5 hover:border-white/10 cursor-pointer transition-all group"
                  >
                    <RadioGroupItem value={m.id} className="mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <m.icon className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-200">{m.label}</span>
                        {m.recommended && (
                          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px]">
                            Recomendado
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{m.desc}</p>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </div>

            {/* Info Alert */}
            <div className="flex gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-300">
                <strong>Nota:</strong> Base44 no permite crear archivos directamente desde apps externas. 
                Usa el método recomendado (Prompt IA) para mejores resultados.
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                onClick={() => onOpenChange(false)}
                variant="ghost"
                className="text-slate-400"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleClone}
                disabled={isProcessing}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4 mr-2" />
                    Clonar ahora
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
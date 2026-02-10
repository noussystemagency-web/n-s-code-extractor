import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Code2, Palette, FileCode, Sparkles, Copy, Download, 
  Rocket, CheckCircle, Globe, Calendar, Layers
} from "lucide-react";
import { toast } from "sonner";
import moment from 'moment';

export default function ProjectDetailsModal({ open, onOpenChange, project }) {
  const [activeTab, setActiveTab] = useState('html');
  const [copied, setCopied] = useState(false);

  if (!project) return null;

  const handleCopy = async (content, label) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success(`${label} copiado`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Error al copiar');
    }
  };

  const handleCopyAll = async () => {
    const fullCode = `<!-- ${project.name} -->

<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.name}</title>
  <style>
${project.css_content || '/* No hay CSS */'}
  </style>
</head>
<body>
${project.html_content || '<!-- No hay HTML -->'}
<script>
${project.js_content || '// No hay JavaScript'}
</script>
</body>
</html>`;
    await handleCopy(fullCode, 'Código completo');
  };

  const handleDownload = () => {
    const fullCode = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.name}</title>
  <style>
${project.css_content || ''}
  </style>
</head>
<body>
${project.html_content || ''}
<script>
${project.js_content || ''}
</script>
</body>
</html>`;
    
    const blob = new Blob([fullCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '-')}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Proyecto descargado');
  };

  const handleClone = async () => {
    if (project.generated_prompt) {
      await handleCopy(project.generated_prompt, 'Prompt IA');
      toast.info('Ahora pega el prompt en Base44 IA', { duration: 4000 });
    } else {
      await handleCopyAll();
      toast.info('Código copiado - pégalo en Base44', { duration: 4000 });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            {project.name}
          </DialogTitle>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-2">
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              <a href={project.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
                {project.url}
              </a>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {moment(project.created_date).format('DD/MM/YYYY HH:mm')}
            </div>
            {project.metadata?.framework && (
              <Badge variant="outline" className="text-[10px]">
                {project.metadata.framework}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Screenshot Preview */}
        {project.screenshot_url && (
          <div className="mb-4">
            <img
              src={project.screenshot_url}
              alt="Screenshot"
              className="w-full h-48 object-cover rounded-lg border border-slate-200"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pb-4 border-b border-slate-200">
          <Button
            onClick={handleClone}
            size="sm"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500"
          >
            <Rocket className="w-3.5 h-3.5 mr-1.5" />
            Clonar a Base44
          </Button>
          <Button
            onClick={handleCopyAll}
            size="sm"
            variant="outline"
          >
            <Copy className="w-3.5 h-3.5 mr-1.5" />
            Copiar todo
          </Button>
          <Button
            onClick={handleDownload}
            size="sm"
            variant="outline"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Descargar HTML
          </Button>
        </div>

        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="html" className="text-xs">
              <Code2 className="w-3.5 h-3.5 mr-1.5" />
              HTML
            </TabsTrigger>
            <TabsTrigger value="css" className="text-xs">
              <Palette className="w-3.5 h-3.5 mr-1.5" />
              CSS
            </TabsTrigger>
            <TabsTrigger value="js" className="text-xs">
              <FileCode className="w-3.5 h-3.5 mr-1.5" />
              JavaScript
            </TabsTrigger>
            <TabsTrigger value="prompt" className="text-xs">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Prompt IA
            </TabsTrigger>
          </TabsList>

          <TabsContent value="html" className="mt-4 h-[400px] overflow-auto">
            <div className="relative">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleCopy(project.html_content || '', 'HTML')}
                className="absolute top-2 right-2 z-10"
              >
                {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto">
                <code>{project.html_content || '<!-- No hay HTML -->'}</code>
              </pre>
            </div>
          </TabsContent>

          <TabsContent value="css" className="mt-4 h-[400px] overflow-auto">
            <div className="relative">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleCopy(project.css_content || '', 'CSS')}
                className="absolute top-2 right-2 z-10"
              >
                {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto">
                <code>{project.css_content || '/* No hay CSS */'}</code>
              </pre>
            </div>
          </TabsContent>

          <TabsContent value="js" className="mt-4 h-[400px] overflow-auto">
            <div className="relative">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleCopy(project.js_content || '', 'JavaScript')}
                className="absolute top-2 right-2 z-10"
              >
                {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto">
                <code>{project.js_content || '// No hay JavaScript'}</code>
              </pre>
            </div>
          </TabsContent>

          <TabsContent value="prompt" className="mt-4 h-[400px] overflow-auto">
            <div className="relative">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleCopy(project.generated_prompt || '', 'Prompt IA')}
                className="absolute top-2 right-2 z-10"
              >
                {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
              <pre className="bg-gradient-to-br from-purple-900 to-indigo-900 text-white p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
                {project.generated_prompt || 'No hay prompt IA generado para este proyecto'}
              </pre>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import { Sparkles, Loader2, Copy, Download, ArrowRight, Code2 } from "lucide-react";
import CodeViewer from './CodeViewer';

export default function AICodeGenerator({ onInsertCode }) {
  const [prompt, setPrompt] = useState('');
  const [codeType, setCodeType] = useState('html');
  const [generatedCode, setGeneratedCode] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateCode = async () => {
    if (!prompt.trim()) {
      toast.error('Escribe una descripción');
      return;
    }

    setIsGenerating(true);
    try {
      const typeInstructions = {
        html: 'Genera solo HTML semántico y bien estructurado. No incluyas tags <html>, <head> o <body>, solo el contenido.',
        css: 'Genera solo CSS moderno y optimizado. Usa clases descriptivas y buenas prácticas.',
        javascript: 'Genera solo JavaScript moderno (ES6+). Código limpio y bien comentado.',
        component: 'Genera un componente web completo con HTML, CSS inline en <style>, y JavaScript en <script>. Todo en un solo bloque.'
      };

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `${typeInstructions[codeType]}

**Descripción del usuario:**
${prompt}

**Instrucciones:**
- Código de producción, listo para usar
- Responsive y moderno
- Sigue las mejores prácticas de ${codeType.toUpperCase()}
- No incluyas explicaciones, solo el código
${codeType === 'component' ? '- Estructura: HTML con <style> y <script> tags inline' : ''}`,
        response_json_schema: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'El código generado' },
            html: { type: 'string', description: 'HTML si es componente' },
            css: { type: 'string', description: 'CSS si es componente' },
            js: { type: 'string', description: 'JavaScript si es componente' },
            description: { type: 'string', description: 'Breve descripción del código generado' }
          }
        }
      });

      if (response) {
        setGeneratedCode(response);
        toast.success('✨ Código generado');
      }
    } catch (err) {
      toast.error('Error generando código: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    const codeToCopy = codeType === 'component' 
      ? `${generatedCode.html || ''}\n\n<style>\n${generatedCode.css || ''}\n</style>\n\n<script>\n${generatedCode.js || ''}\n</script>`
      : generatedCode.code || '';
    await navigator.clipboard.writeText(codeToCopy);
    toast.success('Código copiado');
  };

  const handleDownload = () => {
    const codeToCopy = codeType === 'component' 
      ? `${generatedCode.html || ''}\n\n<style>\n${generatedCode.css || ''}\n</style>\n\n<script>\n${generatedCode.js || ''}\n</script>`
      : generatedCode.code || '';
    const blob = new Blob([codeToCopy], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `generated-${codeType}.${codeType === 'component' ? 'html' : codeType === 'javascript' ? 'js' : codeType}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Descargado');
  };

  const handleInsert = () => {
    if (generatedCode && onInsertCode) {
      if (codeType === 'component') {
        onInsertCode({
          html: generatedCode.html || '',
          css: generatedCode.css || '',
          js: generatedCode.js || '',
        });
      } else if (codeType === 'html') {
        onInsertCode({ html: generatedCode.code || '' });
      } else if (codeType === 'css') {
        onInsertCode({ css: generatedCode.code || '' });
      } else if (codeType === 'javascript') {
        onInsertCode({ js: generatedCode.code || '' });
      }
      toast.success('Código insertado');
    }
  };

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-900">
          <Sparkles className="w-5 h-5 text-purple-600" />
          Generador de Código IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input Area */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Select value={codeType} onValueChange={setCodeType}>
              <SelectTrigger className="w-40 h-9 bg-white border-purple-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="html">HTML</SelectItem>
                <SelectItem value="css">CSS</SelectItem>
                <SelectItem value="javascript">JavaScript</SelectItem>
                <SelectItem value="component">Componente Completo</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-purple-600 font-medium">
              {codeType === 'component' ? 'HTML + CSS + JS' : codeType.toUpperCase()}
            </span>
          </div>
          
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe el código que quieres generar... Ej: 'Un botón con gradiente que tenga efecto hover y sea responsive'"
            className="min-h-24 bg-white border-purple-200 text-slate-900 placeholder:text-slate-400"
          />
          
          <Button
            onClick={generateCode}
            disabled={isGenerating || !prompt.trim()}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 h-10"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generando código...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generar con IA
              </>
            )}
          </Button>
        </div>

        {/* Generated Code Display */}
        {generatedCode && (
          <div className="space-y-3 p-4 rounded-lg bg-white border border-purple-200">
            {generatedCode.description && (
              <p className="text-xs text-slate-600 italic border-l-2 border-purple-300 pl-3">
                {generatedCode.description}
              </p>
            )}

            {codeType === 'component' ? (
              <Tabs defaultValue="html" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-purple-50">
                  <TabsTrigger value="html" className="text-xs">HTML</TabsTrigger>
                  <TabsTrigger value="css" className="text-xs">CSS</TabsTrigger>
                  <TabsTrigger value="js" className="text-xs">JavaScript</TabsTrigger>
                </TabsList>
                <TabsContent value="html" className="mt-2">
                  <CodeViewer code={generatedCode.html || ''} language="html" />
                </TabsContent>
                <TabsContent value="css" className="mt-2">
                  <CodeViewer code={generatedCode.css || ''} language="css" />
                </TabsContent>
                <TabsContent value="js" className="mt-2">
                  <CodeViewer code={generatedCode.js || ''} language="javascript" />
                </TabsContent>
              </Tabs>
            ) : (
              <CodeViewer 
                code={generatedCode.code || ''} 
                language={codeType === 'javascript' ? 'javascript' : codeType}
              />
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                onClick={handleCopy}
                size="sm"
                variant="outline"
                className="flex-1 bg-white border-purple-200 text-purple-700 hover:bg-purple-50"
              >
                <Copy className="w-3 h-3 mr-1.5" />
                Copiar
              </Button>
              <Button
                onClick={handleDownload}
                size="sm"
                variant="outline"
                className="flex-1 bg-white border-purple-200 text-purple-700 hover:bg-purple-50"
              >
                <Download className="w-3 h-3 mr-1.5" />
                Descargar
              </Button>
              {onInsertCode && (
                <Button
                  onClick={handleInsert}
                  size="sm"
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
                >
                  <ArrowRight className="w-3 h-3 mr-1.5" />
                  Insertar
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Examples */}
        {!generatedCode && (
          <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
            <p className="text-xs font-semibold text-purple-900 mb-2">💡 Ejemplos de prompts:</p>
            <ul className="text-xs text-purple-700 space-y-1">
              <li>• "Navbar responsive con logo y menú hamburguesa"</li>
              <li>• "Tarjeta de producto con imagen, título, precio y botón"</li>
              <li>• "Animación de carga con spinner y texto"</li>
              <li>• "Formulario de contacto con validación"</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
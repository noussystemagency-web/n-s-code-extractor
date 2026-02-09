import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Crosshair, Loader2, Settings, Zap, Code2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import ModeSelector from '../components/extractor/ModeSelector';
import UrlInput from '../components/extractor/UrlInput';
import ExtractionOptions from '../components/extractor/ExtractionOptions';
import PreviewPanel from '../components/extractor/PreviewPanel';
import ActionBar from '../components/extractor/ActionBar';
import RecentProjects from '../components/extractor/RecentProjects';
import MetadataBar from '../components/extractor/MetadataBar';
import PromptModal from '../components/extractor/PromptModal';
import CodeEditor from '../components/extractor/CodeEditor';
import AdvancedOptions from '../components/extractor/AdvancedOptions';

export default function Extractor() {
  const [mode, setMode] = useState('full_page');
  const [extractedData, setExtractedData] = useState(null);
  const [screenshotUrl, setScreenshotUrl] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [promptData, setPromptData] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [useAdvancedExtraction, setUseAdvancedExtraction] = useState(true);
  const [currentUrl, setCurrentUrl] = useState('');
  const [options, setOptions] = useState({
    html: true, css_inline: true, css_external: true,
    javascript: true, images: true, fonts: true, structure: true,
  });
  const [optimizationOptions, setOptimizationOptions] = useState({
    removeComments: false, removeUnusedCSS: false, minifyCSS: false,
    minifyHTML: false, minifyJS: false, removeScripts: false,
    removeEmptyElements: false, removeInlineStyles: false,
    combineMediaQueries: false, removeConsole: false, removeDebugger: false,
  });
  const [cleanup, setCleanup] = useState({
    remove_scripts: false, minify: false, optimize: false,
  });

  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.ExtractedProject.list('-created_date', 8),
  });

  const handleExtract = async (url) => {
    setCurrentUrl(url);
    setIsExtracting(true);
    setExtractedData(null);
    setScreenshotUrl(null);

    try {
      const functionName = useAdvancedExtraction ? 'extractWebPageAdvanced' : 'extractWebPage';
      const response = await base44.functions.invoke(functionName, {
        url,
        options: { mode, ...options, cleanup },
      });

      if (response.data?.success) {
        setExtractedData(response.data.data);
        setScreenshotUrl(response.data.data?.screenshot_url);
        toast.success('Extracción completada con ' + (useAdvancedExtraction ? 'navegador headless' : 'scraping básico'));

        // Save project
        const projName = response.data.data?.metadata?.title || new URL(url).hostname;
        await base44.entities.ExtractedProject.create({
          name: projName,
          url,
          mode,
          html_content: (response.data.data?.html || '').substring(0, 100000),
          css_content: (response.data.data?.css?.inline || '').substring(0, 50000),
          js_content: (response.data.data?.js?.inline || []).join('\n').substring(0, 50000),
          structure_json: JSON.stringify(response.data.data?.structure || []),
          colors: response.data.data?.assets?.colors?.slice(0, 30) || [],
          fonts: response.data.data?.assets?.fonts || [],
          assets: (response.data.data?.assets?.images || []).slice(0, 20).map(img => ({
            type: 'image', url: img, name: img.split('/').pop()
          })),
          metadata: response.data.data?.metadata || {},
          screenshot_url: response.data.data?.screenshot_url,
          status: 'completed',
        });
        queryClient.invalidateQueries({ queryKey: ['projects'] });
      } else {
        toast.error(response.data?.error || 'Error en la extracción');
      }
    } catch (err) {
      toast.error('Error: ' + (err.message || 'No se pudo extraer'));
    } finally {
      setIsExtracting(false);
    }
  };

  const handleOptimizeCode = async () => {
    if (!extractedData) return;
    setIsOptimizing(true);
    try {
      const response = await base44.functions.invoke('optimizeCode', {
        html: extractedData.html,
        css: extractedData.css?.inline || '',
        js: (extractedData.js?.inline || []).join('\n'),
        options: optimizationOptions,
      });

      if (response.data?.success) {
        setExtractedData({
          ...extractedData,
          html: response.data.data.html,
          css: { ...extractedData.css, inline: response.data.data.css },
          js: { ...extractedData.js, inline: [response.data.data.js] },
        });
        toast.success(`Código optimizado: ${response.data.data.stats.reduction} reducción`);
      }
    } catch (err) {
      toast.error('Error optimizando: ' + err.message);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleSaveEdited = (edited) => {
    setExtractedData({
      ...extractedData,
      html: edited.html,
      css: { ...extractedData.css, inline: edited.css },
      js: { ...extractedData.js, inline: [edited.js] },
    });
    setShowEditor(false);
  };

  const handleGeneratePrompt = async () => {
    if (!extractedData) return;
    setIsGenerating(true);
    try {
      const response = await base44.functions.invoke('generatePrompt', {
        html: (extractedData.html || '').substring(0, 8000),
        css: extractedData.css?.inline?.substring(0, 5000) || '',
        structure: extractedData.structure,
        metadata: extractedData.metadata,
        colors: extractedData.assets?.colors?.slice(0, 20),
        fonts: extractedData.assets?.fonts,
      });
      if (response.data?.success) {
        setPromptData(response.data.data);
        setShowPrompt(true);
      } else {
        toast.error('Error generando prompt');
      }
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectProject = (project) => {
    setCurrentUrl(project.url);
    setExtractedData({
      html: project.html_content,
      css: { inline: project.css_content, external: [], links: [] },
      js: { inline: project.js_content ? [project.js_content] : [], external_links: [] },
      structure: project.structure_json ? JSON.parse(project.structure_json) : [],
      assets: {
        images: (project.assets || []).filter(a => a.type === 'image').map(a => a.url),
        fonts: project.fonts || [],
        colors: project.colors || [],
      },
      metadata: project.metadata || {},
    });
    setScreenshotUrl(project.screenshot_url);
  };

  const handleDeleteProject = async (id) => {
    await base44.entities.ExtractedProject.delete(id);
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    toast.success('Proyecto eliminado');
  };

  return (
    <div className="min-h-screen bg-[#0f1419] text-white">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#0f1419]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Crosshair className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">
                NØÜS <span className="text-amber-400">Code Extractor</span>
              </h1>
              <p className="text-[10px] text-slate-500 -mt-0.5">Web Cloner & Analyzer</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {extractedData?.metadata && <MetadataBar metadata={extractedData.metadata} />}
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          {/* Left Panel - Controls */}
          <div className="space-y-5 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
            <ModeSelector mode={mode} setMode={setMode} />
            
            <div>
              <label className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={useAdvancedExtraction}
                  onChange={(e) => setUseAdvancedExtraction(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-transparent text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="text-sm text-slate-300 font-medium">Extracción Avanzada</div>
                  <div className="text-[11px] text-slate-600">Navegador headless + SPAs</div>
                </div>
              </label>
            </div>

            <UrlInput onSubmit={handleExtract} isLoading={isExtracting} />
            <ExtractionOptions
              options={options}
              setOptions={setOptions}
              cleanup={cleanup}
              setCleanup={setCleanup}
            />
            <AdvancedOptions
              options={optimizationOptions}
              setOptions={setOptimizationOptions}
            />
            <div className="space-y-2">
              <Button
                onClick={() => currentUrl && handleExtract(currentUrl)}
                disabled={!currentUrl || isExtracting}
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Extrayendo...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Extraer TODO
                  </>
                )}
              </Button>
              {extractedData && (
                <Button
                  onClick={handleOptimizeCode}
                  disabled={isOptimizing}
                  variant="outline"
                  className="w-full h-10 bg-transparent border-violet-500/30 text-violet-400 hover:bg-violet-500/10"
                >
                  {isOptimizing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                      Optimizando...
                    </>
                  ) : (
                    'Optimizar Código'
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Right Panel - Preview & Code */}
          <div className="space-y-4">
            <PreviewPanel data={extractedData} screenshotUrl={screenshotUrl} />
            <div className="flex flex-wrap gap-2">
              <ActionBar
                data={extractedData}
                onGeneratePrompt={handleGeneratePrompt}
                isGenerating={isGenerating}
              />
              {extractedData && (
                <Button
                  onClick={() => setShowEditor(true)}
                  variant="outline"
                  size="sm"
                  className="bg-transparent border-white/10 text-slate-300 hover:bg-white/5 hover:text-white text-xs h-9"
                >
                  <Code2 className="w-3.5 h-3.5 mr-1.5" />
                  Editar Código
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Recent Projects */}
        <div className="mt-8">
          <RecentProjects
            projects={projects}
            onSelect={handleSelectProject}
            onDelete={handleDeleteProject}
          />
        </div>
      </div>

      {/* Disclaimer */}
      <footer className="border-t border-white/5 mt-12 py-4">
        <p className="text-center text-[11px] text-slate-600 max-w-2xl mx-auto px-4">
          Esta herramienta es para uso educativo y análisis de páginas propias o públicas.
          Respeta copyright y términos de servicio. NØÜS SYSTEM no se responsabiliza del uso indebido.
        </p>
      </footer>

      <PromptModal
        open={showPrompt}
        onOpenChange={setShowPrompt}
        promptData={promptData}
      />

      {showEditor && (
        <CodeEditor
          initialData={{
            html: extractedData?.html || '',
            css: extractedData?.css?.inline || '',
            js: (extractedData?.js?.inline || []).join('\n'),
          }}
          onSave={handleSaveEdited}
          onCancel={() => setShowEditor(false)}
        />
      )}
    </div>
  );
}
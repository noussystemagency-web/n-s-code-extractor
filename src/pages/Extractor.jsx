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
import CloneToBase44Modal from '../components/extractor/CloneToBase44Modal';
import LivePreview from '../components/extractor/LivePreview';
import ComponentDetector from '../components/extractor/ComponentDetector';
import AnalysisPanel from '../components/extractor/AnalysisPanel';
import ReactConverter from '../components/extractor/ReactConverter';
import SiteExtractionProgress from '../components/extractor/SiteExtractionProgress';
import FullSitePreview from '../components/extractor/FullSitePreview';

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
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [detectedComponents, setDetectedComponents] = useState([]);
  const [previewDevice, setPreviewDevice] = useState('desktop');
  const [useAdvancedExtraction, setUseAdvancedExtraction] = useState(false);
  const [useEnhancedComponentDetection, setUseEnhancedComponentDetection] = useState(true);
  const [currentUrl, setCurrentUrl] = useState('');
  const [options, setOptions] = useState({
    html: true, css_inline: true, css_external: true,
    javascript: true, images: true, fonts: true, structure: true,
    render_spa: false,
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
    if (!url) {
      toast.error('Ingresa una URL válida');
      return;
    }

    if (isExtracting) {
      toast.info('Ya se está extrayendo... espera a que termine');
      return;
    }

    setCurrentUrl(url);
    setIsExtracting(true);
    setExtractedData(null);
    setScreenshotUrl(null);
    toast.info('Extrayendo contenido...');

    try {
      const functionName = useAdvancedExtraction ? 'extractWebPageAdvanced' : 'extractWebPage';
      
      const response = await base44.functions.invoke(functionName, {
        url,
        options: options,
        mode: mode,
        cleanup: cleanup,
      });

      if (response.data?.success) {
        setExtractedData(response.data.data);
        setScreenshotUrl(response.data.data?.screenshot_url);
        toast.success('✅ Extracción completada');

        // Save project
        if (response.data?.data) {
          const projName = response.data.data?.metadata?.title || new URL(url).hostname;
          await base44.entities.ExtractedProject.create({
            name: projName,
            url,
            mode,
            html_content: (response.data.data?.html || '').substring(0, 100000),
            css_content: (response.data.data?.css?.inline || '').substring(0, 50000),
            js_content: Array.isArray(response.data.data?.js?.inline) ? response.data.data.js.inline.join('\n').substring(0, 50000) : (response.data.data?.js?.inline || '').substring(0, 50000),
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
        }
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

  const handleDetectComponents = async () => {
    if (!extractedData) return;
    try {
      const response = await base44.functions.invoke('detectComponents', {
        html: extractedData.html,
        css: extractedData.css?.inline,
        enhanced: useEnhancedComponentDetection,
        structure: extractedData.structure,
      });
      if (response.data?.success) {
        setDetectedComponents(response.data.data.components);
        toast.success(`${response.data.data.components.length} componentes detectados`);
      }
    } catch (err) {
      toast.error('Error detectando componentes');
    }
  };

  useEffect(() => {
    if (extractedData) {
      handleDetectComponents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extractedData]);

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
    try {
      setCurrentUrl(project.url);
      const jsInline = project.js_content ? (typeof project.js_content === 'string' ? [project.js_content] : project.js_content) : [];
      const structureData = project.structure_json ? (typeof project.structure_json === 'string' ? JSON.parse(project.structure_json) : project.structure_json) : [];
      
      setExtractedData({
        html: project.html_content || '',
        css: { inline: project.css_content || '', external: [], links: [] },
        js: { inline: jsInline, external_links: [] },
        structure: structureData,
        assets: {
          images: (project.assets || []).filter(a => a.type === 'image').map(a => a.url),
          fonts: project.fonts || [],
          colors: project.colors || [],
        },
        metadata: project.metadata || {},
      });
      setScreenshotUrl(project.screenshot_url);
    } catch (err) {
      toast.error('Error cargando proyecto');
    }
  };

  const handleDeleteProject = async (id) => {
    await base44.entities.ExtractedProject.delete(id);
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    toast.success('Proyecto eliminado');
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Crosshair className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-slate-900">
                NØÜS <span className="text-blue-600">Code Extractor</span>
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
            
            <div className="space-y-2 bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
              <label className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={options.render_spa}
                  onChange={(e) => setOptions({...options, render_spa: e.target.checked})}
                  className="w-4 h-4 rounded border-slate-300 bg-white text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <div className="text-sm text-slate-700 font-medium">Renderizar JavaScript (SPAs)</div>
                  <div className="text-[11px] text-slate-500">Ejecuta JS antes de extraer</div>
                </div>
              </label>
              <label className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={useAdvancedExtraction}
                  onChange={(e) => setUseAdvancedExtraction(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="text-sm text-slate-700 font-medium">Extracción Avanzada</div>
                  <div className="text-[11px] text-slate-500">Navegador headless + más opciones</div>
                </div>
              </label>
              <label className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={useEnhancedComponentDetection}
                  onChange={(e) => setUseEnhancedComponentDetection(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 bg-white text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="text-sm text-slate-700 font-medium">Detección Mejorada</div>
                  <div className="text-[11px] text-slate-500">Análisis profundo de componentes</div>
                </div>
              </label>
            </div>

            <UrlInput 
              onSubmit={handleExtract} 
              isLoading={isExtracting}
              onUrlChange={setCurrentUrl}
            />
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
                  className="w-full h-10 bg-white border-indigo-300 text-indigo-600 hover:bg-indigo-50"
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
            {showLivePreview && extractedData ? (
              <LivePreview
                html={extractedData.html}
                css={extractedData.css?.inline}
                js={(extractedData.js?.inline || []).join('\n')}
                device={previewDevice}
              />
            ) : (
              <PreviewPanel data={extractedData} screenshotUrl={screenshotUrl} />
            )}
            
            <div className="flex flex-wrap gap-2">
              <ActionBar
                data={extractedData}
                onGeneratePrompt={handleGeneratePrompt}
                onCloneToBase44={() => setShowCloneModal(true)}
                isGenerating={isGenerating}
              />
              {extractedData && (
                <>
                  <Button
                    onClick={() => setShowEditor(true)}
                    variant="outline"
                    size="sm"
                    className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 text-xs h-9"
                  >
                    <Code2 className="w-3.5 h-3.5 mr-1.5" />
                    Editar Código
                  </Button>
                  <Button
                    onClick={() => setShowLivePreview(!showLivePreview)}
                    variant="outline"
                    size="sm"
                    className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 text-xs h-9"
                  >
                    {showLivePreview ? 'Ver Código' : 'Vista Previa Viva'}
                  </Button>
                </>
              )}
            </div>

            {/* Additional Panels */}
            {extractedData && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ComponentDetector 
                  components={detectedComponents}
                  onSaveComponent={() => queryClient.invalidateQueries({ queryKey: ['components'] })}
                />
                <ReactConverter 
                  html={extractedData.html}
                  css={extractedData.css?.inline}
                />
              </div>
            )}

            {extractedData && (
              <AnalysisPanel extractedData={extractedData} />
            )}
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
      <footer className="border-t border-slate-200 mt-12 py-4">
        <p className="text-center text-[11px] text-slate-500 max-w-2xl mx-auto px-4">
          Esta herramienta es para uso educativo y análisis de páginas propias o públicas.
          Respeta copyright y términos de servicio. NØÜS SYSTEM no se responsabiliza del uso indebido.
        </p>
      </footer>

      <PromptModal
        open={showPrompt}
        onOpenChange={setShowPrompt}
        promptData={promptData}
      />

      <CloneToBase44Modal
        open={showCloneModal}
        onOpenChange={setShowCloneModal}
        data={extractedData}
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
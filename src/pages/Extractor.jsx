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
import AICodeGenerator from '../components/extractor/AICodeGenerator';
import AICodeManipulation from '../components/extractor/AICodeManipulation';

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
  const [isCrawling, setIsCrawling] = useState(false);
  const [siteData, setSiteData] = useState(null);
  const [crawlProgress, setCrawlProgress] = useState([]);
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

  const { data: projects = [], isLoading: isLoadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.ExtractedProject.list('-created_date', 8),
  });

  const [statusFilter, setStatusFilter] = useState('all');
  const [frameworkFilter, setFrameworkFilter] = useState('all');

  const stats = {
    total: projects.length,
    completed: projects.filter(p => p.status === 'completed').length,
    extracting: projects.filter(p => p.status === 'extracting').length,
    error: projects.filter(p => p.status === 'error').length,
  };

  const frameworks = [...new Set(projects.map(p => p.metadata?.framework).filter(Boolean))];

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
    
    if (window.addNotification) {
      window.addNotification({
        type: 'loading',
        title: 'Extrayendo contenido',
        message: `Procesando ${url}...`
      });
    }

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
        
        if (window.addNotification) {
          window.addNotification({
            type: 'success',
            title: 'Extracción completada',
            message: `${response.data.data?.metadata?.title || 'Página'} extraída exitosamente`
          });
        }

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

  const handleInsertGeneratedCode = (generatedCode) => {
    if (!extractedData) {
      setExtractedData({
        html: generatedCode.html || '',
        css: { inline: generatedCode.css || '', external: [], links: [] },
        js: { inline: generatedCode.js ? [generatedCode.js] : [], external_links: [] },
        structure: [],
        assets: { images: [], fonts: [], colors: [] },
        metadata: { title: 'Código Generado por IA', framework: 'Generated' },
      });
    } else {
      setExtractedData({
        ...extractedData,
        html: (extractedData.html || '') + '\n\n' + (generatedCode.html || ''),
        css: {
          ...extractedData.css,
          inline: (extractedData.css?.inline || '') + '\n\n' + (generatedCode.css || ''),
        },
        js: {
          ...extractedData.js,
          inline: [...(extractedData.js?.inline || []), generatedCode.js || ''].filter(Boolean),
        },
      });
    }
    toast.success('Código insertado en el extractor');
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

  const handleCrawlWebsite = async (url) => {
    if (!url) {
      toast.error('Ingresa una URL válida');
      return;
    }

    setIsCrawling(true);
    setCrawlProgress([]);
    setSiteData(null);
    toast.info('Descubriendo y extrayendo páginas...');

    try {
      const response = await base44.functions.invoke('crawlWebsite', {
        baseUrl: url,
        maxPages: 30,
        render_spa: options.render_spa,
      });

      if (response.data?.success) {
        const pages = response.data.data.pages.map(p => ({
          ...p,
          status: 'completed'
        }));
        
        setCrawlProgress(pages);
        setSiteData(response.data.data);
        toast.success(`✅ ${response.data.data.totalPages} páginas extraídas`);
      } else {
        toast.error(response.data?.error || 'Error en la extracción');
      }
    } catch (err) {
      toast.error('Error: ' + (err.message || 'No se pudo extraer'));
    } finally {
      setIsCrawling(false);
    }
  };

  const handleSendSiteToBase44 = async () => {
    if (!siteData || !siteData.pages.length) return;

    try {
      const projectName = `${siteData.siteName} - Sitio Completo`;
      const combinedHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; }
    nav { background: white; border-bottom: 1px solid #ddd; padding: 0 20px; }
    nav a { display: inline-block; padding: 15px 20px; text-decoration: none; color: #333; border-bottom: 3px solid transparent; transition: all 0.2s; }
    nav a:hover, nav a.active { color: #0066cc; border-bottom-color: #0066cc; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .page-content { display: none; }
    .page-content.active { display: block; }
  </style>
</head>
<body>
  <nav id="site-nav">
    ${siteData.pages.map((p, i) => `<a href="#page-${i}" class="nav-link ${i === 0 ? 'active' : ''}" data-page="${i}">${p.title}</a>`).join('')}
  </nav>
  
  <div class="container">
    ${siteData.pages.map((p, i) => `<div id="page-${i}" class="page-content ${i === 0 ? 'active' : ''}">${p.html}</div>`).join('')}
  </div>

  <style>
    ${siteData.pages.map(p => p.css).filter(Boolean).join('\n')}
  </style>

  <script>
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        const pageId = link.getAttribute('data-page');
        document.getElementById('page-' + pageId).classList.add('active');
        link.classList.add('active');
      });
    });
  </script>
</body>
</html>`;

      await base44.entities.ExtractedProject.create({
        name: projectName,
        url: siteData.baseUrl,
        mode: 'url_complete',
        html_content: combinedHtml.substring(0, 100000),
        css_content: siteData.pages.map(p => p.css).join('\n\n').substring(0, 50000),
        structure_json: JSON.stringify({ pages: siteData.pages.length }),
        colors: [],
        fonts: [],
        assets: [],
        metadata: {
          title: projectName,
          framework: 'Multi-page Site',
          total_size: `${(combinedHtml.length / 1024).toFixed(1)} KB`,
          page_count: siteData.pages.length,
        },
        status: 'completed',
      });

      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('✅ Proyecto enviado a Base44');
      setSiteData(null);
      setCrawlProgress([]);
    } catch (err) {
      toast.error('Error enviando proyecto: ' + err.message);
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
    <div style={{display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden'}}>
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-xl z-40 flex-shrink-0">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Crosshair className="w-4 h-4 text-white" />
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
            {stats.total > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">
                  <span className="text-slate-600 font-medium">Total:</span>
                  <span className="font-bold text-slate-900">{stats.total}</span>
                </div>
                {stats.completed > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-50 border border-green-200">
                    <span className="text-green-600">✓</span>
                    <span className="font-bold text-green-700">{stats.completed}</span>
                  </div>
                )}
                {stats.error > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 border border-red-200">
                    <span className="text-red-600">✕</span>
                    <span className="font-bold text-red-700">{stats.error}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── MAIN TWO-COLUMN LAYOUT ── */}
      <div style={{display: 'flex', flex: 1, overflow: 'hidden', width: '100%'}}>

        {/* ── LEFT PANEL ── 380px fixed, scrollable */}
        <div className="flex flex-col bg-white border-r border-slate-200 shadow-sm" style={{width: '380px', minWidth: '380px', flexShrink: 0, height: '100%'}}>
          
          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            {/* URL Input */}
            <div className="px-4 pt-4 pb-3">
              <UrlInput 
                onSubmit={handleExtract} 
                isLoading={isExtracting}
                onUrlChange={setCurrentUrl}
              />
            </div>

            <div className="border-t border-slate-100" />

            {/* Modo de Extracción */}
            <div className="px-4 py-3">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Modo de Extracción</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>
              <ModeSelector mode={mode} setMode={setMode} />
            </div>

            <div className="border-t border-slate-100" />

            {/* Opciones Avanzadas */}
            <div className="px-4 py-3">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Opciones Avanzadas</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>
              <div className="space-y-1">
                <label className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                  <input type="checkbox" checked={options.render_spa} onChange={(e) => setOptions({...options, render_spa: e.target.checked})} className="w-4 h-4 rounded border-slate-300 bg-white text-amber-600 focus:ring-amber-500" />
                  <div>
                    <div className="text-xs text-slate-700 font-medium">Renderizar JavaScript (SPAs)</div>
                    <div className="text-[10px] text-slate-500">Ejecuta JS antes de extraer</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                  <input type="checkbox" checked={useAdvancedExtraction} onChange={(e) => setUseAdvancedExtraction(e.target.checked)} className="w-4 h-4 rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500" />
                  <div>
                    <div className="text-xs text-slate-700 font-medium">Extracción Avanzada</div>
                    <div className="text-[10px] text-slate-500">Navegador headless + más opciones</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                  <input type="checkbox" checked={useEnhancedComponentDetection} onChange={(e) => setUseEnhancedComponentDetection(e.target.checked)} className="w-4 h-4 rounded border-slate-300 bg-white text-indigo-600 focus:ring-indigo-500" />
                  <div>
                    <div className="text-xs text-slate-700 font-medium">Detección Mejorada</div>
                    <div className="text-[10px] text-slate-500">Análisis profundo de componentes</div>
                  </div>
                </label>
              </div>
              <div className="mt-3">
                <ExtractionOptions options={options} setOptions={setOptions} cleanup={cleanup} setCleanup={setCleanup} />
              </div>
            </div>

            <div className="border-t border-slate-100" />

            {/* Optimización */}
            <div className="px-4 py-3">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Optimización</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>
              <AdvancedOptions options={optimizationOptions} setOptions={setOptimizationOptions} />
            </div>

            <div className="border-t border-slate-100" />

            {/* Acciones sobre el código extraído */}
            {extractedData && (
              <div className="px-4 py-3">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Acciones</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <ActionBar
                    data={extractedData}
                    onGeneratePrompt={handleGeneratePrompt}
                    onCloneToBase44={() => setShowCloneModal(true)}
                    isGenerating={isGenerating}
                  />
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
                  <Button onClick={handleOptimizeCode} disabled={isOptimizing} variant="outline" size="sm" className="bg-white border-indigo-300 text-indigo-600 hover:bg-indigo-50 text-xs h-9">
                    {isOptimizing ? (<><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Optimizando...</>) : 'Optimizar'}
                  </Button>
                </div>
              </div>
            )}

            <div className="border-t border-slate-100" />

            {/* Generador IA */}
            <div className="px-4 py-3">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Generador IA</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>
              <AICodeGenerator onInsertCode={handleInsertGeneratedCode} />
            </div>

            <div className="border-t border-slate-100" />

            {/* Proyectos recientes */}
            <div className="px-4 py-3">
              <RecentProjects
                projects={projects}
                onSelect={handleSelectProject}
                onDelete={handleDeleteProject}
              />
            </div>
          </div>

          {/* ── FIXED BOTTOM BUTTONS ── */}
          <div className="border-t border-slate-200 bg-white px-4 py-3 flex-shrink-0">
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => currentUrl && handleExtract(currentUrl)}
                disabled={!currentUrl || isExtracting || isCrawling}
                className="h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all"
              >
                {isExtracting ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Extrayendo</>) : (<><Zap className="w-4 h-4 mr-2" />Extraer</>)}
              </Button>
              <Button
                onClick={() => currentUrl && handleCrawlWebsite(currentUrl)}
                disabled={!currentUrl || isCrawling || isExtracting}
                className="h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl transition-all"
              >
                {isCrawling ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Crawling</>) : '🕷️ Crawl'}
              </Button>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── flex:1, solo vista previa */}
        <div style={{flex: 1, minWidth: 0, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
          {isCrawling || siteData ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isCrawling && (
                <SiteExtractionProgress pages={crawlProgress} isComplete={false} />
              )}
              {siteData && (
                <FullSitePreview
                  siteData={siteData}
                  onSendToBase44={handleSendSiteToBase44}
                  isSending={false}
                />
              )}
            </div>
          ) : showLivePreview && extractedData ? (
            <div style={{flex: 1, overflow: 'hidden'}}>
              <LivePreview
                html={extractedData.html}
                css={extractedData.css?.inline}
                js={(extractedData.js?.inline || []).join('\n')}
                device={previewDevice}
              />
            </div>
          ) : (
            <div style={{flex: 1, overflow: 'hidden'}}>
              <PreviewPanel data={extractedData} screenshotUrl={screenshotUrl} />
            </div>
          )}
        </div>
      </div>

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
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Crosshair, Loader2, Zap, Code2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import ModeSelector from '../components/extractor/ModeSelector';
import UrlInput from '../components/extractor/UrlInput';
import ExtractionOptions from '../components/extractor/ExtractionOptions';
import PreviewPanel from '../components/extractor/PreviewPanel';
import ActionBar from '../components/extractor/ActionBar';
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

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
      >
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{title}</span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

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

  const handleExtract = async (url) => {
    if (!url) { toast.error('Ingresa una URL válida'); return; }
    if (isExtracting) { toast.info('Ya se está extrayendo...'); return; }

    setCurrentUrl(url);
    setIsExtracting(true);
    setExtractedData(null);
    setScreenshotUrl(null);
    toast.info('Extrayendo contenido...');

    if (window.addNotification) {
      window.addNotification({ type: 'loading', title: 'Extrayendo contenido', message: `Procesando ${url}...` });
    }

    try {
      const functionName = useAdvancedExtraction ? 'extractWebPageAdvanced' : 'extractWebPage';
      const response = await base44.functions.invoke(functionName, { url, options, mode, cleanup });

      if (response.data?.success) {
        setExtractedData(response.data.data);
        setScreenshotUrl(response.data.data?.screenshot_url);
        toast.success('✅ Extracción completada');

        if (window.addNotification) {
          window.addNotification({ type: 'success', title: 'Extracción completada', message: `${response.data.data?.metadata?.title || 'Página'} extraída exitosamente` });
        }

        if (response.data?.data) {
          const projName = response.data.data?.metadata?.title || new URL(url).hostname;
          await base44.entities.ExtractedProject.create({
            name: projName, url, mode,
            html_content: (response.data.data?.html || '').substring(0, 100000),
            css_content: (response.data.data?.css?.inline || '').substring(0, 50000),
            js_content: Array.isArray(response.data.data?.js?.inline) ? response.data.data.js.inline.join('\n').substring(0, 50000) : (response.data.data?.js?.inline || '').substring(0, 50000),
            structure_json: JSON.stringify(response.data.data?.structure || []),
            colors: response.data.data?.assets?.colors?.slice(0, 30) || [],
            fonts: response.data.data?.assets?.fonts || [],
            assets: (response.data.data?.assets?.images || []).slice(0, 20).map(img => ({ type: 'image', url: img, name: img.split('/').pop() })),
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
        structure: [], assets: { images: [], fonts: [], colors: [] },
        metadata: { title: 'Código Generado por IA', framework: 'Generated' },
      });
    } else {
      setExtractedData({
        ...extractedData,
        html: (extractedData.html || '') + '\n\n' + (generatedCode.html || ''),
        css: { ...extractedData.css, inline: (extractedData.css?.inline || '') + '\n\n' + (generatedCode.css || '') },
        js: { ...extractedData.js, inline: [...(extractedData.js?.inline || []), generatedCode.js || ''].filter(Boolean) },
      });
    }
    toast.success('Código insertado en el extractor');
  };

  const handleDetectComponents = async () => {
    if (!extractedData) return;
    try {
      const response = await base44.functions.invoke('detectComponents', {
        html: extractedData.html, css: extractedData.css?.inline,
        enhanced: useEnhancedComponentDetection, structure: extractedData.structure,
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
    if (extractedData) handleDetectComponents();
  }, [extractedData]);

  const handleGeneratePrompt = async () => {
    if (!extractedData) return;
    setIsGenerating(true);
    try {
      const response = await base44.functions.invoke('generatePrompt', {
        html: (extractedData.html || '').substring(0, 8000),
        css: extractedData.css?.inline?.substring(0, 5000) || '',
        structure: extractedData.structure, metadata: extractedData.metadata,
        colors: extractedData.assets?.colors?.slice(0, 20), fonts: extractedData.assets?.fonts,
      });
      if (response.data?.success) { setPromptData(response.data.data); setShowPrompt(true); }
      else toast.error('Error generando prompt');
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCrawlWebsite = async (url) => {
    if (!url) { toast.error('Ingresa una URL válida'); return; }
    setIsCrawling(true);
    setCrawlProgress([]);
    setSiteData(null);
    toast.info('Descubriendo y extrayendo páginas...');
    try {
      const response = await base44.functions.invoke('crawlWebsite', { baseUrl: url, maxPages: 30, render_spa: options.render_spa });
      if (response.data?.success) {
        setCrawlProgress(response.data.data.pages.map(p => ({ ...p, status: 'completed' })));
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
    if (!siteData?.pages?.length) return;
    try {
      const projectName = `${siteData.siteName} - Sitio Completo`;
      const combinedHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${projectName}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:#f5f5f5}
nav{background:white;border-bottom:1px solid #ddd;padding:0 20px}
nav a{display:inline-block;padding:15px 20px;text-decoration:none;color:#333;border-bottom:3px solid transparent;transition:all .2s}
nav a:hover,nav a.active{color:#0066cc;border-bottom-color:#0066cc}
.page-content{display:none}.page-content.active{display:block}</style></head><body>
<nav>${siteData.pages.map((p, i) => `<a href="#" class="nav-link ${i === 0 ? 'active' : ''}" data-page="${i}">${p.title}</a>`).join('')}</nav>
${siteData.pages.map((p, i) => `<div id="page-${i}" class="page-content ${i === 0 ? 'active' : ''}">${p.html}</div>`).join('')}
<style>${siteData.pages.map(p => p.css).filter(Boolean).join('\n')}</style>
<script>document.querySelectorAll('.nav-link').forEach(l=>l.addEventListener('click',e=>{e.preventDefault();document.querySelectorAll('.page-content').forEach(p=>p.classList.remove('active'));document.querySelectorAll('.nav-link').forEach(x=>x.classList.remove('active'));document.getElementById('page-'+l.dataset.page).classList.add('active');l.classList.add('active')}));</script>
</body></html>`;
      await base44.entities.ExtractedProject.create({
        name: projectName, url: siteData.baseUrl, mode: 'url_complete',
        html_content: combinedHtml.substring(0, 100000),
        css_content: siteData.pages.map(p => p.css).join('\n\n').substring(0, 50000),
        structure_json: JSON.stringify({ pages: siteData.pages.length }),
        colors: [], fonts: [], assets: [],
        metadata: { title: projectName, framework: 'Multi-page Site', total_size: `${(combinedHtml.length / 1024).toFixed(1)} KB`, page_count: siteData.pages.length },
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

  return (
    <div className="min-h-screen">
      {/* Sub-header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-slate-800">Code Extractor</span>
          </div>
          <div className="flex items-center gap-3">
            {extractedData?.metadata && <MetadataBar metadata={extractedData.metadata} />}
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">

          {/* ── LEFT PANEL ── */}
          <div className="space-y-3 max-h-[calc(100vh-160px)] overflow-y-auto pr-1">

            {/* URL */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3">
              <UrlInput onSubmit={handleExtract} isLoading={isExtracting} onUrlChange={setCurrentUrl} />
              <div className="grid grid-cols-2 gap-2 mt-3">
                <Button
                  onClick={() => currentUrl && handleExtract(currentUrl)}
                  disabled={!currentUrl || isExtracting || isCrawling}
                  className="h-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl"
                >
                  {isExtracting ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Extrayendo</> : <><Zap className="w-4 h-4 mr-1.5" />Extraer</>}
                </Button>
                <Button
                  onClick={() => currentUrl && handleCrawlWebsite(currentUrl)}
                  disabled={!currentUrl || isCrawling || isExtracting}
                  className="h-10 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl"
                >
                  {isCrawling ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Crawling</> : '🕷️ Crawl'}
                </Button>
              </div>
              {extractedData && (
                <Button onClick={handleOptimizeCode} disabled={isOptimizing} variant="outline" className="w-full h-9 mt-2 text-xs border-indigo-300 text-indigo-600 hover:bg-indigo-50">
                  {isOptimizing ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Optimizando...</> : 'Optimizar Código'}
                </Button>
              )}
            </div>

            {/* Sección 1: Modo de Extracción */}
            <Section title="Modo de Extracción">
              <ModeSelector mode={mode} setMode={setMode} />
            </Section>

            {/* Sección 2: Opciones de Extracción */}
            <Section title="Opciones de Extracción" defaultOpen={false}>
              <ExtractionOptions options={options} setOptions={setOptions} cleanup={cleanup} setCleanup={setCleanup} />
              <div className="mt-3 space-y-1 border-t border-slate-100 pt-3">
                <label className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" checked={options.render_spa} onChange={(e) => setOptions({...options, render_spa: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-amber-600" />
                  <div>
                    <div className="text-xs text-slate-700 font-medium">Renderizar JavaScript (SPAs)</div>
                    <div className="text-[10px] text-slate-500">Ejecuta JS antes de extraer</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" checked={useAdvancedExtraction} onChange={(e) => setUseAdvancedExtraction(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-blue-600" />
                  <div>
                    <div className="text-xs text-slate-700 font-medium">Extracción Avanzada</div>
                    <div className="text-[10px] text-slate-500">Navegador headless + más opciones</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" checked={useEnhancedComponentDetection} onChange={(e) => setUseEnhancedComponentDetection(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-indigo-600" />
                  <div>
                    <div className="text-xs text-slate-700 font-medium">Detección Mejorada</div>
                    <div className="text-[10px] text-slate-500">Análisis profundo de componentes</div>
                  </div>
                </label>
              </div>
            </Section>

            {/* Sección 3: Optimización */}
            <Section title="Optimización de Código" defaultOpen={false}>
              <AdvancedOptions options={optimizationOptions} setOptions={setOptimizationOptions} />
            </Section>

          </div>

          {/* ── RIGHT PANEL ── */}
          <div className="space-y-4">
            {isCrawling || siteData ? (
              <>
                {isCrawling && <SiteExtractionProgress pages={crawlProgress} isComplete={false} />}
                {siteData && (
                  <>
                    <FullSitePreview siteData={siteData} onSendToBase44={handleSendSiteToBase44} isSending={false} />
                    <AICodeManipulation
                      html={siteData.pages.slice(0, 3).map(p => p.html).join('\n\n').substring(0, 30000)}
                      css={siteData.pages.map(p => p.css).filter(Boolean).join('\n\n').substring(0, 15000)}
                      js="" onApplyCode={() => {}}
                    />
                  </>
                )}
              </>
            ) : showLivePreview && extractedData ? (
              <LivePreview html={extractedData.html} css={extractedData.css?.inline} js={(extractedData.js?.inline || []).join('\n')} device="desktop" />
            ) : (
              <PreviewPanel data={extractedData} screenshotUrl={screenshotUrl} />
            )}

            {/* Action bar */}
            <div className="flex flex-wrap gap-2">
              <ActionBar data={extractedData} onGeneratePrompt={handleGeneratePrompt} onCloneToBase44={() => setShowCloneModal(true)} isGenerating={isGenerating} />
              {extractedData && (
                <>
                  <Button onClick={() => setShowEditor(true)} variant="outline" size="sm" className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 text-xs h-9">
                    <Code2 className="w-3.5 h-3.5 mr-1.5" />Editar Código
                  </Button>
                  <Button onClick={() => setShowLivePreview(!showLivePreview)} variant="outline" size="sm" className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 text-xs h-9">
                    {showLivePreview ? 'Ver Código' : 'Vista Previa Viva'}
                  </Button>
                </>
              )}
            </div>

            {/* Analysis panels */}
            {extractedData && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ComponentDetector components={detectedComponents} onSaveComponent={() => queryClient.invalidateQueries({ queryKey: ['components'] })} />
                <ReactConverter html={extractedData.html} css={extractedData.css?.inline} />
              </div>
            )}
            {extractedData && <AnalysisPanel extractedData={extractedData} />}

            <AICodeGenerator onInsertCode={handleInsertGeneratedCode} />

            {extractedData && (
              <AICodeManipulation
                html={extractedData.html}
                css={extractedData.css?.inline}
                js={(extractedData.js?.inline || []).join('\n')}
                onApplyCode={(code) => {
                  setExtractedData({
                    ...extractedData,
                    html: code.html || extractedData.html,
                    css: { ...extractedData.css, inline: code.css || extractedData.css?.inline },
                    js: { ...extractedData.js, inline: code.js ? [code.js] : extractedData.js?.inline },
                  });
                  toast.success('Código aplicado exitosamente');
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 mt-12 py-4">
        <p className="text-center text-[11px] text-slate-500 max-w-2xl mx-auto px-4">
          Esta herramienta es para uso educativo y análisis de páginas propias o públicas.
          Respeta copyright y términos de servicio. NØÜS SYSTEM no se responsabiliza del uso indebido.
        </p>
      </footer>

      <PromptModal open={showPrompt} onOpenChange={setShowPrompt} promptData={promptData} />
      <CloneToBase44Modal open={showCloneModal} onOpenChange={setShowCloneModal} data={extractedData} />
      {showEditor && (
        <CodeEditor
          initialData={{ html: extractedData?.html || '', css: extractedData?.css?.inline || '', js: (extractedData?.js?.inline || []).join('\n') }}
          onSave={handleSaveEdited}
          onCancel={() => setShowEditor(false)}
        />
      )}
    </div>
  );
}
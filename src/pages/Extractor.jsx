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
        maxPages: 50,
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
    <div style={{ width: '100vw', height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'fixed', top: '60px', left: 0 }}>

      {/* ── FILA 1: URL INPUT ── 80px */}
      <div style={{ height: '80px', flexShrink: 0, display: 'flex', alignItems: 'center', borderBottom: '1px solid #e2e8f0', background: '#fff', padding: '0 16px' }}>
        <div style={{ width: '100%' }}>
          <UrlInput
            onSubmit={handleExtract}
            isLoading={isExtracting}
            onUrlChange={setCurrentUrl}
          />
        </div>
      </div>

      {/* ── FILA 2: COLUMNA IZQUIERDA + COLUMNA DERECHA ── flex:1 */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Columna izquierda 320px */}
        <div style={{ width: '320px', minWidth: '320px', flexShrink: 0, height: '100%', overflowY: 'auto', borderRight: '1px solid #e2e8f0', background: '#fff', display: 'flex', flexDirection: 'column', gap: 0 }}>

          {/* Modo */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Modo de Extracción</div>
            <ModeSelector mode={mode} setMode={setMode} />
          </div>

          {/* Opciones de extracción */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Opciones</div>
            <ExtractionOptions options={options} setOptions={setOptions} cleanup={cleanup} setCleanup={setCleanup} />
          </div>

          {/* Botones Extraer y Crawl */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <Button
              onClick={() => currentUrl && handleExtract(currentUrl)}
              disabled={!currentUrl || isExtracting || isCrawling}
              style={{ height: '44px', background: 'linear-gradient(to right, #2563eb, #4f46e5)', color: '#fff', fontWeight: 600, borderRadius: '10px', border: 'none', cursor: 'pointer' }}
            >
              {isExtracting ? <><Loader2 style={{ width: 16, height: 16, marginRight: 6, animation: 'spin 1s linear infinite' }} />Extrayendo</> : <><Zap style={{ width: 16, height: 16, marginRight: 6 }} />Extraer</>}
            </Button>
            <Button
              onClick={() => currentUrl && handleCrawlWebsite(currentUrl)}
              disabled={!currentUrl || isCrawling || isExtracting}
              style={{ height: '44px', background: 'linear-gradient(to right, #059669, #0d9488)', color: '#fff', fontWeight: 600, borderRadius: '10px', border: 'none', cursor: 'pointer' }}
            >
              {isCrawling ? <><Loader2 style={{ width: 16, height: 16, marginRight: 6, animation: 'spin 1s linear infinite' }} />Crawling</> : '🕷️ Crawl'}
            </Button>
          </div>

        </div>

        {/* Columna derecha flex:1 */}
        <div style={{ flex: 1, minWidth: 0, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* ActionBar */}
          {extractedData && (
            <div style={{ flexShrink: 0, padding: '8px 12px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
              <ActionBar
                data={extractedData}
                onGeneratePrompt={handleGeneratePrompt}
                onCloneToBase44={() => setShowCloneModal(true)}
                isGenerating={isGenerating}
              />
              <Button onClick={() => setShowEditor(true)} variant="outline" size="sm" style={{ fontSize: '12px', height: '32px' }}>
                <Code2 style={{ width: 13, height: 13, marginRight: 4 }} />Editar Código
              </Button>
              <Button onClick={() => setShowLivePreview(!showLivePreview)} variant="outline" size="sm" style={{ fontSize: '12px', height: '32px' }}>
                {showLivePreview ? 'Ver Código' : 'Vista Previa Viva'}
              </Button>
              <Button onClick={handleOptimizeCode} disabled={isOptimizing} variant="outline" size="sm" style={{ fontSize: '12px', height: '32px', borderColor: '#a5b4fc', color: '#4f46e5' }}>
                {isOptimizing ? <><Loader2 style={{ width: 13, height: 13, marginRight: 4, animation: 'spin 1s linear infinite' }} />Optimizando...</> : 'Optimizar'}
              </Button>
            </div>
          )}

          {/* PreviewPanel / Live / Crawl */}
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            {isCrawling || siteData ? (
              <div style={{ height: '100%', overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {isCrawling && <SiteExtractionProgress pages={crawlProgress} isComplete={false} />}
                {siteData && <FullSitePreview siteData={siteData} onSendToBase44={handleSendSiteToBase44} isSending={false} />}
              </div>
            ) : showLivePreview && extractedData ? (
              <LivePreview
                html={extractedData.html}
                css={extractedData.css?.inline}
                js={(extractedData.js?.inline || []).join('\n')}
                device={previewDevice}
              />
            ) : (
              <PreviewPanel data={extractedData} screenshotUrl={screenshotUrl} />
            )}
          </div>

        </div>
      </div>

      {/* ── FILA 3: AI TOOLS ── 60px */}
      <div style={{ height: '60px', flexShrink: 0, display: 'flex', flexWrap: 'wrap', overflow: 'hidden', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
        <div style={{ flex: 1, minWidth: 0, height: '100%', overflow: 'hidden', borderRight: '1px solid #e2e8f0' }}>
          <AICodeGenerator onInsertCode={handleInsertGeneratedCode} compact />
        </div>
        <div style={{ flex: 1, minWidth: 0, height: '100%', overflow: 'hidden' }}>
          <AICodeManipulation
            html={extractedData?.html || ''}
            css={extractedData?.css?.inline || ''}
            js={(extractedData?.js?.inline || []).join('\n')}
            onApplyChanges={(updated) => setExtractedData(prev => ({ ...prev, ...updated }))}
            compact
          />
        </div>
      </div>

      {/* Modales */}
      <PromptModal open={showPrompt} onOpenChange={setShowPrompt} promptData={promptData} />
      <CloneToBase44Modal open={showCloneModal} onOpenChange={setShowCloneModal} data={extractedData} />

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
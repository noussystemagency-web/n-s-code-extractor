import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Crosshair, Loader2, Settings, Zap } from 'lucide-react';
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

export default function Extractor() {
  const [mode, setMode] = useState('full_page');
  const [extractedData, setExtractedData] = useState(null);
  const [screenshotUrl, setScreenshotUrl] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [promptData, setPromptData] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');
  const [options, setOptions] = useState({
    html: true, css_inline: true, css_external: true,
    javascript: true, images: true, fonts: true, structure: true,
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
      const response = await base44.functions.invoke('extractWebPage', {
        url,
        options: { mode, ...options, cleanup },
      });

      if (response.data?.success) {
        setExtractedData(response.data.data);
        toast.success('Extracción completada');

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
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          {/* Left Panel - Controls */}
          <div className="space-y-5">
            <ModeSelector mode={mode} setMode={setMode} />
            <UrlInput onSubmit={handleExtract} isLoading={isExtracting} />
            <ExtractionOptions
              options={options}
              setOptions={setOptions}
              cleanup={cleanup}
              setCleanup={setCleanup}
            />
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
          </div>

          {/* Right Panel - Preview & Code */}
          <div className="space-y-4">
            <PreviewPanel data={extractedData} screenshotUrl={screenshotUrl} />
            <ActionBar
              data={extractedData}
              onGeneratePrompt={handleGeneratePrompt}
              isGenerating={isGenerating}
            />
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
    </div>
  );
}
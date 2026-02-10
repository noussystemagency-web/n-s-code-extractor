import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Eye, Search, AlertCircle, CheckCircle, Info, Loader2,
  TrendingUp, AlertTriangle, Sparkles, Code, FileText
} from "lucide-react";
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";

export default function AnalysisPanel({ extractedData }) {
  const [a11yData, setA11yData] = useState(null);
  const [seoData, setSeoData] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);

  const analyzeAccessibility = async () => {
    setIsAnalyzing(true);
    try {
      const response = await base44.functions.invoke('analyzeAccessibility', {
        html: extractedData?.html,
        css: extractedData?.css?.inline,
      });
      if (response.data?.success) {
        setA11yData(response.data.data);
      }
    } catch (err) {
      toast.error('Error analizando a11y');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeSEO = async () => {
    setIsAnalyzing(true);
    try {
      const response = await base44.functions.invoke('analyzeSEO', {
        html: extractedData?.html,
        url: extractedData?.url || '',
      });
      if (response.data?.success) {
        setSeoData(response.data.data);
      }
    } catch (err) {
      toast.error('Error analizando SEO');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeWithAI = async () => {
    setIsAnalyzingAI(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analiza esta página web extraída y proporciona un análisis detallado:

**HTML (primeros 3000 caracteres):**
\`\`\`html
${(extractedData.html || '').substring(0, 3000)}
\`\`\`

**CSS (primeros 2000 caracteres):**
\`\`\`css
${(extractedData.css?.inline || '').substring(0, 2000)}
\`\`\`

**Metadata:**
- Título: ${extractedData.metadata?.title || 'N/A'}
- Framework: ${extractedData.metadata?.framework || 'N/A'}

**Estructura detectada:**
${JSON.stringify(extractedData.structure?.slice(0, 20) || [], null, 2)}

Proporciona un análisis completo en las siguientes áreas:

1. **SEO Improvements**: Identifica problemas y oportunidades de mejora SEO
2. **Code Quality**: Evalúa la calidad del código, patrones obsoletos, y sugerencias de optimización
3. **Metadata Suggestions**: Sugiere mejoras en meta tags, títulos, descripciones
4. **Content Summary**: Resume el contenido y propósito de la página
5. **Performance Tips**: Sugerencias específicas para mejorar rendimiento

Sé específico y práctico en tus recomendaciones.`,
        response_json_schema: {
          type: 'object',
          properties: {
            seo_improvements: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  issue: { type: 'string' },
                  severity: { type: 'string', enum: ['high', 'medium', 'low'] },
                  suggestion: { type: 'string' }
                }
              }
            },
            code_quality: {
              type: 'object',
              properties: {
                score: { type: 'number' },
                issues: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string' },
                      description: { type: 'string' },
                      fix: { type: 'string' }
                    }
                  }
                },
                best_practices: { type: 'array', items: { type: 'string' } }
              }
            },
            metadata_suggestions: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                keywords: { type: 'array', items: { type: 'string' } },
                og_tags: { type: 'array', items: { type: 'string' } }
              }
            },
            content_summary: {
              type: 'object',
              properties: {
                purpose: { type: 'string' },
                key_features: { type: 'array', items: { type: 'string' } },
                target_audience: { type: 'string' }
              }
            },
            performance_tips: { type: 'array', items: { type: 'string' } }
          }
        }
      });

      if (response) {
        setAiAnalysis(response);
        toast.success('✨ Análisis IA completado');
      }
    } catch (err) {
      toast.error('Error en análisis IA: ' + err.message);
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  const ScoreCircle = ({ score, label }) => (
    <div className="flex flex-col items-center">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 transform -rotate-90">
          <circle
            cx="40"
            cy="40"
            r="32"
            stroke="#2d3748"
            strokeWidth="6"
            fill="none"
          />
          <circle
            cx="40"
            cy="40"
            r="32"
            stroke={score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'}
            strokeWidth="6"
            fill="none"
            strokeDasharray={`${(score / 100) * 201} 201`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-white">{score}</span>
        </div>
      </div>
      <span className="text-xs text-slate-400 mt-2">{label}</span>
    </div>
  );

  return (
    <div className="bg-[#0d1117] rounded-xl border border-white/5 p-4">
      <Tabs defaultValue="a11y">
        <TabsList className="bg-[#161b22] border border-white/5 mb-4">
          <TabsTrigger value="a11y" className="text-xs">
            <Eye className="w-3 h-3 mr-1.5" />
            Accesibilidad
          </TabsTrigger>
          <TabsTrigger value="seo" className="text-xs">
            <Search className="w-3 h-3 mr-1.5" />
            SEO
          </TabsTrigger>
          <TabsTrigger value="ai" className="text-xs">
            <Sparkles className="w-3 h-3 mr-1.5" />
            Análisis IA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="a11y" className="space-y-4">
          {!a11yData ? (
            <div className="text-center py-8">
              <Button
                onClick={analyzeAccessibility}
                disabled={isAnalyzing || !extractedData}
                className="bg-blue-600 hover:bg-blue-500"
              >
                {isAnalyzing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analizando...</>
                ) : (
                  'Analizar Accesibilidad'
                )}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex justify-center mb-4">
                <ScoreCircle score={a11yData.score} label="Puntuación A11y" />
              </div>
              
              {a11yData.issues.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-red-400 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-3 h-3" />
                    Errores ({a11yData.issues.length})
                  </h4>
                  {a11yData.issues.map((issue, i) => (
                    <div key={i} className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 mb-2">
                      <p className="text-xs text-red-300">{issue.message}</p>
                    </div>
                  ))}
                </div>
              )}

              {a11yData.warnings.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-amber-400 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3" />
                    Advertencias ({a11yData.warnings.length})
                  </h4>
                  {a11yData.warnings.map((warn, i) => (
                    <div key={i} className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 mb-2">
                      <p className="text-xs text-amber-300">{warn.message}</p>
                    </div>
                  ))}
                </div>
              )}

              {a11yData.suggestions.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-blue-400 mb-2 flex items-center gap-2">
                    <Info className="w-3 h-3" />
                    Sugerencias ({a11yData.suggestions.length})
                  </h4>
                  {a11yData.suggestions.map((sug, i) => (
                    <div key={i} className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 mb-2">
                      <p className="text-xs text-blue-300">{sug.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="seo" className="space-y-4">
          {!seoData ? (
            <div className="text-center py-8">
              <Button
                onClick={analyzeSEO}
                disabled={isAnalyzing || !extractedData}
                className="bg-emerald-600 hover:bg-emerald-500"
              >
                {isAnalyzing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analizando...</>
                ) : (
                  'Analizar SEO'
                )}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex justify-center mb-4">
                <ScoreCircle score={seoData.score} label="Puntuación SEO" />
              </div>

              {seoData.good.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-green-400 mb-2 flex items-center gap-2">
                    <CheckCircle className="w-3 h-3" />
                    Aspectos positivos
                  </h4>
                  {seoData.good.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-green-300 mb-1">
                      <CheckCircle className="w-3 h-3 flex-shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              )}

              {seoData.issues.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-red-400 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-3 h-3" />
                    Problemas críticos
                  </h4>
                  {seoData.issues.map((issue, i) => (
                    <div key={i} className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 mb-2">
                      <p className="text-xs text-red-300">{issue}</p>
                    </div>
                  ))}
                </div>
              )}

              {seoData.suggestions.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-amber-400 mb-2 flex items-center gap-2">
                    <TrendingUp className="w-3 h-3" />
                    Oportunidades de mejora
                  </h4>
                  {seoData.suggestions.map((sug, i) => (
                    <div key={i} className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 mb-2">
                      <p className="text-xs text-amber-300">{sug}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          {!aiAnalysis ? (
            <div className="text-center py-8">
              <Sparkles className="w-12 h-12 mx-auto text-amber-400 mb-3" />
              <p className="text-sm text-slate-300 mb-2 font-medium">
                Análisis IA Completo
              </p>
              <p className="text-xs text-slate-400 mb-4 max-w-md mx-auto">
                SEO, calidad de código, metadata, resumen de contenido y tips de rendimiento
              </p>
              <Button
                onClick={analyzeWithAI}
                disabled={isAnalyzingAI || !extractedData}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                {isAnalyzingAI ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analizando con IA...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Analizar con IA
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {/* SEO Improvements */}
              {aiAnalysis.seo_improvements?.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-green-400" />
                    <h4 className="text-sm font-semibold text-green-400">
                      Mejoras SEO ({aiAnalysis.seo_improvements.length})
                    </h4>
                  </div>
                  {aiAnalysis.seo_improvements.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-sm font-medium text-green-300">{item.issue}</p>
                        <Badge className={`text-[10px] ${
                          item.severity === 'high' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                          item.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                          'bg-blue-500/20 text-blue-300 border-blue-500/30'
                        }`}>
                          {item.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-green-400/80">{item.suggestion}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Code Quality */}
              {aiAnalysis.code_quality && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-blue-400" />
                    <h4 className="text-sm font-semibold text-blue-400">
                      Calidad de Código
                    </h4>
                    <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
                      {aiAnalysis.code_quality.score}/10
                    </Badge>
                  </div>
                  {aiAnalysis.code_quality.issues?.map((issue, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <p className="text-sm font-medium text-blue-300 mb-1">{issue.type}</p>
                      <p className="text-xs text-blue-400/80 mb-1">{issue.description}</p>
                      <p className="text-xs text-blue-300 font-medium">💡 {issue.fix}</p>
                    </div>
                  ))}
                  {aiAnalysis.code_quality.best_practices?.length > 0 && (
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <p className="text-xs font-semibold text-blue-300 mb-2">✨ Buenas prácticas:</p>
                      <ul className="text-xs text-blue-400/80 space-y-1">
                        {aiAnalysis.code_quality.best_practices.map((bp, i) => (
                          <li key={i}>• {bp}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Metadata Suggestions */}
              {aiAnalysis.metadata_suggestions && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-400" />
                    <h4 className="text-sm font-semibold text-purple-400">
                      Sugerencias de Metadata
                    </h4>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 space-y-2">
                    {aiAnalysis.metadata_suggestions.title && (
                      <div>
                        <p className="text-xs font-semibold text-purple-300">Título sugerido:</p>
                        <p className="text-xs text-purple-400/80">{aiAnalysis.metadata_suggestions.title}</p>
                      </div>
                    )}
                    {aiAnalysis.metadata_suggestions.description && (
                      <div>
                        <p className="text-xs font-semibold text-purple-300">Descripción:</p>
                        <p className="text-xs text-purple-400/80">{aiAnalysis.metadata_suggestions.description}</p>
                      </div>
                    )}
                    {aiAnalysis.metadata_suggestions.keywords?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-purple-300">Keywords:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {aiAnalysis.metadata_suggestions.keywords.map((kw, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] bg-purple-500/20 text-purple-300 border-purple-500/30">
                              {kw}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Content Summary */}
              {aiAnalysis.content_summary && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-indigo-400" />
                    <h4 className="text-sm font-semibold text-indigo-400">
                      Resumen de Contenido
                    </h4>
                  </div>
                  <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 space-y-2">
                    <div>
                      <p className="text-xs font-semibold text-indigo-300">Propósito:</p>
                      <p className="text-xs text-indigo-400/80">{aiAnalysis.content_summary.purpose}</p>
                    </div>
                    {aiAnalysis.content_summary.key_features?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-indigo-300">Características clave:</p>
                        <ul className="text-xs text-indigo-400/80 space-y-0.5 ml-3">
                          {aiAnalysis.content_summary.key_features.map((kf, i) => (
                            <li key={i}>• {kf}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {aiAnalysis.content_summary.target_audience && (
                      <div>
                        <p className="text-xs font-semibold text-indigo-300">Audiencia objetivo:</p>
                        <p className="text-xs text-indigo-400/80">{aiAnalysis.content_summary.target_audience}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Performance Tips */}
              {aiAnalysis.performance_tips?.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-orange-400" />
                    <h4 className="text-sm font-semibold text-orange-400">
                      Tips de Rendimiento
                    </h4>
                  </div>
                  <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <ul className="text-xs text-orange-400/80 space-y-1">
                      {aiAnalysis.performance_tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-orange-400 mt-0.5">⚡</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
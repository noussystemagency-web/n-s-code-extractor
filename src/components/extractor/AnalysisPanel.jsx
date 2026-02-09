import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Eye, Search, AlertCircle, CheckCircle, Info, Loader2,
  TrendingUp, AlertTriangle 
} from "lucide-react";
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";

export default function AnalysisPanel({ extractedData }) {
  const [a11yData, setA11yData] = useState(null);
  const [seoData, setSeoData] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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
      </Tabs>
    </div>
  );
}
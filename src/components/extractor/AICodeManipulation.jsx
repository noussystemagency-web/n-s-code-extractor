import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wand2, Palette, Target, CheckCircle, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import CodeViewer from './CodeViewer';

export default function AICodeManipulation({ html, css, js, onApplyCode }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [refactoredCode, setRefactoredCode] = useState(null);
  const [variations, setVariations] = useState(null);
  const [optimizations, setOptimizations] = useState(null);

  const handleRefactor = async () => {
    setIsProcessing(true);
    try {
      const response = await base44.functions.invoke('aiCodeManipulation', {
        operation: 'refactor',
        html,
        css,
        js,
      });

      if (response.data?.success) {
        setRefactoredCode(response.data.data);
        toast.success('Código refactorizado exitosamente');
      } else {
        toast.error('Error al refactorizar');
      }
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateVariations = async () => {
    setIsProcessing(true);
    try {
      const response = await base44.functions.invoke('aiCodeManipulation', {
        operation: 'variations',
        html,
        css,
      });

      if (response.data?.success) {
        setVariations(response.data.data.variations);
        toast.success(`${response.data.data.variations.length} variaciones generadas`);
      } else {
        toast.error('Error al generar variaciones');
      }
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOptimize = async () => {
    setIsProcessing(true);
    try {
      const response = await base44.functions.invoke('aiCodeManipulation', {
        operation: 'optimize',
        html,
        css,
        js,
      });

      if (response.data?.success) {
        setOptimizations(response.data.data);
        toast.success('Análisis de optimización completado');
      } else {
        toast.error('Error al optimizar');
      }
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const priorityColors = {
    high: 'bg-red-100 text-red-800 border-red-300',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    low: 'bg-blue-100 text-blue-800 border-blue-300',
  };

  const priorityIcons = {
    high: AlertCircle,
    medium: Info,
    low: CheckCircle,
  };

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-900">
          <Wand2 className="w-5 h-5" />
          IA - Manipulación de Código
        </CardTitle>
        <CardDescription>Refactoriza, genera variaciones y optimiza tu código con IA</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="refactor" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white">
            <TabsTrigger value="refactor" className="text-xs">
              <Wand2 className="w-3 h-3 mr-1.5" />
              Refactorizar
            </TabsTrigger>
            <TabsTrigger value="variations" className="text-xs">
              <Palette className="w-3 h-3 mr-1.5" />
              Variaciones
            </TabsTrigger>
            <TabsTrigger value="optimize" className="text-xs">
              <Target className="w-3 h-3 mr-1.5" />
              Optimizar
            </TabsTrigger>
          </TabsList>

          {/* Refactor Tab */}
          <TabsContent value="refactor" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">Refactoriza tu código para mejor mantenibilidad y limpieza</p>
              <Button
                onClick={handleRefactor}
                disabled={isProcessing || !html}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                    Refactorizar
                  </>
                )}
              </Button>
            </div>

            {refactoredCode && (
              <div className="space-y-3">
                <div className="bg-white rounded-lg border border-purple-200 p-3">
                  <h4 className="text-sm font-semibold text-slate-900 mb-2">Cambios Realizados:</h4>
                  <ul className="space-y-1">
                    {refactoredCode.changes?.map((change, idx) => (
                      <li key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                        <CheckCircle className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                        {change}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-900">Código Refactorizado:</h4>
                    <Button
                      onClick={() => onApplyCode && onApplyCode({
                        html: refactoredCode.html,
                        css: refactoredCode.css,
                        js: refactoredCode.js,
                      })}
                      size="sm"
                      variant="outline"
                    >
                      Aplicar Código
                    </Button>
                  </div>
                  <Tabs defaultValue="html" className="w-full">
                    <TabsList className="bg-slate-100">
                      <TabsTrigger value="html" className="text-xs">HTML</TabsTrigger>
                      <TabsTrigger value="css" className="text-xs">CSS</TabsTrigger>
                      <TabsTrigger value="js" className="text-xs">JS</TabsTrigger>
                    </TabsList>
                    <TabsContent value="html">
                      <CodeViewer code={refactoredCode.html} language="html" maxHeight="300px" />
                    </TabsContent>
                    <TabsContent value="css">
                      <CodeViewer code={refactoredCode.css} language="css" maxHeight="300px" />
                    </TabsContent>
                    <TabsContent value="js">
                      <CodeViewer code={refactoredCode.js} language="javascript" maxHeight="300px" />
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Variations Tab */}
          <TabsContent value="variations" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">Genera variaciones de diseño CSS manteniendo la estructura</p>
              <Button
                onClick={handleGenerateVariations}
                disabled={isProcessing || !html}
                size="sm"
                className="bg-pink-600 hover:bg-pink-700"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Palette className="w-3.5 h-3.5 mr-1.5" />
                    Generar Variaciones
                  </>
                )}
              </Button>
            </div>

            {variations && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {variations.map((variation, idx) => (
                  <Card key={idx} className="border-pink-200 hover:border-pink-400 transition-colors">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">{variation.name}</CardTitle>
                      <CardDescription className="text-xs">{variation.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-700 mb-2">Colores:</p>
                        <div className="flex flex-wrap gap-2">
                          {variation.colors?.map((color, i) => (
                            <div
                              key={i}
                              className="w-8 h-8 rounded-md border border-slate-300 shadow-sm"
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <CodeViewer code={variation.css} language="css" maxHeight="150px" />
                        <Button
                          onClick={() => onApplyCode && onApplyCode({ css: variation.css })}
                          size="sm"
                          variant="outline"
                          className="w-full"
                        >
                          Aplicar Estilo
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Optimize Tab */}
          <TabsContent value="optimize" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">Obtén sugerencias para mejorar performance y accesibilidad</p>
              <Button
                onClick={handleOptimize}
                disabled={isProcessing || !html}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Analizando...
                  </>
                ) : (
                  <>
                    <Target className="w-3.5 h-3.5 mr-1.5" />
                    Analizar
                  </>
                )}
              </Button>
            </div>

            {optimizations && (
              <div className="space-y-4">
                {['performance', 'accessibility', 'seo', 'security', 'best_practices'].map(category => {
                  const items = optimizations[category] || [];
                  if (items.length === 0) return null;

                  return (
                    <Card key={category} className="border-slate-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm capitalize flex items-center gap-2">
                          <Target className="w-4 h-4" />
                          {category.replace('_', ' ')}
                          <Badge variant="outline" className="ml-auto">
                            {items.length} sugerencias
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {items.map((item, idx) => {
                            const Icon = priorityIcons[item.priority];
                            return (
                              <div key={idx} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                                <div className="flex items-start gap-3">
                                  <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                                    item.priority === 'high' ? 'text-red-600' :
                                    item.priority === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                                  }`} />
                                  <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-semibold text-slate-900">{item.issue}</p>
                                      <Badge className={priorityColors[item.priority]}>
                                        {item.priority}
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-slate-600">{item.suggestion}</p>
                                    {item.code_example && (
                                      <CodeViewer code={item.code_example} language="html" maxHeight="100px" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
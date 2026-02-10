import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Sparkles, Crosshair, Search, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";

const TUTORIAL_STEPS = [
  {
    title: "¡Bienvenido a NØÜS Code Extractor! 🎉",
    description: "La herramienta definitiva para extraer, analizar y clonar páginas web. Te guiaré en los primeros pasos.",
    icon: Sparkles,
    gradient: "from-purple-500 to-pink-500",
  },
  {
    title: "Extrae cualquier página web",
    description: "Ingresa una URL, selecciona el modo de extracción (página completa, elemento, componente) y presiona Extraer. NØÜS capturará HTML, CSS, JavaScript, assets y más.",
    icon: Crosshair,
    gradient: "from-blue-500 to-indigo-500",
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 100'%3E%3Crect width='200' height='100' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='12' fill='%2364748b'%3EURL Input%3C/text%3E%3C/svg%3E"
  },
  {
    title: "Analiza con IA",
    description: "Obtén análisis SEO, accesibilidad y recomendaciones de código con nuestro panel de análisis IA. Mejora tu sitio con sugerencias específicas y prácticas.",
    icon: Search,
    gradient: "from-green-500 to-emerald-500",
  },
  {
    title: "Genera código desde cero",
    description: "Usa el Generador de Código IA para crear HTML, CSS o JavaScript desde descripciones. Perfecto para prototipos rápidos o componentes personalizados.",
    icon: Sparkles,
    gradient: "from-amber-500 to-orange-500",
  },
  {
    title: "Clona a Base44",
    description: "Exporta tu código extraído directamente a Base44 con un clic. Genera prompts optimizados para la IA o descarga el proyecto completo.",
    icon: Rocket,
    gradient: "from-indigo-500 to-purple-500",
  },
];

export default function QuickStartGuide({ open, onOpenChange }) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onOpenChange(false);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
    localStorage.setItem('nous_tutorial_completed', 'true');
  };

  const step = TUTORIAL_STEPS[currentStep];
  const Icon = step.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white border-slate-200">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold text-slate-900">
              Guía Rápida
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkip}
              className="h-6 w-6"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="flex gap-2">
            {TUTORIAL_STEPS.map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "h-1.5 rounded-full flex-1 transition-all",
                  idx <= currentStep ? "bg-gradient-to-r " + step.gradient : "bg-slate-200"
                )}
              />
            ))}
          </div>

          {/* Content */}
          <div className="text-center py-8">
            <div className={cn(
              "w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center bg-gradient-to-br",
              step.gradient
            )}>
              <Icon className="w-10 h-10 text-white" />
            </div>
            
            <h3 className="text-2xl font-bold text-slate-900 mb-3">
              {step.title}
            </h3>
            
            <p className="text-slate-600 max-w-lg mx-auto leading-relaxed">
              {step.description}
            </p>

            {step.image && (
              <div className="mt-6 rounded-lg overflow-hidden border border-slate-200">
                <img src={step.image} alt="Tutorial" className="w-full" />
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <Button
              variant="ghost"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="text-slate-600"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Anterior
            </Button>

            <div className="flex items-center gap-1.5">
              {TUTORIAL_STEPS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    idx === currentStep ? "w-6 bg-blue-600" : "bg-slate-300 hover:bg-slate-400"
                  )}
                />
              ))}
            </div>

            <Button
              onClick={handleNext}
              className={cn(
                "bg-gradient-to-r text-white",
                step.gradient
              )}
            >
              {currentStep === TUTORIAL_STEPS.length - 1 ? (
                "Empezar"
              ) : (
                <>
                  Siguiente
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
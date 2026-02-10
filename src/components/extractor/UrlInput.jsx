import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, Globe, Clipboard } from "lucide-react";
import { cn } from "@/lib/utils";

export default function UrlInput({ onSubmit, isLoading, onUrlChange }) {
  const [url, setUrl] = useState('');
  const [focused, setFocused] = useState(false);

  const handleUrlChange = (newUrl) => {
    setUrl(newUrl);
    if (onUrlChange) {
      onUrlChange(newUrl);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      handleUrlChange(text);
    } catch (err) {
      console.error('Error al pegar:', err);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (url.trim()) {
      let finalUrl = url.trim();
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = 'https://' + finalUrl;
      }
      onSubmit(finalUrl);
    }
  };

  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        URL objetivo
      </h3>
      <form onSubmit={handleSubmit}>
        <div className={cn(
          "relative rounded-xl transition-all duration-300",
          focused ? "ring-2 ring-blue-400/40" : ""
        )}>
          <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
            <Globe className="w-4 h-4 text-slate-400" />
          </div>
          <input
            type="text"
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onPaste={(e) => {
              const pastedText = e.clipboardData.getData('text');
              handleUrlChange(pastedText);
            }}
            placeholder="https://ejemplo.com"
            className="pl-10 pr-32 h-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl focus-visible:ring-blue-400 focus-visible:ring-2 focus-visible:outline-none w-full border"
            disabled={isLoading}
            autoComplete="off"
          />
          <Button
            type="button"
            onClick={handlePaste}
            disabled={isLoading}
            size="sm"
            variant="ghost"
            className="absolute right-20 top-1/2 -translate-y-1/2 h-8 px-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
          >
            <Clipboard className="w-3.5 h-3.5" />
          </Button>
          <Button
            type="submit"
            disabled={!url.trim() || isLoading}
            size="sm"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg h-8 px-4 text-xs font-semibold transition-all"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                Cargar
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
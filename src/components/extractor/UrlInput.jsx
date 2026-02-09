import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, Globe } from "lucide-react";
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
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
        URL objetivo
      </h3>
      <form onSubmit={handleSubmit}>
        <div className={cn(
          "relative rounded-xl transition-all duration-300",
          focused ? "ring-2 ring-blue-500/40" : ""
        )}>
          <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
            <Globe className="w-4 h-4 text-slate-500" />
          </div>
          <Input
            type="text"
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
            onPaste={(e) => {
              e.preventDefault();
              const pastedText = e.clipboardData.getData('text');
              handleUrlChange(pastedText);
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="https://ejemplo.com"
            className="pl-10 pr-24 h-11 bg-white/5 border-white/10 text-slate-800 placeholder:text-slate-400 rounded-xl focus-visible:ring-0 focus-visible:border-violet-500/50"
            disabled={isLoading}
            autoComplete="off"
          />
          <Button
            type="submit"
            disabled={!url.trim() || isLoading}
            size="sm"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg h-8 px-4 text-xs font-semibold transition-all"
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
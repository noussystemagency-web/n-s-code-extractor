import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from "./utils";
import { Crosshair, Component, Clock, Library } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { page: 'Extractor', label: 'Extractor', icon: Crosshair },
  { page: 'ComponentLibrary', label: 'Componentes', icon: Component },
  { page: 'ProjectHistory', label: 'Historial', icon: Clock },
];

export default function Layout({ children, currentPageName }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <style>{`
        :root {
          --background: 0 0% 98%;
          --foreground: 222 47% 11%;
          --card: 0 0% 100%;
          --card-foreground: 222 47% 11%;
          --popover: 0 0% 100%;
          --popover-foreground: 222 47% 11%;
          --primary: 217 91% 60%;
          --primary-foreground: 0 0% 100%;
          --secondary: 210 40% 96%;
          --secondary-foreground: 222 47% 11%;
          --muted: 210 40% 96%;
          --muted-foreground: 215 16% 47%;
          --accent: 210 40% 96%;
          --accent-foreground: 222 47% 11%;
          --destructive: 0 84% 60%;
          --destructive-foreground: 0 0% 100%;
          --border: 214 32% 91%;
          --input: 214 32% 91%;
          --ring: 217 91% 60%;
          --radius: 0.75rem;
        }
        body { background: linear-gradient(to bottom right, #f8fafc, #f1f5f9); color: #0f172a; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
      {children}
    </div>
  );
}
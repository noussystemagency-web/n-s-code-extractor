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
    <div className="min-h-screen bg-[#0f1419]">
      <style>{`
        :root {
          --background: 222 47% 8%;
          --foreground: 210 40% 98%;
          --card: 222 47% 11%;
          --card-foreground: 210 40% 98%;
          --popover: 222 47% 11%;
          --popover-foreground: 210 40% 98%;
          --primary: 217 91% 60%;
          --primary-foreground: 0 0% 100%;
          --secondary: 222 47% 14%;
          --secondary-foreground: 210 40% 98%;
          --muted: 222 47% 14%;
          --muted-foreground: 215 20% 50%;
          --accent: 222 47% 14%;
          --accent-foreground: 210 40% 98%;
          --destructive: 0 84% 60%;
          --destructive-foreground: 0 0% 100%;
          --border: 215 20% 20%;
          --input: 215 20% 20%;
          --ring: 217 91% 60%;
          --radius: 0.75rem;
        }
        body { background: #0f1419; color: #e5e7eb; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2d3748; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #4a5568; }
      `}</style>
      {children}
    </div>
  );
}
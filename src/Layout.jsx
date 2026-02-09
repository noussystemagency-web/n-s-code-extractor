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
    <div className="min-h-screen bg-[#1a1428]">
      <style>{`
        :root {
          --background: 250 40% 10%;
          --foreground: 270 20% 98%;
          --card: 250 35% 12%;
          --card-foreground: 270 20% 98%;
          --popover: 250 35% 12%;
          --popover-foreground: 270 20% 98%;
          --primary: 270 75% 65%;
          --primary-foreground: 0 0% 100%;
          --secondary: 250 30% 18%;
          --secondary-foreground: 270 20% 98%;
          --muted: 250 30% 18%;
          --muted-foreground: 260 15% 55%;
          --accent: 250 30% 18%;
          --accent-foreground: 270 20% 98%;
          --destructive: 0 84% 60%;
          --destructive-foreground: 0 0% 100%;
          --border: 260 20% 25%;
          --input: 260 20% 25%;
          --ring: 270 75% 65%;
          --radius: 0.75rem;
        }
        body { background: #1a1428; color: #e5e7eb; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2d3748; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #4a5568; }
      `}</style>
      {children}
    </div>
  );
}
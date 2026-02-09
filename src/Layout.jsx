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
    <div className="min-h-screen bg-[#ece8f5]">
      <style>{`
        :root {
          --background: 250 35% 92%;
          --foreground: 270 50% 15%;
          --card: 250 30% 96%;
          --card-foreground: 270 50% 15%;
          --popover: 250 30% 96%;
          --popover-foreground: 270 50% 15%;
          --primary: 270 70% 55%;
          --primary-foreground: 0 0% 100%;
          --secondary: 250 25% 88%;
          --secondary-foreground: 270 50% 20%;
          --muted: 250 25% 88%;
          --muted-foreground: 260 20% 45%;
          --accent: 250 25% 88%;
          --accent-foreground: 270 50% 20%;
          --destructive: 0 84% 60%;
          --destructive-foreground: 0 0% 100%;
          --border: 260 20% 75%;
          --input: 260 20% 75%;
          --ring: 270 70% 55%;
          --radius: 0.75rem;
        }
        body { background: #ece8f5; color: #2b1f3d; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #c4b5d8; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #a38ec1; }
      `}</style>
      {children}
    </div>
  );
}
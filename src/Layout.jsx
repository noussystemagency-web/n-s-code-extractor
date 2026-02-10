import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from "./utils";
import { Crosshair, Component, Clock, Library, Moon, Sun, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import NotificationCenter from "@/components/ui/notification-center";
import QuickStartGuide from "@/components/QuickStartGuide";

const NAV_ITEMS = [
  { page: 'Extractor', label: 'Extractor', icon: Crosshair },
  { page: 'ComponentLibrary', label: 'Componentes', icon: Component },
  { page: 'ProjectHistory', label: 'Historial', icon: Clock },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const currentPath = location.pathname;
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const isDark = localStorage.getItem('nous_dark_mode') === 'true';
    setDarkMode(isDark);
    if (isDark) document.documentElement.classList.add('dark');
    
    const hasSeenTutorial = localStorage.getItem('nous_tutorial_completed');
    if (!hasSeenTutorial && currentPageName === 'Extractor') {
      setTimeout(() => setShowGuide(true), 1000);
    }
  }, [currentPageName]);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('nous_dark_mode', newMode.toString());
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const addNotification = (notification) => {
    setNotifications(prev => [{
      ...notification,
      id: Date.now(),
      timestamp: new Date(),
      read: false,
    }, ...prev].slice(0, 50));
  };

  const dismissNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Expose addNotification globally for use in pages
  useEffect(() => {
    window.addNotification = addNotification;
    return () => delete window.addNotification;
  }, []);

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
        .dark {
          --background: 222 47% 11%;
          --foreground: 210 40% 98%;
          --card: 222 47% 15%;
          --card-foreground: 210 40% 98%;
          --popover: 222 47% 15%;
          --popover-foreground: 210 40% 98%;
          --primary: 217 91% 60%;
          --primary-foreground: 0 0% 100%;
          --secondary: 217 19% 27%;
          --secondary-foreground: 210 40% 98%;
          --muted: 217 19% 27%;
          --muted-foreground: 215 20% 65%;
          --accent: 217 19% 27%;
          --accent-foreground: 210 40% 98%;
          --destructive: 0 84% 60%;
          --destructive-foreground: 210 40% 98%;
          --border: 217 19% 27%;
          --input: 217 19% 27%;
          --ring: 217 91% 60%;
        }
        body { background: linear-gradient(to bottom right, #f8fafc, #f1f5f9); color: #0f172a; transition: background 0.3s, color 0.3s; }
        .dark body { background: linear-gradient(to bottom right, #0f172a, #1e293b); color: #f1f5f9; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        .dark ::-webkit-scrollbar-thumb { background: #475569; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        .dark ::-webkit-scrollbar-thumb:hover { background: #64748b; }
      `}</style>
      
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Crosshair className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-slate-900">NØÜS</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = currentPageName === item.page;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
          
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowGuide(true)}
              title="Guía rápida"
            >
              <HelpCircle className="w-4 h-4" />
            </Button>
            
            <NotificationCenter
              notifications={notifications}
              onDismiss={dismissNotification}
              onClearAll={clearAllNotifications}
            />
            
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              title={darkMode ? "Modo claro" : "Modo oscuro"}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </nav>

      <div className="pt-16">
        {children}
      </div>
      
      <QuickStartGuide open={showGuide} onOpenChange={setShowGuide} />
    </div>
  );
}
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Globe, FileCode, Image, Cpu, Scale } from "lucide-react";

export default function MetadataBar({ metadata }) {
  if (!metadata) return null;

  const items = [
    { icon: Cpu, label: metadata.framework, color: 'text-violet-400 bg-violet-500/10' },
    { icon: Scale, label: metadata.total_size, color: 'text-blue-400 bg-blue-500/10' },
    { icon: FileCode, label: `${metadata.css_count || 0} CSS`, color: 'text-emerald-400 bg-emerald-500/10' },
    { icon: FileCode, label: `${metadata.script_count || 0} JS`, color: 'text-amber-400 bg-amber-500/10' },
    { icon: Image, label: `${metadata.image_count || 0} imgs`, color: 'text-pink-400 bg-pink-500/10' },
  ].filter(i => i.label);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((item, i) => (
        <div
          key={i}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${item.color}`}
        >
          <item.icon className="w-3 h-3" />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
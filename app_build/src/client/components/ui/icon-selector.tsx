import React from "react";
import { cn } from "../../lib/utils";

interface IconSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const EMOJIS = ["🚀", "🧪", "🐛", "📦", "⚡️", "🔒", "🌐", "📱", "💻", "🔥", "✨", "🎯", "🛠", "🎨", "📝", "⚙️"];
const COLORS = [
  { name: "Gris", class: "bg-slate-500/15 hover:bg-slate-500/25 border-slate-500/20" },
  { name: "Rouge", class: "bg-red-500/15 hover:bg-red-500/25 border-red-500/20" },
  { name: "Orange", class: "bg-orange-500/15 hover:bg-orange-500/25 border-orange-500/20" },
  { name: "Ambre", class: "bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/20" },
  { name: "Vert", class: "bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/20" },
  { name: "Bleu", class: "bg-blue-500/15 hover:bg-blue-500/25 border-blue-500/20" },
  { name: "Violet", class: "bg-purple-500/15 hover:bg-purple-500/25 border-purple-500/20" },
  { name: "Rose", class: "bg-pink-500/15 hover:bg-pink-500/25 border-pink-500/20" },
];

export function IconSelector({ value, onChange }: IconSelectorProps) {
  // Parse existing value
  let currentEmoji = "🚀";
  let currentColor = COLORS[0]?.class || "";
  
  if (value) {
    if (value.startsWith("{")) {
      try {
        const parsed = JSON.parse(value);
        if (parsed.emoji) currentEmoji = parsed.emoji;
        if (parsed.color) currentColor = parsed.color;
      } catch (e) {
        currentEmoji = value;
      }
    } else {
      currentEmoji = value;
    }
  }

  const handleEmojiSelect = (emoji: string) => {
    onChange(JSON.stringify({ emoji, color: currentColor }));
  };

  const handleColorSelect = (colorClass: string) => {
    onChange(JSON.stringify({ emoji: currentEmoji, color: colorClass }));
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Sélection d'Emoji */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground">Choisir un emoji</label>
        <div className="flex flex-wrap gap-1.5">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleEmojiSelect(emoji)}
              className={cn(
                "w-8 h-8 rounded-md flex items-center justify-center hover:bg-muted transition-colors text-lg",
                currentEmoji === emoji ? "bg-accent border border-primary/50 shadow-sm" : "border border-transparent"
              )}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Sélection de Couleur */}
      <div className="space-y-1.5 mt-2">
        <label className="text-xs font-semibold text-muted-foreground">Couleur de fond</label>
        <div className="flex flex-wrap gap-1.5">
          {COLORS.map((color) => (
            <button
              key={color.name}
              type="button"
              onClick={() => handleColorSelect(color.class)}
              title={color.name}
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center transition-all border-2",
                color.class,
                currentColor === color.class ? "border-primary scale-110 shadow-sm ring-2 ring-primary/20 ring-offset-1" : "border-transparent opacity-80 hover:opacity-100 hover:scale-105"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

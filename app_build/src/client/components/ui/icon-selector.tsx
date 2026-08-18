import React from "react";
import { cn } from "../../lib/utils";

interface IconSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const EMOJIS = ["🚀", "🧪", "🐛", "📦", "⚡️", "🔒", "🌐", "📱", "💻", "🔥", "✨", "🎯", "🛠", "🎨", "📝", "⚙️"];
const COLORS = [
  { name: "Gris", class: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  { name: "Rouge", class: "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400" },
  { name: "Orange", class: "bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400" },
  { name: "Ambre", class: "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400" },
  { name: "Vert", class: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400" },
  { name: "Bleu", class: "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400" },
  { name: "Violet", class: "bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400" },
  { name: "Rose", class: "bg-pink-100 text-pink-600 dark:bg-pink-900/50 dark:text-pink-400" },
];

export function IconSelector({ value, onChange }: IconSelectorProps) {
  // Parse existing value
  let currentEmoji = "🚀";
  let currentColor = COLORS[0]?.class || "bg-slate-100 text-slate-600";
  
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
      {/* Aperçu */}
      <div className="flex items-center gap-3 mb-1">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-xl shadow-sm border border-border/50", currentColor)}>
          {currentEmoji}
        </div>
        <span className="text-xs text-muted-foreground">Aperçu de l'icône</span>
      </div>

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

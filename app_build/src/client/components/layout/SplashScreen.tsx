import React, { useState, useEffect } from "react";

const loadingTexts = [
  "Initialisation du moteur Bun...",
  "Chargement de la collection...",
  "Démarrage des intercepteurs...",
  "Lancement de l'interface...",
];

export function SplashScreen({ onComplete }: { onComplete?: () => void }) {
  const [progress, setProgress] = useState(0);
  const [textIndex, setTextIndex] = useState(0);

  useEffect(() => {
    let frame: number;
    let startTime: number | null = null;
    const duration = 1500;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const nextProgress = Math.min((elapsed / duration) * 100, 100);

      setProgress(Math.floor(nextProgress));

      // Mettre à jour le texte en fonction de la progression
      const nextIndex = Math.min(
        Math.floor((nextProgress / 100) * loadingTexts.length),
        loadingTexts.length - 1
      );
      setTextIndex(nextIndex);

      if (nextProgress < 100) {
        frame = requestAnimationFrame(animate);
      } else {
        if (onComplete) setTimeout(onComplete, 200); // Petit délai pour voir le 100%
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background overflow-hidden text-foreground">
      <div className="flex flex-col items-center animate-in slide-in-from-top-12 fade-in duration-700 ease-out fill-mode-both">
        <div className="mb-8 p-6 bg-card rounded-3xl shadow-xl border border-border">
          <img
            src="/echo-logo.jpg"
            alt="Echo Logo"
            className="w-32 h-32 object-contain rounded-xl"
          />
        </div>

        <h1 className="text-4xl font-extrabold mb-2 tracking-tight">ECHO</h1>
        <p className="text-lg font-medium text-muted-foreground mb-12">
          Mocking API haute performance
        </p>

        <div className="w-96 max-w-[90vw] flex flex-col gap-3">
          <div className="flex justify-between font-semibold text-xs text-muted-foreground uppercase tracking-wider">
            <span className="truncate pr-4">{loadingTexts[textIndex]}</span>
            <span className="shrink-0">{progress}%</span>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';

const loadingTexts = [
 "Initialisation du moteur Bun...",
 "Synchronisation des fichiers Bruno...",
 "Montage des intercepteurs MSW...",
 "Lancement du Dashboard..."
];

export function SplashScreen({ onComplete }: { onComplete?: () => void }) {
 const [progress, setProgress] = useState(0);
 const [textIndex, setTextIndex] = useState(0);

 useEffect(() => {
 const duration = 1500;
 const intervalTime = 30; // ms
 const steps = duration / intervalTime;
 let currentStep = 0;

 const interval = setInterval(() => {
 currentStep++;
 const newProgress = Math.min(100, Math.round((currentStep / steps) * 100));
 setProgress(newProgress);
 
 const newTextIndex = Math.min(
 loadingTexts.length - 1,
 Math.floor((newProgress / 100) * loadingTexts.length)
 );
 setTextIndex(newTextIndex);

 if (currentStep >= steps) {
 clearInterval(interval);
 setTimeout(() => {
 if (onComplete) onComplete();
 }, 200);
 }
 }, intervalTime);

 return () => clearInterval(interval);
 }, [onComplete]);

 return (
 <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-50 overflow-hidden text-foreground">
 <div className="flex flex-col items-center animate-in slide-in-from-top-12 fade-in duration-700 ease-out fill-mode-both">
 <div className="p-4 bg-white mb-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
 <img src="/echo-logo.jpg" alt="Echo Logo" className="w-48 h-48 object-contain" />
 </div>
 
 <h1 className="text-5xl font-black mb-2 tracking-tight">ECHO</h1>
 <p className="text-xl font-bold text-muted-foreground mb-12">Mocking API haute performance</p>

 <div className="w-80 flex flex-col gap-2">
 <div className="flex justify-between font-black uppercase text-xs sm:text-sm">
 <span>{loadingTexts[textIndex]}</span>
 <span>{progress}%</span>
 </div>
 <div className="h-6 w-full bg-white border-2 border-black overflow-hidden relative">
 <div 
 className="h-full bg- border-r-2 border-black transition-all duration-75"
 style={{ width: `${progress}%` }}
 />
 </div>
 </div>
 </div>
 </div>
 );
}

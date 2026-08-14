import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import "./index.css";

export function App() {
  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <Card className="max-w-lg border-neutral-800 bg-neutral-900 text-neutral-100 shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-6">
            <img src="/echo-logo.jpg" alt="Echo Logo" className="w-28 h-28 rounded-2xl shadow-xl shadow-purple-900/20 border border-neutral-800" />
          </div>
          <CardTitle className="text-4xl font-black tracking-tight text-white mb-2">
            Projet Echo
          </CardTitle>
          <CardDescription className="text-neutral-400 text-lg">
            L'illusion parfaite pour les développeurs frontend.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center pt-4">
          <p className="text-neutral-300 leading-relaxed">
            Bienvenue sur l'interface d'administration de l'outil de mocking ultime. 
            Notre mission ? Vous faire croire que les APIs du backend sont prêtes et renvoient des données de production de manière instantanée.
          </p>
          <p className="mt-4 text-sm text-neutral-500 italic">
            (Spoiler : Tout ceci n'est qu'un mirage orchestré par MSW et Bun. Ne le dites à personne.)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;

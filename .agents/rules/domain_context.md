# Contexte du Domaine Métier

*Cette règle système s'applique obligatoirement à **TOUS LES AGENTS** (PM, Engineer, QA, DevOps) lorsqu'ils traitent une requête de l'utilisateur. Elle complète les objectifs et le contexte global décrits dans le fichier `CONTEXT.md` situé à la racine du projet.*

## 1. Moteur Backend (Bun + MSW)
- **Mock Service Worker (MSW)** : L'interception des requêtes se fait exclusivement via `msw/node` (côté serveur Bun), qui intercepte les flux HTTP entrants.
- **Source de Vérité (Bruno)** : Ne concevez pas de base de données relationnelle (PostgreSQL, MySQL). La seule base de données est le système de fichiers lisant des fichiers `.bru` (Bruno) versionnés sur Git.
- **Synchronisation & Hot-Swap** : L'application met à jour ses mocks MSW "à chaud" sans redémarrer le serveur, en écoutant les changements de fichiers (`fs.watch`) ou en exécutant un `git pull` en arrière-plan. Analysez les `git diff` de manière incrémentale.
- **Pass-through** : Echo agit en tant que serveur HTTP Proxy. Si une route n'a pas de mock configuré ou activé, elle doit "passer à travers" (pass-through) vers la véritable API.

## 2. Interface Utilisateur (Dashboard React)
- **Layout** : L'UI adopte un format "Split-Screen" (3 panneaux) nécessitant l'utilisation intelligente des composants Shadcn et des flexbox/grid Tailwind.
- **Performances (Virtualisation)** : Il y a plus de 600 requêtes. Toute liste affichée dans l'interface DOIT utiliser le **virtual scrolling** (par exemple avec `@tanstack/react-virtual`) pour éviter de bloquer le thread principal.
- **Fonctionnalités avancées** : 
  - Éditeur JSON interactif pour l'override (surcharge à la volée) des payloads.
  - Sauvegarde locale de l'état (Favoris, routes surchargées) afin de pouvoir "revenir en arrière" (rollback) vers le retour par défaut de Bruno.
  - Bulk Actions (Actions en masse) pour déclencher des scénarios d'erreurs (Ex: forcer une 500 sur tous les endpoints).

## 3. Garde-fous (Guardrails)
- Ne proposez pas d'architectures Backend-as-a-Service (Supabase, Firebase).
- Ne proposez pas d'outils de mocking tiers autres que MSW.
- Tout nouveau code backend doit exploiter la vitesse des APIs natives de Bun.

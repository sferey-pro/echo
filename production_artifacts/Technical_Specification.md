# Spécifications Techniques: Interface du Dashboard (Version Grid & Mock Data)

## Résumé Exécutif
L'objectif est de créer la structure de base du Dashboard (interface principale) pour l'outil Echo. Conformément à la demande de l'utilisateur, cette itération n'utilisera **pas** de panneaux redimensionnables (`react-resizable-panels`). À la place, elle implémentera une disposition statique en grille CSS (CSS Grid) pour construire la vue en 3 panneaux (Split-Screen). L'interface sera d'abord alimentée par de fausses données (mock data) pour simuler le fonctionnement attendu avant sa connexion au véritable moteur MSW/Bruno.

## Exigences
### Fonctionnelles
- Créer une interface divisée en 3 panneaux principaux :
  1. **Panneau de Navigation (Sidebar Gauche)** : Affichage d'une arborescence simulée de dossiers et fichiers (projet Bruno).
  2. **Panneau Central (Liste des Requêtes)** : Affichage d'une liste factice de requêtes API (incluant la méthode HTTP, le chemin et un statut simulé).
  3. **Panneau de Détails (Éditeur Droit)** : Affichage des détails de la requête sélectionnée, avec des éléments d'interface pour le payload JSON simulé, les sélecteurs de mock, etc.
- Utiliser uniquement des données statiques (fausses données) pour populer les composants à ce stade.
- Interactivité basique : Cliquer sur une requête dans le panneau central doit actualiser le panneau de détails.

### Non fonctionnelles
- **Layout** : Utilisation exclusive de CSS Grid (ex: `grid-cols-[20%_50%_30%]` ou largeurs fixes/fluides appropriées). **Aucun composant de redimensionnement interactif.**
- **Esthétique** : S'appuyer sur TailwindCSS et Shadcn UI pour garantir un rendu moderne, cohérent et épuré.
- **Préparation** : Structurer les listes de manière à faciliter l'intégration future du *virtual scrolling* (nécessaire pour >600 requêtes).

## Architecture & Tech Stack
- **Environnement** : Bun + React + TypeScript (situé dans `app_build/`).
- **Styling & UI** : TailwindCSS et Shadcn UI.
- **Structure des Fichiers** :
  - `app_build/src/components/layout/DashboardLayout.tsx` : Composant racine instanciant la grille CSS.
  - `app_build/src/components/dashboard/Sidebar.tsx` : Panneau gauche.
  - `app_build/src/components/dashboard/RequestList.tsx` : Panneau central.
  - `app_build/src/components/dashboard/RequestDetails.tsx` : Panneau droit.
  - `app_build/src/mocks/fakeData.ts` : Source de vérité temporaire contenant les fausses données structurées.

## Gestion de l'État
- L'état sera géré localement avec les hooks React (`useState`).
- Le composant parent (ex: `DashboardLayout` ou un composant page) conservera l'identifiant de la requête actuellement sélectionnée et transmettra les données appropriées aux sous-composants via des props. Aucun gestionnaire d'état complexe (Zustand, Redux) n'est requis pour cette phase de maquettage.

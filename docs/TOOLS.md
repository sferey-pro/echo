# Outils Utiles

Ce document recense les différents outils intéressants et utiles découverts au fil du développement pour ne pas les oublier.

## Outils d'Analyse et de Nettoyage

### [Knip](https://knip.dev/)
**Usage :** `bunx --bun knip` ou `npx knip`

**Description :**
Knip est un outil d'analyse statique extrêmement performant pour les projets JavaScript/TypeScript. Il permet de trouver et de supprimer le code mort au sein d'un projet.

**Fonctionnalités clés :**
- Détection des fichiers non utilisés.
- Détection des dépendances (`dependencies` et `devDependencies`) non utilisées dans le `package.json`.
- Détection des exports orphelins (variables, fonctions, types, interfaces qui sont exportés mais jamais importés ailleurs).
- Détection des binaires manquants ou non listés dans les dépendances.

**Astuces d'utilisation :**
L'outil peut être configuré via un fichier `knip.json` ou `knip.ts` à la racine pour ignorer certains fichiers spécifiques (comme les points d'entrée HTML ou les composants UI standards qui n'ont pas encore été utilisés).

## Architecture et Dépendances

### [Dependency Cruiser](https://github.com/sverweij/dependency-cruiser)
**Usage :** `bun run depcruise`

**Description :**
Outil puissant pour valider et visualiser les dépendances entre les modules de ton application. Il te permet de définir des règles architecturales et d'empêcher ton code de se transformer en "plat de spaghettis" (spaghetti code).

**Fonctionnalités clés :**
- Détection des dépendances circulaires qui peuvent causer des bugs difficiles à tracer.
- Interdiction d'importer des fichiers spécifiques selon des règles définies (ex: interdire à un composant de l'interface d'importer la base de données directement).
- Visualisation graphique de ton architecture de dépendance.
- Détection de modules "orphelins" non liés au reste de l'application.

**Astuces d'utilisation :**
Le fichier de configuration `.dependency-cruiser.cjs` généré à la racine définit les règles interdites (`forbidden`). Tu peux y rajouter des règles d'architecture (par exemple : le dossier `src/client` n'a pas le droit d'importer le dossier `src/server`).

> [!WARNING]  
> **Pourquoi cet outil n'est-il pas installé actuellement ?**  
> L'outil a été testé mais désinstallé temporairement car il ne supporte pas encore (à ce jour) la version `7.x` de TypeScript. Dès que son API interne sera mise à jour pour TypeScript 7, nous pourrons le réinstaller avec `bun add -d dependency-cruiser` et l'initialiser avec `npx depcruise --init`.

## Linting et Formatage

### [Biome](https://biomejs.dev/)
**Usage :** `bunx @biomejs/biome format --write ./src` ou `bunx @biomejs/biome check --apply ./src`

**Description :**
Biome est un outil extrêmement rapide écrit en Rust qui remplace conjointement **ESLint** (pour l'analyse de code) et **Prettier** (pour le formatage). 

**Fonctionnalités clés :**
- Vitesse fulgurante (souvent moins d'une seconde pour de gros projets) grâce au langage Rust.
- Unifie le linting et le formattage sous un seul outil avec d'excellentes règles de base pour JavaScript et TypeScript.
- Très facile à configurer (`biome.json`) contrairement aux usines à gaz de configuration ESLint.
- Support natif et rapide dans VSCode/Cursor.

**Astuces d'utilisation :**
L'initialisation se fait via `bunx @biomejs/biome init`. Il est recommandé de le mettre en place au début d'un projet avant que la base de code ne devienne trop volumineuse pour éviter de générer un énorme diff Git lors du premier formatage global.

## Git Hooks et Automatisation

### [Lefthook](https://github.com/evilmartians/lefthook) & [lint-staged](https://github.com/lint-staged/lint-staged)
**Usage :** Automatique lors des commits (via `lefthook.yml`).

**Description :**
Lefthook est un gestionnaire de hooks Git rapide (écrit en Go), utilisé ici conjointement avec `lint-staged` pour s'assurer que seuls les fichiers modifiés (`staged`) passent par le linter et le formateur avant chaque commit.

**Fonctionnalités clés :**
- Empêche le commit de code non formaté ou contenant des erreurs de linting.
- Vitesse optimisée (Lefthook exécute les commandes en parallèle).
- Ne ralentit pas les commits en se concentrant uniquement sur les fichiers modifiés (grâce à `lint-staged`).

**Astuces d'utilisation :**
La configuration se trouve dans le fichier `lefthook.yml` à la racine et `.lintstagedrc.json` dans le dossier de l'application.

### Zod

Zod est utilisé pour la validation des données à l'exécution et le typage strict des structures manipulées par l'application.

- **Usage** : Validation des charges utiles (payloads) d'API côté serveur, validation des données récupérées depuis la base de données, et validation des réponses de fetch côté client.
- **Fichiers clés** : Les schémas centraux sont définis dans `src/shared/schemas.ts`.
- **Règle stricte** : L'utilisation de `any` ou `unknown` doit être évitée. Zod permet d'inférer les types TypeScript (`z.infer`) qui sont ensuite partagés entre le serveur et le client.

# Echo

Echo est un serveur de mock API et un tableau de bord interactif basé sur les collections Bruno.
Il permet d'importer une collection Bruno, de simuler les réponses de l'API (avec différents variants, latences, et codes HTTP), et de tester des scénarios.

## Fonctionnalités Principales

- **Tableau de bord complet** : Interface React + Tailwind CSS + Shadcn UI pour gérer les requêtes.
- **Support natif des collections Bruno** : L'application parse directement le dossier de votre collection Bruno et synchronise les changements dans une base de données locale SQLite.
- **Mock Avancé** : Permet de définir plusieurs "variants" pour une même requête, d'ajouter de la latence, ou d'écraser des paramètres de route.
- **Gestion Multi-Collections** : Permet de gérer plusieurs collections, de basculer d'une collection à l'autre via l'UI et d'exporter/importer une collection et son état de mock.
- **Synchronisation Git** : Synchronise automatiquement votre collection Bruno depuis un dépôt Git.

## Stack Technique

- **Backend** : Bun.js (serveur HTTP ultra-rapide) avec SQLite (`bun:sqlite`).
- **Frontend** : React 18, Vite, Zustand (state management), Tailwind CSS, Shadcn UI.
- **Base de données** : SQLite (stockage de l'état local dans `.echo-state.sqlite`).

## Installation & Lancement

1. Installer les dépendances :
```bash
bun install
```

2. Démarrer le serveur de développement :
```bash
bun run dev
```
Le tableau de bord sera disponible sur `http://localhost:3000` et les requêtes mockées répondront sur les mêmes URL préfixées par `/api` (ou selon la configuration de votre proxy).

## Configuration

L'application stocke sa base de données SQLite dans `.echo-state.sqlite` à la racine du dossier.
Une variable d'environnement `ECHO_DATA_DIR` peut être définie pour changer l'emplacement de stockage.

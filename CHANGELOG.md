# Changelog

Toutes les modifications notables apportées à ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/), et ce projet adhère au principe de [Versionnement Sémantique](https://semver.org/lang/fr/).

## [Unreleased] - En cours de développement

### Ajouté
- Serveur de démonstration (`demo_server`) basé sur ElysiaJS pour simuler des APIs E-Commerce.
- Base de données locale configurée (`echo.db` dans `app_build`) pour persister l'état.
- Initialisation du projet frontend via le template `bun init` avec React.
- Mise en place de Shadcn UI et TailwindCSS.
- Configuration de l'environnement de test avec `happy-dom` et `@testing-library/react`.
- Définition complète de la pipeline Agentic (`.agents/`), incluant l'adaptation à Bun.
- Création de la documentation principale (README, CONTEXT, ISSUES, CHANGELOG).

### Modifié
- Refonte ergonomique et visuelle de l'interface : passage d'un style néo-brutaliste à une interface moderne en liste plate.
- Éditeur Monaco passé en thème sombre avec mise à jour des couleurs des badges HTTP.
- Suppression des paramètres VS Code et nettoyage du tracking Git des fichiers de base de données.

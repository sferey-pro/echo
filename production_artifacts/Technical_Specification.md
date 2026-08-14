# Spécifications Techniques : Base de Données Embarquée (État d'Echo)

## Résumé Exécutif
L'objectif est d'implémenter un système de persistance locale pour le projet Echo. Actuellement, l'état du proxy (mocks actifs, payloads surchargés) est stocké dans une `Map` en mémoire, ce qui entraîne la perte des configurations à chaque redémarrage du serveur. Nous allons introduire une base de données embarquée ultra-rapide pour persister ces paramètres sans alourdir l'infrastructure du développeur.

## Exigences
- **Fonctionnelles** :
  - Sauvegarder automatiquement l'état "Mocké / Pass-through" pour chaque requête.
  - Sauvegarder les payloads JSON modifiés à la volée.
  - Restaurer l'état complet au démarrage du serveur Echo.
- **Non-fonctionnelles** :
  - Aucune dépendance externe ni serveur de base de données (conformité avec la règle d'interdiction de PostgreSQL/MySQL du `domain_context.md`).
  - Tolérance aux redémarrages.
  - Zéro configuration requise pour les développeurs frontend.

## Architecture & Tech Stack
- **Bun SQLite (`bun:sqlite`)** : Nous utiliserons le module natif de Bun pour SQLite. C'est une base de données relationnelle locale qui s'exécute dans le même processus, offrant des performances extrêmes (millions d'opérations par seconde) sans aucune installation tierce. Elle sera stockée dans un fichier `.echo-state.sqlite` ignoré par Git.
- **Schéma de Données** :
  - Table `mock_states` :
    - `request_id` (TEXT PRIMARY KEY) : L'ID déterministe généré par notre parseur.
    - `is_mocked` (BOOLEAN) : Statut d'activation du mock MSW.
    - `payload` (TEXT) : Le contenu JSON surchargé.

## Gestion de l'État
1. **Initialisation** : Au lancement de `index.ts`, une connexion `Database` est établie vers `.echo-state.sqlite`.
2. **Lecture** : Le parseur (`parser.ts`) s'appuiera sur les données lues en base de données pour populer initialement la Map locale qui est renvoyée au frontend et utilisée par MSW.
3. **Écriture** : Lorsque le frontend déclenche le point d'API `/api/mocks/update` via l'interface React, la mise à jour s'effectue à la fois dans le moteur MSW à chaud ET dans la base SQLite locale par un `INSERT ... ON CONFLICT REPLACE`.

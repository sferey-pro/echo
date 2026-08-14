# Spécifications Techniques : Page de Paramétrage

## Résumé Exécutif
Pour offrir plus de flexibilité aux développeurs frontend, Echo doit permettre la configuration de ses paramètres clés (comme l'URL de l'API cible ou le chemin de la collection Bruno) directement depuis l'interface utilisateur, sans avoir à manipuler le fichier `.env` ou relancer le serveur. Ces paramètres seront sauvegardés de manière persistante dans la base de données SQLite embarquée récemment implémentée.

## Exigences
- **Fonctionnelles** :
  - L'utilisateur peut consulter et modifier les paramètres système depuis l'interface web.
  - Paramètres à exposer : `TARGET_API_URL` et `BRUNO_COLLECTION_PATH`.
  - La modification du chemin de la collection Bruno doit déclencher un rechargement à chaud (`hot-reload`) des requêtes MSW sans redémarrer le serveur.
  - La modification de l'URL cible doit être prise en compte instantanément pour le mode Pass-through.
- **Non-fonctionnelles** :
  - Persistance dans Bun SQLite (`bun:sqlite`).
  - L'interface de paramétrage doit s'intégrer harmonieusement (fenêtre modale ou onglet dédié) avec le design existant (Shadcn UI + TailwindCSS).

## Architecture & Tech Stack
- **Base de données (SQLite)** : 
  - Ajout d'une table `settings` (colonnes : `key` TEXT PRIMARY KEY, `value` TEXT).
- **Backend (Bun)** :
  - `GET /api/settings` : Récupère les paramètres actuels.
  - `POST /api/settings` : Met à jour la base de données SQLite.
  - Modification de `index.ts` et `proxy.ts` pour lire la configuration depuis la base de données en priorité. Si la clé est introuvable, on se rabat sur la variable d'environnement, puis sur les valeurs par défaut.
- **Frontend (React)** :
  - **Composant `SettingsModal.tsx`** : Une fenêtre modale (Dialog Shadcn) accessible via un bouton ⚙️ (engrenage) dans le header de l'explorateur.
  - Le formulaire gérera un état local et un appel POST vers le backend.
  - Lors de la sauvegarde, l'interface déclenchera un re-fetch global de la collection (`/api/collections`) pour rafraîchir l'arbre de navigation.

## Gestion de l'État
1. **Lecture Backend** : La fonction `getSettings()` lira la table `settings`. Si la configuration `BRUNO_COLLECTION_PATH` est lue, le serveur charge cette collection.
2. **Mise à jour** : Le endpoint POST fera un `INSERT ... ON CONFLICT REPLACE` dans la table `settings`.
3. **Application MSW** : MSW intercepte dynamiquement les requêtes. Le `targetApiUrl` sera lu dynamiquement à chaque requête non-mockée (dans `handleProxyRequest` et le remplacement de `{{baseUrl}}`).

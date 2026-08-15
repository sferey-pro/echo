# Spécification Technique : Clonage de Collection Bruno via Git

## Résumé Exécutif
L'application Echo utilise Bruno comme source de vérité pour les mocks d'API. Actuellement, le chemin de cette collection doit être configuré manuellement. Pour simplifier l'onboarding et l'utilisation quotidienne, les développeurs frontend doivent pouvoir cloner un dépôt Git distant contenant une collection Bruno directement depuis l'interface utilisateur d'Echo (Dashboard), sans avoir à utiliser un terminal ou un client Git externe.

## Exigences

### Fonctionnelles
- L'utilisateur doit pouvoir saisir une URL de dépôt Git valide dans l'interface des paramètres d'Echo.
- L'application doit télécharger (cloner) ce dépôt Git dans un dossier spécifique (ex: `cloned_collections/`).
- En cas de succès, le paramètre `BRUNO_COLLECTION_PATH` de l'application doit être automatiquement mis à jour pour pointer vers ce nouveau dossier.
- L'utilisateur doit être notifié du succès ou de l'échec de l'opération via l'interface utilisateur.
- Le serveur MSW d'Echo doit ensuite recharger la nouvelle collection de façon transparente.

### Non Fonctionnelles
- **Sécurité** : Les commandes systèmes exécutées sur le serveur doivent être sécurisées (échappement des URLs).
- **Performance** : Le processus de clonage ne doit pas bloquer le thread principal de l'interface utilisateur (traitement asynchrone).
- **Fiabilité** : Si un dépôt de même nom existe déjà localement, le système doit le remplacer proprement pour garantir une arborescence à jour, ou exécuter un `git pull`.

## Architecture & Tech Stack

### Backend (Bun)
- **Nouvelle Route API** : Ajout d'une route `POST /api/collections/clone` dans le serveur interne Bun (`index.ts`).
- **Gestion des Processus** : Utilisation de l'API native `Bun.spawn()` pour exécuter la commande système `git clone <URL> <TARGET_DIR>`.
- **Sauvegarde d'État** : Une fois cloné, le chemin local est enregistré via la fonction SQLite existante `setSetting('BRUNO_COLLECTION_PATH', targetDir)`.

### Frontend (React, TailwindCSS, Shadcn UI)
- **Composant Modale (SettingsModal.tsx)** : Intégration d'une nouvelle section dédiée au clonage de dépôt, placée logiquement sous la configuration du chemin manuel.
- **Design System** : Utilisation des classes utilitaires de TailwindCSS pour maintenir le thème "Dark Mode" (fonds `bg-neutral-950`, bordures `border-neutral-800`, boutons `bg-blue-600` ou `bg-purple-600`).
- **Composants d'Interface** :
  - Un champ `input` de type texte pour saisir l'URL Git.
  - Un bouton `button` d'action (Shadcn-like) pour déclencher le clonage, avec désactivation (`disabled`) pendant le chargement pour éviter le multi-clic.
- **Gestion des Requêtes** : Une nouvelle méthode asynchrone dans `lib/api.ts` pour appeler le point de terminaison de clonage.

## Gestion de l'État
1. **Frontend (Saisie)** : L'utilisateur tape l'URL (état local React `repoUrl`).
2. **Action** : Clic sur le bouton de clonage, déclenchant l'état de chargement (`cloning = true`). L'appel réseau est effectué vers `/api/collections/clone`.
3. **Backend (Traitement)** : Bun exécute `git clone` et met à jour la base SQLite. La réponse HTTP 200 renvoie le nouveau chemin local.
4. **Frontend (Feedback)** : L'application React met à jour le champ `collectionPath` visible avec la nouvelle valeur, désactive l'état de chargement, affiche une alerte de succès (ou d'erreur le cas échéant), et invite l'utilisateur à sauvegarder pour recharger MSW.

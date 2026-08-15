# Spécification Technique : Système de Favoris (Starred)

## Résumé Exécutif
L'application Echo gère un volume important de requêtes (plus de 600 prévues). Pour améliorer l'ergonomie, les développeurs ont besoin de pouvoir mettre en "favoris" certaines requêtes importantes. Ces requêtes épinglées apparaîtront dans un onglet ou un espace dédié situé au-dessus de l'arborescence classique des dossiers, permettant un accès immédiat.

## Exigences

### Fonctionnelles
- L'utilisateur doit pouvoir marquer ou démarquer une requête comme "Favori" (étoile) depuis la liste ou les détails de la requête.
- Une section "Favoris" (ou un onglet) doit être visible en haut du panneau `RequestList`.
- Les requêtes favorites doivent y être listées directement, sans tenir compte de la hiérarchie de leurs dossiers parents.
- L'état "favori" doit être persistant au redémarrage de l'application (sauvegarde en base de données).

### Non Fonctionnelles
- **Performance** : La liste des favoris doit se mettre à jour instantanément côté client de manière optimiste, puis se synchroniser avec le backend.
- **Ergonomie** : Un indicateur visuel (icône étoile ⭐) doit clairement distinguer une requête favorite d'une requête normale.
- **Persistance** : Le système doit s'appuyer sur la base SQLite existante pour éviter l'introduction d'un nouveau système de stockage.

## Architecture & Tech Stack

### Backend (Bun & SQLite)
- **Base de Données (`db.ts`)** : 
  - Ajouter une colonne `is_starred BOOLEAN DEFAULT 0` à la table `mock_states`.
  - Mettre à jour `getMockStates` pour renvoyer cette nouvelle propriété.
  - Modifier ou ajouter une méthode `updateMockState` ou `toggleStar` pour persister ce booléen indépendamment du mock payload.
- **API (`index.ts`)** : 
  - La route `/api/collections` renverra la propriété `isStarred` pour chaque requête en se basant sur l'état en mémoire.
  - La route `POST /api/mocks/update` acceptera un champ booléen optionnel `isStarred` pour mettre à jour la valeur.

### Frontend (React, TailwindCSS, Shadcn UI)
- **Modèles de Données (`parser.ts`)** : Ajouter la propriété `isStarred?: boolean` à l'interface `ApiRequest`.
- **Composant `RequestList.tsx`** :
  - Créer un panneau réductible "⭐ Favoris" au sommet de la vue de l'explorateur.
  - Si des requêtes sont en favoris, les afficher dans ce panneau.
  - Ajouter une icône d'étoile (cliquable ou décorative) sur chaque ligne de requête, ou un bouton dédié dans le panneau de détails (`RequestDetails.tsx`) pour basculer l'état.
- **Composant `RequestDetails.tsx`** :
  - Ajouter un bouton d'action principal (ex: une icône étoile vide/pleine près du titre) appelant l'API de mise à jour.
- **Appels API (`api.ts`)** :
  - Utiliser la fonction `updateMock` déjà existante pour inclure le champ `isStarred: boolean`.

## Gestion de l'État
1. **Frontend (Toggle)** : L'utilisateur clique sur l'icône étoile. L'état React local met immédiatement à jour `isStarred` pour cette requête (optimistic UI) et affiche l'étoile pleine.
2. **Appel Réseau** : Le composant lance `updateMock(id, { isStarred: true/false })` de manière asynchrone vers le backend.
3. **Backend** : Bun reçoit la requête, met à jour la `Map` en mémoire (`mockStates`) et déclenche l'écriture dans SQLite (`db.ts`).
4. **Vue Liste** : Le panneau `RequestList` (qui réagit aux changements d'état global ou reçoit les props) affiche instantanément la requête dans le dossier "⭐ Favoris".

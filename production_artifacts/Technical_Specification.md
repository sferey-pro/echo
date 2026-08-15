# Spécifications Techniques : Gestionnaire de Collections Multiples (Echo)

## 1. Résumé Exécutif
L'objectif est d'étendre les capacités d'Echo pour permettre la gestion de multiples projets Bruno (collections). L'utilisateur doit pouvoir cloner plusieurs dépôts Git contenant des collections, visualiser la liste de ces projets, et basculer facilement d'une collection active à une autre via une interface dédiée, distincte du Dashboard principal.

## 2. Exigences Fonctionnelles
- **Interface de gestion** : Une nouvelle interface (Vue dédiée ou grande modale plein écran) permettant d'administrer les collections.
- **Clonage de dépôts** : Permettre de cloner un projet Bruno depuis une URL Git. Le projet sera stocké dans un sous-dossier du répertoire `collection/`.
- **Lister les collections** : Afficher la liste de tous les projets Bruno actuellement stockés localement sur le serveur.
- **Activer une collection** : Un bouton pour définir une collection spécifique comme "Active". Cela mettra à jour la configuration globale d'Echo (`BRUNO_COLLECTION_PATH`) et rafraîchira le Dashboard principal.
- **Suppression (Optionnel mais recommandé)** : Permettre de supprimer un dépôt cloné localement pour libérer de l'espace.

## 3. Architecture & Tech Stack

### 3.1 Backend (Bun / ElysiaJS)
Nous allons étendre l'API interne (`index.ts`) :
- `GET /api/repositories` : Lit le répertoire `../collection` pour retourner la liste des dossiers existants (les projets clonés).
- `POST /api/repositories/clone` : Clone un dépôt Git dans un sous-dossier de `../collection/` portant le nom du dépôt. *Modification : Ne définit plus automatiquement ce dépôt comme actif.*
- `POST /api/settings` : Utilisé pour mettre à jour la collection active. La clé `ACTIVE_COLLECTION_NAME` stockera uniquement le **nom du dossier** (ex: `samples-bruno`), puisque toutes les collections sont désormais strictement stockées dans le dossier racine `collection/`. Le champ de saisie manuelle d'un chemin de collection disparaîtra de l'interface des paramètres généraux.
- `DELETE /api/repositories/:name` : Supprime le dossier correspondant du disque.

### 3.2 Frontend (React / TailwindCSS / Shadcn UI)
- **Nouvelle Vue ou Modale** : Création d'un composant `CollectionManager.tsx`.
- **Composants UI (Shadcn)** :
  - `Card` pour afficher chaque dépôt cloné sous forme de tuile.
  - `Input` et `Button` pour le formulaire de clonage d'URL Git.
  - `Badge` pour indiquer quelle collection est actuellement "ACTIVE".
- **Navigation** : Un bouton "Gérer les Collections" (ex: 📚) sera ajouté dans la barre de menu ou dans le header pour accéder à cette interface de gestion.
- **State Management** : L'état local du `CollectionManager` appellera `GET /api/repositories` au montage. Lors du clic sur "Activer", un appel à `POST /api/settings` est fait, suivi d'un rechargement de l'arborescence (ou rechargement complet de la page via `window.location.reload()`).

## 4. Gestion de l'État et Flux de Données
1. L'utilisateur ouvre le "Collection Manager". Le Frontend demande la liste des dossiers au backend.
2. Pour cloner : le Frontend envoie l'URL Git. Le Backend exécute `git clone` dans `../collection/{repo_name}` et retourne le succès. Le Frontend rafraîchit la liste.
3. Pour activer : le Frontend envoie le chemin absolu du dossier au backend via `/api/settings`. Le backend persiste cela dans SQLite. Le Frontend retourne au Dashboard et recharge les requêtes (via `fetchAndSetCollection()`).

## 5. Design & Ergonomie (UX/UI)
L'interface de gestion des collections conservera l'esthétique "Premium & Glassmorphism" :
- Tuiles avec effet de survol (hover scale, lueur violette/bleue).
- Boutons d'action clairs ("Cloner", "Activer", "Supprimer").
- Indicateur visuel fort (bordure néon ou badge) pour la collection actuellement active.

---
**À l'attention de l'utilisateur :**
Veuillez lire ce document et indiquer si cette approche (notamment l'idée d'une Vue dédiée ou Grande Modale) vous convient pour la gestion multi-projets.

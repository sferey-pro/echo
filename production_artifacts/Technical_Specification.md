# Spécifications Techniques : Support des Environnements et Exemples Bruno

## 1. Résumé Exécutif
Cette spécification détaille l'implémentation de la lecture complète des informations issues de Bruno dans l'application Echo. Actuellement, Echo charge l'arborescence des requêtes mais gère de manière rudimentaire les variables (ex: `{{baseUrl}}` codé en dur) et ignore les multiples "examples" définis dans Bruno.
L'objectif est d'améliorer :
1. **Les variables d'environnement** : Analyser les fichiers du dossier `environments/` de Bruno pour permettre l'interpolation dynamique des variables lors du routage Proxy (MSW).
2. **Les exemples (Examples)** : Permettre à l'utilisateur de choisir parmi les multiples réponses factices (ex: "200 OK", "404 Not Found") prédéfinies dans les fichiers de requêtes Bruno.

## 2. Exigences Fonctionnelles
* **F1** : Le parseur de collection doit analyser les fichiers `environments/*.yml` (ou JSON) et extraire la liste des environnements et leurs variables.
* **F2** : L'interface utilisateur doit permettre de sélectionner l'environnement actif (via un sélecteur global).
* **F3** : Le proxy MSW doit remplacer les variables comme `{{baseUrl}}` dynamiquement dans l'URL et les headers en fonction de l'environnement actif.
* **F4** : Dans le panneau de détail (`RequestDetails.tsx`), une liste déroulante doit afficher les exemples disponibles (tirés du fichier YAML de la requête).
* **F5** : La sélection d'un exemple doit immédiatement préremplir le "Payload de Réponse JSON". Toute modification manuelle du textarea basculera le choix sur "Personnalisé" (Custom).

## 3. Architecture & Tech Stack (Bun, React, TailwindCSS, Shadcn)

### 3.1. Parsing Côté Backend (Bun / Elysia)
*   **Fichier : `app_build/src/lib/parser.ts`**
    *   **Ajout** : Exploration du dossier `environments/`.
    *   **Parsing** : Utilisation de la librairie `yaml` existante pour lire les fichiers `name: "Demo"`, `variables: [{name, value}]`.
    *   **Retour** : Le point de terminaison `/api/collections` exposera un tableau d'environnements `environments: Environment[]` en plus de `folders` et `requests`.

### 3.2. Gestion de l'État (SQLite & React)
*   **Backend (`lib/db.ts`)** :
    *   Ajout d'une clé de réglage globale (Settings) : `ACTIVE_ENVIRONMENT`.
*   **Frontend (`DashboardLayout.tsx` & `RequestDetails.tsx`)** :
    *   Ajout d'un menu déroulant type *Shadcn `Select`* dans le Header global pour basculer entre les environnements de la collection.
    *   Ajout d'un composant de choix d'exemple (Select/Boutons radio) au-dessus du textarea du Payload.

### 3.3. Proxy MSW (`app_build/src/lib/proxy.ts`)
*   **Interpolation** : 
    *   Actuellement, la ligne `req.url.replace(/\{\{[^}]+\}\}/g, targetApiUrl)` cible `TARGET_API_URL`.
    *   **Nouvelle logique** : Récupérer l'environnement actif depuis la BDD SQLite. Pour chaque variable `{{key}}`, vérifier si elle existe dans l'environnement actif. Si oui, effectuer le remplacement (ex: `baseUrl` -> `http://localhost:8080`).

## 4. Portes d'Approbation et Questions Ouvertes

> [!IMPORTANT]
> **Validation Requise** : L'architecture ci-dessus repose sur le couplage entre l'état local persistant (SQLite) et le proxy (MSW).

> [!WARNING]
> **Questions pour vous :**
> 1. Si une requête contient des variables dans son Corps (Body JSON) ou ses Headers, devons-nous également les remplacer par leurs valeurs d'environnement via MSW ?
> 2. L'interface pour les "Exemples" doit-elle se présenter sous la forme d'un menu déroulant (*Select*), ou préférez-vous des "Tabs" (Onglets) si le nombre d'exemples est généralement faible (1 à 3) ?

# Spécifications Techniques : Contrôle Avancé du Mock (Latence & Statut HTTP)

## 1. Résumé Exécutif
L'objectif est d'enrichir le panneau de contrôle de chaque requête (actuellement binaire "Mock Actif" On/Off) pour permettre la simulation de conditions réelles de production (dégradation du réseau, erreurs serveur). Nous ajouterons des paramètres de **Latence** (pour simuler la lenteur) et de **Statut HTTP** (pour simuler les pannes ou les succès spécifiques).

## 2. Exigences Fonctionnelles
- **Sélecteur de Statut HTTP** : L'utilisateur pourra définir le code de statut HTTP de la réponse mockée via un menu déroulant (ex: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Internal Server Error).
- **Curseur de Latence (Délai)** : Un contrôle (slider ou input numérique) permettant de définir un délai artificiel de réponse allant de 0ms (instantané) à 5000ms (5 secondes).
- **Persistance par Requête** : Ces paramètres seront sauvegardés individuellement pour chaque requête dans la base de données locale (SQLite).
- **Application en Temps Réel** : Le proxy (`proxy.ts`) appliquera automatiquement ce délai (via `setTimeout` ou `Bun.sleep`) et retournera le statut HTTP spécifié.

## 3. Architecture & Tech Stack

### 3.1 Base de données (SQLite)
La table existante `mock_states` dans `.echo-state.sqlite` devra être mise à jour avec deux nouvelles colonnes (via une migration `ALTER TABLE` lors de l'initialisation) :
- `status_code` (INTEGER) : Par défaut à `200`.
- `latency_ms` (INTEGER) : Par défaut à `0`.

### 3.2 Backend (Bun / ElysiaJS - `index.ts` & `proxy.ts`)
- **API Mise à jour (`/api/mocks/update`)** : Sera modifiée pour accepter et traiter les champs `statusCode` et `latencyMs`.
- **Proxy Engine (`proxy.ts`)** : Lors de l'interception (`handleProxyRequest`), si la requête est mockée :
  1. Si `latencyMs > 0`, introduire une pause asynchrone avant de répondre.
  2. Construire la réponse HTTP en injectant le `statusCode` paramétré plutôt que le code 200 par défaut.

### 3.3 Frontend (React / TailwindCSS / Shadcn UI - `RequestDetails.tsx`)
- **UI "Mock Settings"** : Un nouveau sous-panneau (ou encart dans l'en-tête de la requête) contenant :
  - Un `<Select>` (ou menu Shadcn) pour les codes HTTP les plus courants, avec leurs codes couleurs habituels (Vert pour 200, Rouge pour 400/500).
  - Un `<Slider>` ou champ `<Input type="number">` pour définir la latence en millisecondes.
- **Sauvegarde Automatique** : La modification de ces paramètres déclenchera automatiquement la sauvegarde backend (similairement à la sélection d'un exemple).

## 4. Gestion de l'État et Flux de Données
1. L'utilisateur modifie la latence via le curseur.
2. Le composant `RequestDetails` met à jour son state local et debounce un appel `updateMock` au backend avec le nouveau `{ latencyMs }`.
3. L'API backend met à jour la ligne correspondante dans `mock_states`.
4. La prochaine requête frontend interceptée par le proxy lira l'état mis à jour, fera une pause (ex: `Bun.sleep(1500)`), puis répondra.

## 5. Design & Ergonomie (UX/UI)
- Ces nouveaux réglages apparaîtront juste en dessous ou à côté du bouton "Mock Actif", de façon discrète mais accessible.
- Le style "Glassmorphism" continuera de s'appliquer.
- L'utilisation de badges colorés pour les statuts HTTP (ex: `🟢 200`, `🔴 500`) rendra l'interface très lisible d'un coup d'œil.

---
**À l'attention de l'utilisateur :**
Veuillez vérifier cette proposition architecturale et les modifications prévues sur la base de données.
Approuvez-vous ces spécifications ? (Si oui, répondez "Approuvé", sinon n'hésitez pas à proposer des modifications !)

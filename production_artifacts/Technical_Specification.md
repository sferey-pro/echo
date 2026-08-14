# Spécifications Techniques : Intercepteur de Requêtes MSW (Proxy Echo)

## Résumé Exécutif
Ce document définit l'architecture et les étapes de développement pour la mise en place de l'intercepteur de requêtes au cœur du projet **Echo**. L'objectif est de créer un véritable serveur proxy basé sur Bun qui utilisera **Mock Service Worker (MSW)** côté serveur (`msw/node`). Ce proxy interceptera les requêtes entrantes, décidera s'il faut renvoyer un mock (définition issue de la collection Bruno modifiée via le Dashboard) ou s'il doit laisser passer la requête vers la véritable API distante (Pass-through).

## 1. Exigences

### 1.1 Exigences Fonctionnelles
* **Proxy Serveur (Port 3002)** : Echo doit exposer un port dédié aux applications clientes (ex: Frontend tiers ciblant `http://localhost:3002` au lieu de `https://api.vrai.com`).
* **Interception MSW** : MSW doit analyser la requête proxyfiée et vérifier si l'endpoint est marqué comme "actif/mocked" dans la mémoire interne du backend Echo.
* **Mode Pass-through** : Si la requête n'est pas mockée, le serveur proxy effectue un véritable appel HTTP (`fetch` natif) vers l'API cible et renvoie le résultat au client de façon transparente.
* **Mise à jour à chaud (Hot-Swap)** : Lorsqu'un développeur modifie le payload d'une requête ou active/désactive le mock depuis le Dashboard (React), les *handlers* MSW doivent être mis à jour en temps réel en mémoire sans redémarrer Bun (utilisation de `server.use()`).

### 1.2 Exigences Non-Fonctionnelles
* **Performance** : L'interception MSW et le relai de proxy ne doivent pas introduire de latence perceptible par rapport à l'API originale.
* **Typage strict** : Utilisation exclusive de TypeScript.

## 2. Architecture & Tech Stack

### 2.1 Infrastructure Serveurs Bun
Nous allons orchestrer **trois serveurs HTTP Bun** en parallèle au sein du même processus (`index.ts`) :
1. **Frontend (Port 3000)** : Le Dashboard React propulsé par Bun (`routes: { "/*": index }`).
2. **API Interne (Port 3001)** : Les endpoints de gestion (ex: `/api/collections`, `/api/mocks/update`) pour communiquer avec le Dashboard.
3. **Proxy MSW (Port 3002)** : Le reverse-proxy public cible.
   - Les clients tapent sur `:3002/pet/1`.
   - Le serveur Bun exécute `fetch(baseUrl + req.url)`.
   - MSW (configuré via `setupServer()`) intercepte ce `fetch`. S'il y a un mock, MSW répond avec les fausses données. Sinon, `onUnhandledRequest: 'bypass'` laisse Bun appeler la vraie API.

### 2.2 Frameworks & Librairies
* **Runtime** : Bun natif (`Bun.serve`).
* **Mocking** : `msw` (Node.js API : `setupServer`, `http`, `HttpResponse`).
* **Dashboard (Existant)** : React 19, TailwindCSS 4, Shadcn.

## 3. Gestion de l'État et Flux de Données

1. **Initialisation** : Au démarrage, le backend parse la collection Bruno (déjà implémenté). Il génère l'état global en mémoire (un dictionnaire de requêtes avec `isMocked: boolean` et `payload: any`).
2. **Configuration MSW** : `setupServer` est initialisé avec un *handler* générique ou dynamique lisant cet état en mémoire.
3. **Mise à jour via UI** : 
   - L'utilisateur clique sur "Sauvegarder" dans `RequestDetails.tsx`.
   - Le Dashboard envoie un `POST` à l'API interne (`:3001/api/mocks/:id`).
   - L'API interne met à jour la mémoire et invoque `server.use(...)` ou met simplement à jour l'état partagé que MSW lit à la volée.
4. **Requête Cliente** : Une requête arrive sur `:3002`. Le flux traverse MSW en une fraction de seconde, récupère l'état mis à jour, et renvoie la réponse mockée ou originelle.

---

> [!IMPORTANT]
> **Veuillez lire attentivement ce document. Êtes-vous d'accord avec cette architecture en trois serveurs et l'utilisation de MSW via un `fetch` proxy interne ?**
> Répondez "Approuvé" ou "Oui" pour que je puisse lancer l'Ingénieur Full-Stack à l'étape du développement !

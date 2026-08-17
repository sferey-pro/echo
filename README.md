# Echo Project

Bienvenue sur le projet **Echo** ! 
Echo est un **outil de Mocking d'API** performant conçu pour les développeurs frontend. Il simule de véritables APIs en se basant sur les configurations et exemples de l'outil **Bruno**. Construit comme un serveur HTTP proxy autonome, il intègre Mock Service Worker (MSW) et un dashboard interactif complet.

## 🚀 Stack Technique
*   **Runtime & Package Manager** : [Bun](https://bun.sh/)
*   **Frontend** : [React 19](https://react.dev/)
*   **Styling** : [Tailwind CSS](https://tailwindcss.com/) & [Shadcn UI](https://ui.shadcn.com/) (Design moderne et épuré, liste plate, éditeur Monaco sombre)

## 📂 Structure du projet
*   `app_build/` : Contient le code source de l'application web React et la base de données locale.
*   `demo_server/` : Micro-serveur de test (ElysiaJS) pour simuler des APIs E-Commerce factices.
*   `.agents/` : Contient les règles, compétences (skills) et workflows de l'équipe de développement IA.

## 🛠️ Démarrage Rapide

1. **Aller dans le dossier source :**
   ```bash
   cd app_build
   ```
2. **Installer les dépendances :**
   ```bash
   bun install
   ```
3. **Lancer le serveur de développement :**
   ```bash
   bun dev
   ```

## 📖 Documentation
Pour plus de détails, consultez les fichiers suivants :
- [CONTEXT.md](./docs/CONTEXT.md) : Contexte global, objectifs métier et architecture.
- [CHANGELOG.md](./CHANGELOG.md) : Suivi des modifications et nouveautés.
- [ISSUES.md](./docs/ISSUES.md) : Problèmes connus et tâches en attente.
- [VERIFICATION_REPORT.md](./docs/VERIFICATION_REPORT.md) : Rapports de vérification technique.

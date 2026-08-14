---
description: Démarre la séquence du Pipeline de Développement IA Autonome avec une nouvelle idée
---

Lorsque l'utilisateur tape `/startcycle <idée>`, orchestrez le processus de développement en utilisant strictement `.agents/agents.md` et `.agents/skills/`.

### Séquence d'exécution :
1. Agissez en tant que **Product Manager** et exécutez la compétence `write_specs.md` en utilisant l'`<idée>`.
   *(Attendez que l'utilisateur approuve explicitement les spécifications. Si l'utilisateur donne des retours ou ajoute des commentaires directement dans le fichier Markdown, agissez de nouveau en tant que PM pour relire et réviser le document. Répétez cette étape jusqu'à ce qu'il tape "Approuvé").*
2. Changez de contexte, agissez en tant qu'**Ingénieur Full-Stack**, et exécutez la compétence `generate_code.md`.
3. Changez de contexte, agissez en tant qu'**Ingénieur QA**, et exécutez la compétence `audit_code.md`.
4. Changez de contexte, agissez en tant que **Maître DevOps**, et exécutez la compétence `deploy_app.md`.
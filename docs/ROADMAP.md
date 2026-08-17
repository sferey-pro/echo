# Roadmap — Évolutions et Fonctionnalités

Ce fichier recense les évolutions produit, les fonctionnalités et les capacités techniques qui pourraient être ajoutées à Echo. Il est le pendant prospectif d'[ISSUES.md](./ISSUES.md), qui traite des bugs, vulnérabilités et améliorations du code existant.

> Établi le 17/08/2026 à partir de l'audit du dépôt par trois agents experts (UX/UI, React/TypeScript, DevOps).
> Chaque entrée porte une estimation indicative de **valeur** (impact utilisateur) et d'**effort**.

---

## 🎯 Thème 1 — Boucle de rétroaction : voir ce que fait Echo

C'est le manque structurel le plus important. Aujourd'hui, rien dans l'interface ne confirme qu'un mock a effectivement servi une réponse : l'utilisateur configure à l'aveugle et découvre le résultat dans la console de son application frontend. Le serveur voit pourtant passer chaque requête, mockée comme relayée — l'information existe, elle n'est simplement jamais remontée.

**Journal de trafic en temps réel** · valeur : très forte · effort : moyen
Un flux d'événements poussé du serveur vers le dashboard (WebSocket), affiché dans un panneau ou un onglet de la colonne 3 : horodatage, méthode, chemin, variante appliquée ou pass-through, statut renvoyé, latence réelle, taille de la réponse. Cela transforme Echo d'un configurateur aveugle en outil de débogage — et aurait rendu immédiatement visible le bug d'activation de mock décrit dans ISSUES.md.

**Rejeu et inspection d'une requête interceptée** · valeur : forte · effort : moyen
Depuis le journal, ouvrir le détail complet d'un échange (en-têtes entrants, corps, réponse servie), et rejouer la requête pour vérifier une modification de mock sans repasser par l'application cliente.

**Compteurs par requête** · valeur : moyenne · effort : faible
Afficher dans la liste combien de fois chaque endpoint a été appelé depuis le démarrage, et la date du dernier appel. Permet d'identifier immédiatement les mocks jamais sollicités — donc les chemins mal configurés.

---

## 🎯 Thème 2 — Puissance du moteur de mocks

Les mocks sont aujourd'hui des chaînes statiques, une variante par requête, sélectionnée globalement.

**Mode enregistrement (record & replay)** · valeur : très forte · effort : élevé
Tout transite déjà par le proxy : capturer les réponses réelles et proposer de les convertir en variantes de mock supprime l'étape la plus fastidieuse, écrire le payload à la main. Couvre en particulier les endpoints absents de la collection Bruno.

**Réponses dynamiques** · valeur : forte · effort : moyen
Un moteur de templating restreint : interpolation des path params et des variables d'environnement, données pseudo-aléatoires déterministes (graine fixe pour la reproductibilité), pagination calculée. Couvre les scénarios de listes et de détails sans multiplier les variantes. Évaluation dans un contexte confiné, jamais par `eval`.

**Règles de correspondance conditionnelles** · valeur : forte · effort : élevé
Permettre le conditionnement d'une variante par query string, en-tête ou corps de requête, avec application de la première règle qui matche. Sur un même endpoint, un utilisateur qui réussit et un qui échoue, sans passer par les scénarios. Suppose de remplacer le tri approximatif par nombre de segments dynamiques par une priorité explicite et affichée.

**Injection de fautes réseau** · valeur : forte · effort : moyen
La latence fixe existe déjà ; la valeur est ailleurs : jitter, coupure de connexion en cours de réponse, réponse tronquée, corps malformé, timeout franc. Ce sont exactement les cas que les frontends gèrent mal et qu'aucun mock statique ne permet de reproduire.

**Validation JSON en direct dans l'éditeur** · valeur : moyenne · effort : faible
Monaco fournit nativement les diagnostics JSON. Les exposer par un badge « JSON invalide » et bloquer la sauvegarde d'un payload mal formé évite d'enregistrer un mock cassé qui ne se manifestera qu'au premier appel.

**Différentiel visuel entre payload Bruno et surcharge locale** · valeur : moyenne · effort : faible
Monaco propose un mode diff. Un basculement « Original / Modifié / Comparer » donnerait un sens concret au halo « Payload Modifié », aujourd'hui purement décoratif.

---

## 🎯 Thème 3 — Scénarios : d'un écrasement destructeur à un état composable

Dans l'implémentation actuelle, appliquer un scénario désactive toutes les variantes de la base et écrase le contenu des variantes ciblées, sans retour possible (voir BUG-04 dans ISSUES.md). La refonte fonctionnelle et la correction du bug se rejoignent.

**Scénarios non destructifs, empilables et réversibles** · valeur : très forte · effort : élevé
Un scénario devient une surcouche activable/désactivable au-dessus de la configuration courante, avec retour à l'état précédent. Ouvre la voie aux combinaisons (« panne du service paiement » + « utilisateur premium ») sans perte de travail.

**Capture de l'état courant comme scénario** · valeur : forte · effort : faible
`ScenarioPanel` crée systématiquement un scénario vide, alors que le geste naturel est « enregistrer la configuration actuelle de tous les mocks actifs sous un nom ». Fonctionnalité la plus rentable du thème au regard de son coût.

**Prévisualisation du différentiel avant application** · valeur : moyenne · effort : faible
Afficher « ce scénario va modifier 12 requêtes » avec le détail, avant une action qui change l'état de travail.

**Scénarios séquentiels** · valeur : moyenne · effort : élevé
Faire varier la réponse d'un endpoint selon le rang de l'appel (premier appel 500, deuxième 200) pour tester les logiques de retry, de backoff et de reprise.

---

## 🎯 Thème 4 — Navigation et productivité dans le dashboard

Le produit annonce 600+ requêtes. L'interface actuelle affiche un en-tête « Filtres » qui n'en contient aucun, et le seul raccourci existant n'est documenté nulle part.

**Recherche et filtres réels dans la colonne 1** · valeur : très forte · effort : faible
Champ de filtre instantané sur nom et URL, plus des puces de filtre par méthode HTTP, par « mock actif » et par « favori ». C'est ce que le titre du panneau promet déjà, et le manque le plus criant à l'échelle cible. S'intègre naturellement à la liste aplatie mémorisée existante.

**Bascule rapide du mock depuis les listes** · valeur : forte · effort : faible
Un interrupteur au survol de chaque ligne (colonnes 1 et 2) pour activer ou désactiver un mock sans ouvrir le panneau d'édition. Le geste le plus fréquent de l'outil demande aujourd'hui deux clics et un changement de contexte visuel.

**Panneaux redimensionnables et repliables** · valeur : forte · effort : moyen
Poignées de redimensionnement entre les trois colonnes avec persistance des largeurs, et repli de la colonne 1 en rail d'icônes. Résout à la fois la hauteur figée du panneau scénarios et l'inutilisabilité en écran partagé — cas d'usage évident pour un outil ouvert à côté d'un navigateur.

**Feuille de raccourcis clavier accessible par `?`** · valeur : moyenne · effort : faible
La palette `Cmd+K` existe mais n'est mentionnée que dans son propre placeholder, donc uniquement après l'avoir trouvée. Un indice dans l'en-tête et une modale d'aide la rendent découvrable, et donnent un cadre pour en ajouter : navigation dans l'arbre aux flèches, bascule de mock, sauvegarde.

**Indicateur « non sauvegardé » et garde-fou de navigation** · valeur : forte · effort : faible
Point de modification sur le bouton de sauvegarde, `Cmd+S`, et confirmation (ou sauvegarde différée automatique) au changement de requête. Complémentaire : un bouton « Annuler mes modifications » distinct de « Recharger l'original », dont l'intitulé actuel n'indique pas clairement s'il écrase le travail sauvegardé.

**Assistant de premier lancement** · valeur : forte · effort : moyen
Quand aucune collection n'est active, remplacer les trois panneaux vides par un parcours en trois étapes : cloner un dépôt Bruno, choisir la collection active, renseigner l'URL de l'API cible. Ces trois réglages sont aujourd'hui dispersés entre deux modales atteignables par des boutons icône non libellés.

**Thème sombre complet** · valeur : forte · effort : moyen
Les tokens sémantiques sont déjà en place et l'éditeur est déjà sombre : il manque le bloc de thème et le nettoyage des couleurs codées en dur. La cible — des développeurs frontend — travaille massivement en sombre.

---

## 🎯 Thème 5 — Partage et travail en équipe

L'état vit aujourd'hui dans un fichier SQLite local et gitignoré. Rien ne se partage, rien ne se restaure.

**Configuration versionnable** · valeur : très forte · effort : moyen
Export et import de la configuration des mocks et des scénarios dans un fichier texte, posé à côté de la collection Bruno. Une équipe peut alors partager « l'environnement de démo » ou « le jeu de pannes » par la revue de code, et l'outil dispose enfin d'un chemin de récupération après corruption de la base.

**Configuration déclarative committée** · valeur : forte · effort : moyen
Un fichier de configuration versionné définissant les scénarios et l'état initial des mocks, lu au démarrage. Rend les mocks reproductibles en intégration continue et supprime la dépendance à un état local opaque.

**Mode serveur partagé** · valeur : moyenne · effort : très élevé
Une instance Echo par équipe, avec authentification, espaces de travail isolés et état par session, pour que plusieurs développeurs ne se marchent pas dessus sur les mêmes mocks. Impose de repenser la base mono-fichier, le port fixe et l'absence totale d'authentification.

---

## 🎯 Thème 6 — Intégration continue et distribution

**Mode CLI headless** · valeur : très forte · effort : moyen
Un point d'entrée capable de démarrer le proxy avec un scénario donné, sans dashboard. Le même jeu de mocks sert alors au développement local et aux tests end-to-end des applications clientes — c'est le levier d'adoption le plus fort hors de l'équipe initiale.

**Distribution en binaire autonome** · valeur : forte · effort : moyen
Un exécutable unique par plateforme publié en artefact de release, sans clone ni installation de dépendances. Prérequis : traiter les chemins relatifs au répertoire courant et embarquer les assets.

**Image conteneur** · valeur : moyenne · effort : faible
Pour l'usage d'Echo comme service de mock dans les pipelines d'autres équipes, avec volumes pour la collection et la base, et healthcheck.

**Publication sur registre privé** · valeur : moyenne · effort : faible
Un lancement direct sans clonage préalable, en complément du binaire. Suppose de promouvoir l'application en véritable package (nom, version, point d'entrée exécutable, liste de fichiers).

**Automatisation des releases** · valeur : moyenne · effort : faible
Tags SemVer, changelog généré depuis les Conventional Commits déjà en usage, artefacts attachés — en remplacement de la section `[Unreleased]` perpétuelle actuelle.

---

## 🎯 Thème 7 — Élargir les sources de vérité

**Support natif d'OpenAPI** · valeur : forte · effort : élevé
Le patron Strategy des parsers est déjà en place et n'attend qu'une troisième implémentation. Générer les mocks depuis un contrat OpenAPI — y compris la validation des réponses mockées contre le schéma, qui détecterait les payloads devenus incompatibles après une évolution du contrat — élargit nettement le public de l'outil au-delà des utilisateurs de Bruno.

**Sonde de dérive de collection** · valeur : moyenne · effort : très faible
Alerter dans le dashboard quand la collection locale est en retard de N commits. L'information est déjà calculée côté serveur, elle n'est simplement pas exploitée.

**Import de collections Postman / Insomnia** · valeur : moyenne · effort : moyen
Même mécanisme d'extension que pour OpenAPI, pour les équipes qui n'ont pas migré vers Bruno.

---

## 🎯 Thème 8 — Exploitation et confiance

**Télémétrie locale optionnelle** · valeur : moyenne · effort : moyen
Compteurs d'interceptions, taux de pass-through, latence amont, erreurs de synchronisation, exposés dans un format standard de métriques. Utile au diagnostic individuel comme à la mesure d'adoption de l'outil.

**Journal d'audit des actions destructives** · valeur : moyenne · effort : faible
Réinitialisation, suppression et clonage de dépôt tracés dans un journal persisté **hors** de la base effacée par la réinitialisation.

**Tests d'intégration Echo + demo_server en CI** · valeur : forte · effort : moyen
Le serveur de démonstration existe déjà et n'est exercé par aucun test automatisé. Démarrer les deux et vérifier une interception mockée, un pass-through, un changement de statut et de latence donnerait un filet de sécurité de bout en bout.

**Jeu de collections de référence et test de charge** · valeur : moyenne · effort : moyen
Un corpus de collections Bruno pour les tests de non-régression des parsers, incluant un scénario à 600+ requêtes pour surveiller le temps de démarrage, l'empreinte mémoire et la taille du bundle.

---

## 📌 Séquencement suggéré

L'ordre ci-dessous privilégie ce qui débloque le reste, à effort contenu.

1. **Prérequis** — traiter les vulnérabilités critiques et le bug d'activation de mock listés dans ISSUES.md. Aucune évolution ne mérite d'être construite sur ces fondations.
2. **Gains immédiats à faible coût** — recherche et filtres, bascule rapide du mock, capture de l'état courant en scénario, indicateur « non sauvegardé », validation JSON, sonde de dérive.
3. **Boucle de rétroaction** — journal de trafic en temps réel, puis inspection et rejeu. C'est ce qui change la nature de l'outil.
4. **Partage** — export/import de configuration, puis configuration déclarative committée.
5. **Adoption externe** — mode CLI headless, puis distribution en binaire et tests d'intégration en CI.
6. **Puissance du moteur** — réponses dynamiques, règles conditionnelles, injection de fautes, scénarios composables.
7. **Élargissement** — OpenAPI, autres formats de collection, mode serveur partagé.

---

## ♿ Thème 9 — Accessibilité (A11Y) et améliorations de l'interface (Non Urgent)

Les points d'accessibilité identifiés lors de l'audit sont notés ici pour traitement ultérieur. Ils ne constituent pas des bugs bloquants, mais amélioreront l'utilisabilité globale :

**Primitives sémantiques et attributs ARIA** · valeur : moyenne · effort : faible
Utilisation exhaustive de composants avec labels associés (`htmlFor`), textareas accessibles, et ajout de libellés `aria-label` sur l'ensemble des boutons à icones (notamment l'iconographie Phosphor).

**Navigation au clavier et Rôles ARIA avancés** · valeur : forte · effort : moyen
Rendre navigables les arbres de dossiers et de listes de requêtes au clavier (rôles `tree` / `treeitem` ou `listbox` / `option`), utiliser le _roving_ `tabIndex` pour une gestion fine des flèches directionnelles et de la touche Entrée.

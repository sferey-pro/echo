# Suivi des Problèmes (Issues)

Ce fichier liste les bugs connus, les vulnérabilités, les limitations actuelles et les axes d'amélioration du code identifiés lors de l'audit du projet.

> **Audit du 17/08/2026** — analyse intégrale du dépôt par trois agents experts (UX/UI & accessibilité, React/TypeScript & sécurité applicative, DevOps & exploitation).
> Les évolutions fonctionnelles et les nouvelles fonctionnalités sont suivies séparément dans [ROADMAP.md](./ROADMAP.md).

## 📊 Résumé de l'audit

| Vérification | Statut | Détail |
| --- | --- | --- |
| Typage (`tsc --noEmit`) | ✅ | 0 erreur |
| Tests unitaires (`bun test`) | ✅ | 3 pass / 0 fail, 11 assertions, 2 fichiers |
| Lint (`eslint .`) | ❌ | 13 problèmes — 4 erreurs, 9 avertissements |
| Sécurité | ❌ | 5 vulnérabilités critiques (dont 2 destructives, vérifiées en exécution) |
| Accessibilité | ❌ | 0 attribut ARIA dans toute l'application, navigation clavier impossible |
| CI/CD | ❌ | Aucun pipeline, aucun script `lint`/`test`/`typecheck` dans `package.json` |

**Bilan : 12 problèmes critiques, 23 majeurs, 25 mineurs.**

Note : la version précédente de ce fichier indiquait « aucun bug critique identifié ». Cette affirmation est invalidée par l'audit.

---

## 🔴 Problèmes Critiques

### Sécurité

**[SEC-01] Suppression récursive d'un répertoire arbitraire via le clonage de dépôt**
`app_build/src/routes/repositories.ts:30-45` — appelé depuis `app_build/src/components/dashboard/CollectionManagerModal.tsx:78-90`

Le nom du dépôt est déduit du dernier segment de l'URL fournie par le client, sans validation, puis concaténé par `resolve` et passé à `rm -rf`. Vérifié en exécution : une URL se terminant par `/..` fait résoudre la cible sur la racine du projet. L'UI propose elle-même de « supprimer et cloner à nouveau » quand la cible existe déjà — un clic suffit à effacer le code source, la base SQLite et les collections, de façon irréversible. Le contrôle anti-traversée existe sur la route de suppression (`repositories.ts:70`) mais pas sur celle de clonage.

**[SEC-02] Lecture de fichiers arbitraires du disque via le réglage `ACTIVE_COLLECTION_NAME`**
`app_build/src/routes/settings.ts:11-24`, `app_build/src/services/git.ts:10-21`

La route settings accepte n'importe quelle clé dès lors que la valeur est une chaîne, et `getRepoPath` résout le chemin sans confinement. Vérifié en exécution : positionner la clé sur un chemin absolu ou relatif hors périmètre fait parser et renvoyer le contenu de ce répertoire par `/api/collections`. Aggravant : le parseur remonte **la valeur de toutes les variables d'environnement** trouvées (`parser.ts:180-252`), et un `fs.watch` récursif est attaché à la cible (`git.ts:84`).

**[SEC-03] API d'administration sans authentification, CORS `*`, écoute sur toutes les interfaces**
`app_build/src/index.ts:25-45`, en-têtes répétés dans chaque route

`serve({ port: 3000 })` sans `hostname` : le serveur répond sur l'IP LAN (vérifié). Le préflight autorise toutes les méthodes et tous les en-têtes, et chaque réponse porte `Access-Control-Allow-Origin: *`, y compris pour une origine tierce. Conséquence : toute page web ouverte par le développeur, et toute machine du réseau, peut lire les collections, modifier les réglages, cloner ou supprimer des dépôts — et donc exploiter SEC-01 et SEC-02 à distance.

**[SEC-04] Proxy ouvert (SSRF) relayant les en-têtes d'authentification**
`app_build/src/lib/proxy.ts:131-162`

Tout chemin non intercepté est relayé vers `TARGET_API_URL`, avec recopie de tous les en-têtes sauf une courte liste — `Authorization` et `Cookie` sont transmis. `TARGET_API_URL` étant modifiable sans authentification depuis n'importe quelle origine (voir SEC-03), Echo devient un relais vers les services internes du réseau, et les jetons de l'utilisateur partent vers l'hôte choisi par l'attaquant.

**[SEC-05] Déni de service persistant par injection de regex**
`app_build/src/lib/proxy.ts:56-61`

Les clés de `pathParamsOverrides` fournies par le client sont interpolées dans `new RegExp` sans échappement. Vérifié : une clé contenant une parenthèse ouvrante est acceptée (`success: true`), puis **toutes** les requêtes `/api/collections` retournent 500. La valeur étant persistée en SQLite, la panne survit au redémarrage ; le dashboard reste vide définitivement, le store avalant l'erreur en `console.error` (`useStore.ts:72-75`). Aucun chemin de récupération depuis l'UI — seule une édition manuelle de la base débloque.

### Correctness

**[BUG-01] La variante « Default » n'est jamais persistée : activer un mock est sans effet**
`app_build/src/lib/proxy.ts:37-49`, `app_build/src/lib/db.ts:153-157`, `app_build/src/routes/mocks.ts:44-69`

Pour une requête sans variante en base, `initProxy` en fabrique une **uniquement en mémoire**. Côté écriture, `updateMockVariant` fait un SELECT et sort silencieusement si la ligne n'existe pas, pendant que la route PUT répond `success: true`. Le front recharge alors la collection, qui reconstruit les variantes depuis la base — et l'état revient à `isMocked: false`. **La fonction centrale du produit est inopérante pour toute requête dont l'utilisateur n'a pas créé explicitement une variante nommée.** Le bug est masqué en démonstration, les variantes créées via POST persistant correctement. Le mensonge de typage `as DBMockVariant` sur un résultat potentiellement nul (`db.ts:155`) est ce qui rend l'erreur invisible au compilateur.

**[BUG-02] Multiplication non bornée des boucles de synchronisation Git**
`app_build/src/services/git.ts:67-68`, `app_build/src/routes/sync.ts:9-11`, `app_build/src/components/layout/DashboardLayout.tsx:49-64`

`runSync` se replanifie en fin d'exécution sans annuler le timer précédent, et la route `/api/sync/status?fetch=true` l'appelle — route sollicitée par le front **toutes les 30 secondes**. Une heure de dashboard ouvert produit 120 chaînes de timers indépendantes, chacune lançant deux processus `git` toutes les 5 minutes. La charge croît linéairement avec la durée d'ouverture de l'onglet. Un `GIT_SYNC_INTERVAL` à `0` ou non numérique (champ libre non validé, `CollectionSettingsModal.tsx:94-100`) transforme cela en boucle quasi immédiate multipliée.

**[BUG-03] Perte silencieuse du payload en cours d'édition**
`app_build/src/components/dashboard/RequestDetails.tsx:71-79`, `:134-188`, `DashboardLayout.tsx:298`

Deux mécanismes concourants. D'une part, l'effet de synchronisation dépend de `activeVariant`, dont l'identité change à chaque `loadCollection()` : modifier la latence ou le statut n'envoie qu'un seul champ au serveur, puis recharge tout, ce qui réécrit le payload local avec l'ancienne valeur serveur. D'autre part, `RequestDetails` est monté avec `key={selectedRequest?.id}` : changer de requête démonte le composant et détruit l'état non sauvegardé. Aucun indicateur « non sauvegardé », aucune confirmation, aucune sauvegarde automatique. Le halo « Payload Modifié » est trompeur — il signale un écart avec Bruno, pas un travail non enregistré.

### Accessibilité

**[A11Y-01] Aucune sémantique ARIA dans toute l'application**
`app_build/src/components/**`

Recherche exhaustive : **0 occurrence** de `role=` et de `aria-*` (hors variantes utilitaires Tailwind). Les cinq modales maison (`SettingsModal.tsx:77`, `CollectionSettingsModal.tsx:80`, `CollectionManagerModal.tsx:135`, `EnvironmentViewerModal.tsx:30`, `CommandPalette.tsx:34`) sont de simples `div` en `fixed inset-0`. Un lecteur d'écran ne les annonce pas comme dialogues et continue de parcourir le dashboard derrière. Non conforme WCAG 4.1.2 et 1.3.1.

**[A11Y-02] Aucun focus trap ni restauration de focus sur les modales**
Mêmes fichiers

Aucune de ces modales n'utilise Radix `Dialog`, alors que `radix-ui` est déjà en dépendance et que `ui/alert-dialog.tsx` l'exploite correctement. La tabulation sort de la modale et parcourt les trois colonnes restées focalisables sous l'overlay ; à la fermeture, le focus retombe sur le `body`. WCAG 2.4.3 et 2.1.2.

**[A11Y-03] Toute la navigation principale est composée de `div` non focalisables**
`RequestList.tsx:110-122`, `:130-158`, `:166-195`, `:203-220` ; `DashboardLayout.tsx:267-279`

Chaque ligne de l'arbre virtualisé et de la liste centrale est un `div` avec `onClick`, sans `tabIndex`, sans rôle, sans `onKeyDown`. L'arborescence Bruno et la liste de requêtes — le cœur fonctionnel de l'outil — sont inaccessibles au clavier. La seule issue est la palette `Cmd+K`, dont l'existence n'est signalée nulle part dans l'UI.

### DevOps

**[OPS-01] Dépendance runtime `yaml` fantôme**
`app_build/package.json`, `app_build/src/lib/parser.ts:3`, `app_build/src/lib/parsers/YamlParser.ts:1`

Le parseur d'environnements importe `yaml`, absent des dépendances déclarées. Le paquet n'est résolu que parce que la **devDependency** `@types/yaml@1.9.7` (stub déprécié) déclare elle-même `"yaml": "*"` — plage totalement flottante. Tout `bun install --production`, toute image ou artefact excluant les devDependencies produit un binaire qui plante au premier parsing de collection.

**[OPS-02] Aucun pipeline CI/CD, aucun garde-fou sur `main`**
Racine du dépôt, `app_build/package.json`

Aucun script `lint`, `typecheck` ni `test` n'existe dans `package.json`, alors que des tests et une config ESLint sont présents. La seule automatisation, `.agents/skills/code-review/scripts/run_linters.sh`, **avale tous les échecs** (chaque étape suivie d'un `|| echo`, donc code de sortie toujours 0). Le workflow `.agents/workflows/startcycle.md` impose un `git add .` + commit automatique en fin de cycle, sans gate bloquante. Résultat concret : les 4 erreurs ESLint documentées sont sur `main` depuis plusieurs cycles. 91 commits, une seule branche, aucune PR, aucun tag.

---

## 🟠 Problèmes Majeurs

### Comportement produit

**[BUG-04] Appliquer un scénario détruit les variantes existantes** — `db.ts:258-296`
`applyScenarioActions` commence par désactiver **toutes** les variantes de la table, puis pour chaque action ne cible que la première variante trouvée (`LIMIT 1` sans `ORDER BY`) et écrase définitivement son payload, son statut, sa latence et ses overrides. Un scénario portant sur 2 requêtes réinitialise la configuration des 598 autres. Aucune sauvegarde, aucune annulation.

**[BUG-05] Changer d'environnement ne met pas à jour les mocks** — `useStore.ts:54-57`, `settings.ts:17-19`
`setActiveEnvironment` écrit le réglage sans `await` ni `catch` (promesse flottante) et ne recharge pas la collection ; côté serveur, `ACTIVE_ENVIRONMENT` ne déclenche aucun `initProxy`. Les chemins MSW sont pourtant calculés par substitution des variables de l'environnement actif (`proxy.ts:64-71`). L'UI affiche le nouvel environnement, les interceptions restent sur l'ancien.

**[BUG-06] Le choix d'un exemple MSW ne synchronise pas le code de statut** — `RequestDetails.tsx:175-188`
`handleExampleClick` envoie le payload et le nom de l'exemple, jamais le `statusCode`, alors que `BrunoExample.response.status` existe dans le modèle (`parser.ts:17-18`). La capture `mock_editor_get_user` le montre : exemple « 422 Unprocessable Entity », corps d'erreur de validation, statut affiché « 🟢 200 OK ». Le mock sert un corps d'erreur avec un statut 200 — exactement le piège qu'un outil de mocking doit empêcher.

**[BUG-07] Course dans l'initialisation MSW : handlers silencieusement perdus** — `proxy.ts:117-128`
`isInitialized` passe à `true` **avant** l'`await import('msw/node')`. Un appel concurrent (watcher + requête `/api/collections`, cas fréquent) voit le drapeau levé mais `mswServer` encore nul, saute la branche `resetHandlers` et abandonne ses handlers sans erreur. Symptôme non déterministe : des mocks activés qui ne prennent pas effet.

**[BUG-08] La confirmation de réinitialisation n'est jamais visible** — `SettingsModal.tsx:66-67`
Le toast de succès est immédiatement suivi d'un `window.location.reload()` qui le détruit avant rendu, puis le splash occupe 1,7 s. Après l'action la plus destructive de l'outil, l'utilisateur fait face à un dashboard vide, indiscernable d'un plantage.

**[BUG-09] Échec de chargement de la collection totalement silencieux** — `useStore.ts:59-76`
Le `catch` fait un `console.error` et repasse `isLoading` à `false`. Aucun état d'erreur, aucun toast. Serveur arrêté, collection absente ou parsing en échec produisent le même écran : trois panneaux blancs. C'est le pire écran possible au premier lancement.

**[BUG-10] Le slider de latence ne persiste jamais au clavier** — `RequestDetails.tsx:446-456`
La persistance est déclenchée par `onMouseUp` et `onTouchEnd` uniquement. Un réglage effectué aux flèches s'affiche mais n'est jamais envoyé. S'ajoute l'absence de label associé : le lecteur d'écran annonce un slider anonyme.

**[BUG-11] Race condition dans les modales de réglages** — `SettingsModal.tsx:26-34`, `CollectionSettingsModal.tsx:25-33`
`loading` est initialisé à `isOpen` (donc `false`, le composant étant monté en permanence) et n'est jamais repassé à `true` pendant le chargement. Trois conséquences : le champ s'affiche vide sans skeleton, une saisie commencée est écrasée par la résolution de `getSettings`, et le bouton « Enregistrer » actif peut persister une chaîne vide.

### Performance

**[PERF-01] Re-parsing intégral du disque à chaque micro-interaction** — `useStore.ts:59-76`, `collections.ts:9-11`
`/api/collections` relit et reparse toute la collection depuis le disque puis reconstruit tous les handlers MSW. Le front l'invoque après **chaque** action unitaire : bascule de mock, statut, latence, `onBlur` de path param, clic sur un exemple, favori (`RequestDetails.tsx:113,125,139,151,167,182,198`). Sur la cible annoncée de 600 requêtes, déplacer un curseur de latence provoque plusieurs centaines de lectures de fichiers et la reconstruction complète du serveur de mocks. **Principal problème de performance de l'application.**

**[PERF-02] Colonne centrale non virtualisée avec calcul coûteux par ligne** — `DashboardLayout.tsx:266-280`, `:139-148`
`.map()` brut sur `requestsInSelectedFolder`, qui vaut la totalité des requêtes quand aucun dossier n'est sélectionné — l'état par défaut au démarrage. Chaque ligne appelle `isPayloadModified`, qui fait un `JSON.stringify` indenté de l'exemple à chaque rendu. Soit 600 nœuds DOM et 600 sérialisations JSON par render, alors que `RequestList` dispose déjà d'un virtualiseur.

**[PERF-03] `fs.watch` sans debounce ni filtre : tempête de re-parsings** — `git.ts:84-97`
Chaque événement déclenche un `parseFile`, puis un `syncGitToDatabase` **complet**, puis un `initProxy` complet. Aucun debounce, aucune coalescence, aucune sérialisation. Un `git pull` touchant 300 fichiers produit 300 re-parsings intégraux concurrents. Ce comportement contredit `CONTEXT.md`, qui annonce un parsing incrémental par `git diff` et un hot-swap sélectif : ni l'un ni l'autre n'existe dans le code.

**[PERF-04] Splash screen artificiel de 1,7 s à chaque chargement** — `SplashScreen.tsx:15-37`, `DashboardLayout.tsx:156`
Durée fixe de 1500 ms plus 200 ms, barre de progression purement décorative, libellés fictifs défilant sur un timer. La condition d'affichage est un **OU** (`isLoading || !splashAnimationDone`) : même avec une collection chargée en 80 ms, l'utilisateur attend 1,7 s. Sur un outil de dev rechargé des dizaines de fois par jour, c'est une taxe permanente.

**[PERF-05] Monaco chargé depuis un CDN externe** — `RequestDetails.tsx:3`
Vérifié dans le bundle de production : `cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/vs`. Pour un outil local censé fonctionner hors ligne, l'éditeur reste vide sans Internet, une CSP ou un proxy d'entreprise le bloque, et chaque poste émet du trafic vers un tiers. `Editor` est de plus importé statiquement, donc le loader s'initialise même sans requête sélectionnée. Bundle applicatif : 549 Ko bruts / 164 Ko gzip, hors Monaco.

**[PERF-06] Polling de synchronisation indifférent à la visibilité de l'onglet** — `DashboardLayout.tsx:62`
Interrogation toutes les 30 s indéfiniment, y compris onglet en arrière-plan, chaque appel déclenchant un `git fetch` côté serveur. Cumulé à BUG-02, l'effet est multiplicatif.

### Robustesse & exploitation

**[OPS-03] Migrations de base non versionnées, `DROP TABLE` en dur au démarrage** — `db.ts:11-69`, `:34-36`
Schéma appliqué par une suite de `CREATE TABLE IF NOT EXISTS` à l'import du module, sans table de version, sans `ALTER TABLE` (pourtant prévu dans la spécification technique). Un `DROP TABLE mock_states` s'exécute à chaque démarrage dans un `try/catch` silencieux. Toute colonne ajoutée plus tard sera absente des bases existantes, sans chemin de mise à niveau ni rollback. Ni `PRAGMA journal_mode=WAL`, ni `PRAGMA foreign_keys`.

**[OPS-04] Aucun arrêt propre ; les handlers globaux masquent les crashs** — `index.ts:3-8`, `git.ts:68,84`
`uncaughtException` et `unhandledRejection` se contentent d'un `console.error` : le processus continue dans un état potentiellement incohérent. Aucun handler `SIGTERM`/`SIGINT` : pas de `db.close()`, pas de `mswServer.close()`, pas de `watcher.close()`, pas d'annulation du timer de sync. Base arrêtée sans flush propre (WAL désactivé), watchers et timers fuités à chaque rechargement `--hot`.

**[OPS-05] Aucune observabilité** — `proxy.ts:87,136`, `index.ts:76-77`, `git.ts:58,83`
Journalisation entièrement en `console.log`/`console.error` avec préfixes ad hoc, sans niveau, horodatage, corrélation ni réglage de verbosité. Une ligne par requête proxifiée rend la sortie illisible à l'échelle cible. **Aucune route `/health`** sur Echo — le `demo_server` en a une (`demo_server/index.ts:102`). Aucune métrique d'interception, de pass-through ou de latence.

**[OPS-06] Fuite de traces d'exécution dans les réponses HTTP** — `proxy.ts:175-179`, `sync.ts:30-33`, `repositories.ts:49-51`
La réponse 500 contient `e.stack` en clair : chemins absolus du poste et structure interne. Les sorties `git` sont renvoyées brutes au client et peuvent contenir une URL de dépôt avec identifiants.

**[OPS-07] Configuration éparpillée, sans `.env.example` ni validation** — `proxy.ts:15,132`, `git.ts:16,67`, `settings.ts:14`
Trois sources se superposent sans documentation : table SQLite `settings`, variables d'environnement (`REPO_PATH`, `TARGET_API_URL`, `GIT_SYNC_INTERVAL`) et valeurs en dur (`localhost:8080`, `300000`, `PORT = 3000`). Aucun README ne les mentionne. `POST /api/settings` accepte n'importe quelle clé sans liste blanche — une faute de frappe est acceptée silencieusement et le comportement retombe sur le défaut.

**[OPS-08] Démarrage dépendant du répertoire courant** — `index.ts:28`, `git.ts:12`, `repositories.ts:9,36`, `reset.ts:15` vs `db.ts:8`
Trois conventions de résolution coexistent (`cwd`, `../cwd`, `__dirname`). L'application ne fonctionne que lancée depuis `app_build/`. Le fallback par défaut pointe sur `collection/.empty`, répertoire **inexistant** : état de premier démarrage non prévu. Bloque tout empaquetage en binaire ou conteneur.

**[OPS-09] Le build produit un artefact que rien ne consomme** — `build.ts`, `package.json`, `index.ts:10,29`
`build.ts` génère `dist/`, mais le serveur — y compris en mode `start` — importe `./index.html` et laisse Bun bundler à la volée au démarrage. Aucune référence à `dist/` dans le code. Le déploiement documenté (`.agents/skills/deploy_app.md`) est un `bun run dev`, donc un mode développement avec HMR. Le build validé dans le rapport de vérification n'a aucun effet sur ce qui tourne réellement.

**[OPS-10] Aucune validation des corps de requête** — `mocks.ts:9-10,20-22,48`, `scenarios.ts:92-95`, `settings.ts:14`
`await req.json()` puis accès direct aux propriétés, sans schéma. `updateMockVariant` transmet le corps brut au SQL. `body.actions` n'est testé que par sa véracité booléenne : un objet au lieu d'un tableau est accepté, stocké, puis fait exploser l'application du scénario en 500. Aucune limite de taille de corps.

**[OPS-11] `JSON.parse` non protégés sur les données de la base** — `db.ts:109,234,342,348,354`
Toutes les colonnes JSON sont désérialisées sans `try/catch`. Une seule ligne corrompue rend `/api/collections` définitivement en 500, sans issue depuis l'UI — même mode de panne que SEC-05.

### UI / Design system

**[UI-01] Classes Tailwind cassées : résidus d'une suppression automatique du préfixe `dark:`**
`ui/button.tsx:8,14,16,18`, `ui/input.tsx:11,13`, `ui/textarea.tsx:10`, `ui/select.tsx:34`, `RequestList.tsx:137,174,175,208`
Un remplacement global de `dark:` par chaîne vide a laissé des fragments invalides (`:ring-destructive/40`, `/30`, `/20 bg-primary/10`, `hover:bg-slate-100 :bg-slate-800`). Tailwind les ignore silencieusement. Au-delà du bruit dans le DOM, cela signifie que les états `focus-visible` des primitives Shadcn ont été altérés à l'aveugle.

**[UI-02] Contrastes insuffisants sur les indicateurs d'état les plus importants**
`RequestDetails.tsx:408` (pastille « Status global », `text-white` sur `emerald-500` ≈ 2,5:1 ou `slate-400` ≈ 2,6:1), `:393` (bouton principal ≈ 2,5:1), `:246` (étoile favori `slate-400` ≈ 2,6:1, sous le seuil 3:1 des composants d'interface), `:482` (≈ 4,3:1). Minimum WCAG AA : 4,5:1. L'information « suis-je en mock ou en proxy ? », question centrale de l'outil, est portée par les éléments les moins lisibles de l'écran.

**[UI-03] Contraste des en-têtes de panneaux sous le seuil AA**
`DashboardLayout.tsx:240,252,263,285` — `text-muted-foreground` sur `bg-muted/50` ≈ 4,2:1, en `text-xs` majuscules avec `tracking-wider`, soit la configuration la moins lisible possible. Les quatre titres qui structurent l'écran sont les textes les plus difficiles à lire.

**[UI-04] Le dark mode n'existe pas malgré une architecture de tokens qui le prépare**
`styles/globals.css:42-76` ne définit que `:root` — aucun bloc `.dark`, aucun `prefers-color-scheme`, zéro variante `dark:` dans `src/`. Pourtant les tokens sémantiques existent et `components.json:9` déclare `cssVariables: true`. Résultat visible : l'éditeur Monaco est en `vs-dark` codé en dur avec un cadre `bg-[#1e1e1e]` (`RequestDetails.tsx:488,497`), soit un rectangle noir isolé au milieu d'une interface entièrement claire — sur l'écran le plus utilisé, pour une cible qui travaille massivement en sombre.

**[UI-05] Aucun label de formulaire associé à son champ**
Recherche globale : **0 occurrence de `htmlFor`**. `SettingsModal.tsx:88-97` et `CollectionSettingsModal.tsx:91-100` utilisent un `label` sans `htmlFor` et un `Input` sans `id`. La primitive `ui/label.tsx` (Radix Label, qui gère l'association) existe mais n'est **jamais importée**. Autres champs sans nom accessible : nom de variante (`RequestDetails.tsx:315`), overrides de path params (`:282-289`), URL de dépôt (`CollectionManagerModal.tsx:148`), nom de scénario (`ScenarioPanel.tsx:103`), textarea de payload (`ScenarioEditor.tsx:263`).

**[UI-06] Aucun état vide sur la colonne 2 ni d'onboarding sur la colonne 1**
`DashboardLayout.tsx:266-280` (dossier vide → panneau blanc), `RequestList.tsx:257-270` (conteneur virtualisé de hauteur 0 → seul l'en-tête « Filtres / 0 » subsiste). Au premier lancement, rien n'oriente vers le gestionnaire de collections. Des états vides soignés existent pourtant ailleurs (`ScenarioPanel.tsx:120-124`, `EnvironmentViewerModal.tsx:40-55`, `RequestDetails.tsx:93-102`) : l'incohérence est frappante.

**[UI-07] La palette de commandes ne se ferme pas avec Échap**
`CommandPalette.tsx:17-27` n'écoute que `Cmd/Ctrl+K` et utilise `Command` nu plutôt que `Command.Dialog`. Les trois modales de réglages, à l'inverse, implémentent chacune leur propre écouteur Échap (code triplé) mais ne se ferment **pas** au clic sur l'overlay. Deux conventions de fermeture opposées coexistent, aucune n'étant complète.

**[UI-08] Un en-tête « Filtres » sans aucun filtre**
`RequestList.tsx:229` affiche un titre « FILTRES » suivi d'un compteur et de trois boutons icône. Aucun champ de recherche, aucun filtre par méthode, par état de mock ou par favori. En parallèle, `EnvironmentViewerModal.tsx:13` déclare un état `searchTerm` jamais utilisé — vestige d'une recherche abandonnée. Avec 600+ requêtes, trouver un endpoint impose de déplier l'arbre à la souris ou de connaître un raccourci non documenté.

**[UI-09] En dessous de `md`, la mise en page est inutilisable**
`DashboardLayout.tsx:163` fixe `h-screen overflow-hidden` et `:235` définit `grid-cols-1 md:grid-cols-[280px_350px_1fr]`. Sous 768 px, les trois panneaux s'empilent dans une hauteur fixe **sans défilement de page** ; le panneau de scénarios (`h-1/3`) devient une bande de quelques dizaines de pixels. Ni onglets, ni repli de colonne. Inutilisable en écran partagé — cas d'usage évident pour un outil de mocking utilisé à côté d'un navigateur.

**[UI-10] URLs `http://localhost:3000` codées en dur dans le front**
`DashboardLayout.tsx:52,69` — deux appels forcent l'hôte alors que le reste de `lib/api.ts` utilise des chemins relatifs. Sur un port différent, un accès réseau ou derrière un reverse-proxy, l'indicateur de synchronisation Git tombe silencieusement (`catch` vide) et le bouton de pull échoue, sans message.

**[OPS-12] Versions flottantes et runtime Bun non contraint**
`app_build/package.json`, `demo_server/package.json` — toutes les dépendances en `^`, `@types/bun` en `latest` (plage non bornée ignorant les majors). Aucun champ `engines`, `packageManager`, `.bun-version` ni `.tool-versions`, alors que le projet dépend d'APIs Bun très sensibles à la version (`bun:sqlite`, `Bun.serve` avec `routes`, plugin Tailwind natif, bundling HTML à l'exécution). Aucun `--frozen-lockfile` dans les procédures d'installation. Point positif : les deux lockfiles sont bien committés.

---

## 🟡 Problèmes Mineurs

**[BUG-12] La variante « Default » disparaît dès qu'une seconde variante est créée** — `proxy.ts:37-49`. Le fallback n'est injecté que si la liste est vide. L'utilisateur perd sans prévenir la configuration par défaut, et `RequestDetails` bascule d'autorité sur `variants[0]`.

**[BUG-13] Badge « Modifié » potentiellement faux dès le premier affichage** — `proxy.ts:42` vs `DashboardLayout.tsx:141-147` et `RequestDetails.tsx:52-58`. Le serveur sérialise en compact, le front compare avec une version indentée : tout exemple dont le corps n'est pas déjà une chaîne est signalé « Surchargé Localement » alors qu'il est intact.

**[BUG-14] Collision d'identifiants de scénarios** — `scenarios.ts:42`. `scenario-${Date.now()}` en clé primaire : deux créations dans la même milliseconde produisent une violation de contrainte remontée en 500 générique. `randomUUID` est déjà importé ailleurs.

**[BUG-15] Watcher non recréé quand le chemin est inchangé** — `git.ts:71-99`. La garde `if (repo !== currentWatchPath)` empêche la reconstruction après un reset qui supprime puis recrée le même répertoire : le `fs.watch` pointe sur un inode détruit et n'émet plus rien.

**[BUG-16] Collision d'environnements homonymes** — `parser.ts:234-252` vs `db.ts:330`. Tout le dépôt est parcouru et chaque répertoire `environments` agrégé, mais la table est indexée sur le seul `name` : deux fichiers `local.yml` dans deux sous-arbres s'écrasent, le dernier gagnant selon l'ordre de parcours du système de fichiers.

**[BUG-17] Segment d'URL non encodé côté client** — `CollectionManagerModal.tsx:117`. Pas d'`encodeURIComponent` : un nom de collection contenant un espace, un `#` ou un `%` rend la suppression impossible. La garde anti-traversée serveur teste le chemin non décodé — correct par accident, fragile par conception.

**[BUG-18] Statut 204 proposé alors qu'un corps JSON est toujours émis** — `RequestDetails.tsx:427`, `proxy.ts:97`. Non conforme HTTP ; traité différemment selon les clients consommant le mock.

**[BUG-19] Chemins d'assets `/../chunk-*.js` dans le HTML de production** — constaté au runtime en `NODE_ENV=production`. Les navigateurs normalisent, mais la requête littérale renvoie 500. Fragile face à un reverse-proxy, un service worker ou un hébergement sur sous-chemin.

**[UI-11] Trois systèmes d'icônes cohabitent pour les mêmes concepts** — favori en émoji `⭐`/`☆` (`RequestDetails.tsx:249`) mais en icône Phosphor `Star` (`RequestList.tsx:120,186`) ; suppression en `×` textuel (`ScenarioPanel.tsx:155`, `ScenarioEditor.tsx:197`) mais en `Trash` Phosphor (`RequestDetails.tsx:344`) ; fermeture en `✕` sans `aria-label` dans les quatre modales — annoncé « multiplication » par un lecteur d'écran. S'y ajoutent `▶`, `↺`, `👻` et les émojis 🟢🟠🔴 des sélecteurs de statut, dont le rendu suit la police système.

**[UI-12] Cinq graisses typographiques pour un même niveau hiérarchique** — `font-semibold text-xs uppercase`, `font-black text-xs uppercase`, `font-black text-sm uppercase`, `font-semibold text-sm` cohabitent pour des titres de section ; `text-3xl font-extrabold`, `text-4xl font-extrabold`, `text-xl font-black`, `text-xl font-semibold` pour des titres principaux. `font-black` apparaît 10 fois sans règle discernable.

**[UI-13] Le token `--radius` est défini mais systématiquement contourné** — `globals.css:36-39` expose une échelle dérivée, mais les composants utilisent `rounded-xl`, `rounded-3xl`, `rounded-full`, `rounded-md`, `rounded-lg`, `rounded` sans logique de niveau. Rethémer les arrondis d'un seul geste est impossible.

**[UI-14] Valeurs de couleur codées en dur qui court-circuitent les tokens** — 15 occurrences dans le seul `RequestDetails.tsx` (`bg-slate-50`, `bg-white`, `bg-[#1e1e1e]`, `text-black`, `bg-slate-200/300/400`), `DashboardLayout.tsx:163` peint le fond en `bg-slate-50` au lieu de `bg-background`, boutons d'en-tête en `bg-green-50`/`bg-blue-50`/`bg-yellow-50`, `App.tsx:12` force `bg-white` sur les toasts. Ces zones ne réagiront à aucun changement de thème — ce qui verrouille de fait UI-04.

**[UI-15] Quatre primitives Shadcn sont du code mort** — `ui/card.tsx`, `ui/label.tsx`, `ui/textarea.tsx`, `ui/dropdown-menu.tsx` ne sont importés nulle part. Les cartes sont refaites à la main (`DashboardLayout.tsx:239`, `CollectionManagerModal.tsx:170`, `ScenarioEditor.tsx:180`) et `ScenarioEditor.tsx:263` utilise un `textarea` natif stylé à la main.

**[UI-16] Cinq indicateurs redondants pour deux booléens** — l'état « mocké » est affiché simultanément par un badge en colonne 2, une icône `Lightning`, une pastille dans le sélecteur de variante, le libellé du bouton bascule et la pastille « Status global ». Le premier se base sur `req.variants.some(...)` (toutes variantes), les autres sur la variante active seule : les indicateurs peuvent se contredire.

**[UI-17] Variable CSS invalide dans un `textShadow`** — `RequestList.tsx:121` : `var(--color-)`, nom tronqué, déclaration ignorée. Résidu d'un glow néo-brutaliste.

**[UI-18] Bloc « Aucun exemple disponible » non stylé** — `RequestDetails.tsx:482` : espace initial parasite dans la chaîne de classes, aucun padding, aucun rayon, aucune bordure. Bande grise pleine largeur collée au bord, contrastant avec le sélecteur soigné qu'elle remplace.

**[UI-19] Aucune région `aria-live` pour les états asynchrones** — « Sauvegarde… », « Clonage… », « Activation… », « Chargement… » et le statut de synchronisation ne sont annoncés d'aucune façon. La barre de progression du splash n'a ni `role="progressbar"` ni `aria-valuenow`. Sonner est le seul canal de retour accessible.

**[UI-20] Dépendance réseau externe pour la police** — `src/index.css:1` importe Inter depuis `fonts.googleapis.com`. Hors ligne ou derrière un proxy d'entreprise, bascule sur `sans-serif` avec décalage de métriques. FOUT systématique sur un outil censé être local.

**[UI-21] `SelectItem` avec une valeur vide** — `DashboardLayout.tsx:176`. Radix réserve la chaîne vide à l'effacement et la déconseille sur `Item` ; le `placeholder="Aucun"` devient inatteignable puisqu'un item porte déjà ce libellé.

**[UI-22] Commentaires et libellés en décalage** — `DashboardLayout.tsx:165` porte encore `{/* Header Néo-brutaliste */}` alors que le style a été abandonné. `SettingsModal.tsx:55` et `CollectionSettingsModal.tsx:54` émettent des toasts en anglais dans une interface intégralement francophone — au moment précis où l'utilisateur a besoin de comprendre une erreur.

**[CODE-01] Typage relâché et assertions non sûres** — `git.ts:24` (`any`), `proxy.ts:12` (`any`), `:31` (deux `Function`, erreurs ESLint), `db.ts:155` (`as DBMockVariant` sur un résultat nullable, contredit deux lignes plus bas — c'est ce qui masque BUG-01), `mocks.ts:46,74` (`.pop()!`), `frontend.tsx:12` (`getElementById!`).

**[CODE-02] Code mort et paramètres inutilisés** — `parser.ts:59-61,106-108` (`clearParserCache` et `removeFileFromCache` vides mais toujours appelés depuis `git.ts:79,91`), `:110` (`forceFull` ignoré), `EnvironmentViewerModal.tsx:13` (état de recherche sans champ), `scenarios.ts:75,87` (regex identique évaluée deux fois), plus les variables inutilisées signalées par ESLint dans `api.ts`, `mocks.ts` et `CollectionSettingsModal.tsx`.

**[OPS-13] Documentation d'exploitation incomplète, README de template non personnalisés** — `app_build/README.md` et `demo_server/README.md` portent encore le titre `bun-react-tailwind-shadcn-template` et le contenu `bun init` par défaut ; le package s'appelle `bun-react-template`. Le README racine ne mentionne ni le lancement du `demo_server` (qui n'a d'ailleurs aucun script `start`/`dev`), ni les prérequis (Bun, `git` et `rm` dans le `PATH` — l'outil n'est pas fonctionnel sous Windows hors WSL), ni le port, ni les variables d'environnement, ni comment alimenter `collection/`.

**[OPS-14] Versioning inexistant** — `CHANGELOG.md` revendique Keep a Changelog + SemVer mais ne contient qu'une section `[Unreleased]` après 91 commits ; aucun tag, version figée à `0.1.0`. Le fichier est de plus en retard sur le code : il annonce `echo.db` alors que `db.ts:8` crée `.echo-state.sqlite`.

**[OPS-15] Documentation contredite par le code** — `CONTEXT.md` décrit un parsing incrémental par `git diff` et un hot-swap sélectif des intercepteurs ; le code fait un re-parse complet (`parser.ts:261-264`) et un `resetHandlers` global (`proxy.ts:126`). `production_artifacts/Technical_Specification.md:15` référence la table `mock_states`, supprimée par `db.ts:35`. `CONTEXT.md` et cette spécification se contredisent sur le nom du fichier de base.

**[OPS-16] Aucune LICENCE** — dépôt poussé sur GitHub sans fichier `LICENSE`. Statut juridique par défaut : tous droits réservés. Bloque toute réutilisation par une autre équipe.

**[OPS-17] Conventions de commit et modèle de branches non formalisés** — Conventional Commits respectés à 89/91, mais la convention n'est écrite nulle part (ni `CONTRIBUTING.md`, ni règle `.agents/`) ; messages mêlant français et anglais ; branche unique, commits directs, aucune PR ; deux identités Git pour la même personne.

**[OPS-18] Base SQLite sans stratégie de sauvegarde** — la base contient tout l'état utilisateur **plus une copie des environnements Bruno** (`db.ts:63-69`), qui contiennent typiquement des jetons et des URLs internes. Aucun export/import, aucune sauvegarde, et `POST /api/reset` efface tout sans instantané préalable. Le `.gitignore` est correct sur ce point, mais le `git add .` automatique du workflow ne laisse aucune marge d'erreur si un futur fichier de secret apparaît hors des motifs couverts.

**[OPS-19] Captures d'écran binaires versionnées** — `production_artifacts/screenshots/` : 9 PNG, 1,2 Mo, soit la majeure partie du `.git`. Gonflement irréversible de l'historique, et surtout risque de divulgation : une capture de la modale « Variables d'environnement » peut contenir des URLs internes ou des valeurs de jetons issues d'une collection réelle. À vérifier visuellement avant toute ouverture du dépôt.

**[OPS-20] `uncaughtException` avalé sans arrêt du processus** — `index.ts:3-8`. Le serveur poursuit son exécution avec une transaction SQLite potentiellement interrompue ou des handlers MSW partiels, au lieu de s'arrêter et de redémarrer proprement.

---

## 🔧 Améliorations de code

### Architecture

- **Introduire une couche unique d'accès aux chemins.** Toute la surface d'attaque « fichiers » vient de trois `resolve` sans confinement (`git.ts:13`, `repositories.ts:36`, `repositories.ts:73`). Une fonction qui normalise puis vérifie l'appartenance stricte à la racine `collection/`, utilisée sans exception, ferme SEC-01 et SEC-02. Dans le même mouvement, remplacer les `Bun.spawn(["rm","-rf",…])` par le `rm` de `node:fs/promises` : plus de dépendance à un binaire externe, confinement testable, et compatibilité Windows.
- **Sortir la validation des entrées du code ad hoc.** Chaque route réimplémente ses vérifications. Une couche de schémas partagée front/back — types dérivés du schéma plutôt que dupliqués — supprime d'un coup OPS-10, remplace les assertions `as` par du parsing sûr et permet de générer un client typé à la place des dix-huit fonctions `fetch` manuscrites de `lib/api.ts`.
- **Séparer physiquement le front et le back.** Les deux cohabitent dans `src/` et le front importe des types depuis `lib/db.ts`, module qui ouvre la base et exécute son DDL à l'import. Inoffensif tant que ce sont des `import type`, mais un seul import de valeur ajouté par mégarde fait entrer `bun:sqlite` dans le bundle navigateur. Trois répertoires (`server/`, `client/`, `shared/`) rendent la frontière explicite et vérifiable par une règle de lint.
- **Découper `RequestDetails.tsx` (539 lignes) et `DashboardLayout.tsx` (336 lignes).** Le premier mélange sélection de variante, réglages statut/latence, paramètres d'URL, éditeur de payload et deux boîtes de dialogue : il se scinde naturellement en quatre composants et un hook de persistance. Le second embarque trois fonctions de parcours d'arbre recalculées à chaque rendu, qui relèvent de `lib/` avec mémoïsation.
- **Extraire un composant `Modal` unique bâti sur Radix Dialog.** Les cinq modales dupliquent l'overlay, la gestion d'Échap, le bouton de fermeture et l'en-tête, chacune avec ses propres variantes de largeur et de padding. Une primitive commune règle d'un coup A11Y-01, A11Y-02, UI-07 et supprime les trois `useEffect` clavier identiques.

### Données & serveur

- **Remplacer le rechargement global par des mises à jour ciblées.** Le couple « `loadCollection()` après chaque action / `/api/collections` qui reparse tout le disque » est la racine de PERF-01 et de BUG-03. Séparer deux opérations aujourd'hui confondues : la resynchronisation disque (rare, explicite, sur pull ou événement watcher debouncé) et la lecture d'état (fréquente, servie depuis SQLite). Côté client, mutations optimistes par identifiant de variante plutôt que refetch global.
- **Rendre `updateMockVariant` créatrice (upsert) et persister la variante par défaut à l'ingestion**, ce qui ferme BUG-01 à la racine plutôt que dans l'UI.
- **Introduire une table de version de schéma et des migrations ordonnées et idempotentes** dans `db.ts` ; retirer le `DROP TABLE mock_states` désormais sans objet ; activer `PRAGMA journal_mode = WAL`.
- **Protéger toutes les désérialisations JSON** issues de la base et échapper systématiquement les valeurs interpolées dans une `RegExp`.
- **Debouncer et coaléscer les événements du watcher**, sérialiser les re-parsings, et implémenter réellement le parsing incrémental par `git diff` annoncé dans `CONTEXT.md` — ou corriger la documentation.
- **Rendre le serveur sûr par défaut** : bind explicite sur `127.0.0.1`, `Access-Control-Allow-Origin` restreint à l'origine du dashboard sur les routes `/api/*` d'administration, messages d'erreur génériques au client et stacks réservées aux logs serveur.
- **Corriger la course d'initialisation MSW** en ne levant le drapeau qu'après résolution de l'import, et en sérialisant les initialisations concurrentes.
- **Annuler le timer de synchronisation avant toute replanification**, et découpler le déclenchement manuel du cycle de fond.

### React & performance

- **Adopter des sélecteurs Zustand granulaires.** Aucun composant n'en utilise : `DashboardLayout.tsx:23-37`, `RequestList.tsx:26`, `RequestDetails.tsx:27` et `ScenarioPanel.tsx:23` déstructurent le store entier et se re-rendent à chaque `set()`. Dériver `selectedRequest` dans le store plutôt que par un `find` dans le rendu.
- **Unifier la sauvegarde de `RequestDetails`.** Les six handlers envoient des sous-ensembles de champs différents, ce qui crée BUG-03 et BUG-06. Un état de formulaire unique, un envoi debouncé de l'objet complet, et la suppression des deux effets de synchronisation (déjà signalés en erreur par ESLint) au profit d'un remontage par `key` sur l'identifiant de variante.
- **Virtualiser la colonne centrale** en réutilisant le virtualiseur de `RequestList`, et mémoriser `isPayloadModified` par requête. Factoriser au passage `getPayloadString` (`RequestDetails.tsx:52-56`) et son doublon `getPayloadStr` (`DashboardLayout.tsx:141-145`), en alignant les deux sérialisations pour éliminer BUG-13.
- **Charger Monaco localement et en différé** : pointer le loader sur les fichiers du `node_modules` plutôt que sur jsDelivr, et importer l'éditeur en `lazy` derrière un `Suspense` — il n'est utile qu'une fois une requête sélectionnée.
- **Rendre le splash honnête ou le supprimer** : soit il reflète les étapes réelles, soit il ne s'affiche qu'au-delà d'un seuil de latence, et disparaît dès l'arrivée des données au lieu d'imposer le maximum des deux durées.
- **Ajouter un état `error` au store** pour que le dashboard affiche un panneau actionnable au lieu de trois panneaux blancs (BUG-09).
- **Conditionner le polling de synchronisation à la visibilité de l'onglet.**

### Design system & accessibilité

- **Rétablir un thème sombre complet plutôt que de laisser les fragments.** Le travail est à moitié fait : tokens sémantiques présents, éditeur déjà sombre, mais classes `dark:` supprimées par remplacement textuel. Ajouter le bloc `.dark`, nettoyer les fragments orphelins de UI-01, et remplacer les couleurs en dur de `RequestDetails.tsx` par les tokens correspondants.
- **Aligner les seuils de contraste sur les teintes 600/700** : pastilles d'état en `emerald-700`/`slate-600`, étoile inactive en `slate-500` minimum. Relever `--muted-foreground` d'environ 46 % à 40 % de luminosité corrige tous les en-têtes de panneaux simultanément.
- **Réutiliser les primitives déjà installées** (`Label` avec `htmlFor`, `Textarea`, `Card`), qui couvrent exactement les cas réimplémentés à la main et règlent au passage UI-05 et UI-15.
- **Normaliser l'iconographie sur Phosphor**, avec un `aria-label` sur chaque bouton icône, et remplacer les émojis de statut par une pastille dérivée d'un token.
- **Établir une échelle typographique à trois niveaux** (en-tête de panneau, titre de section, corps) et supprimer `font-black`, qui n'apporte rien face à `font-bold` sur Inter à ces tailles tout en dégradant la lisibilité en majuscules.
- **Rendre l'arbre et les listes navigables au clavier** : rôles `tree`/`treeitem` ou `listbox`/`option`, `tabIndex` roving, gestion des flèches et d'Entrée.
- **Héberger Inter localement** et uniformiser en français la langue des messages d'erreur.

### Tests & qualité

- **Combler le vide de tests.** Deux tests seulement : un smoke test de montage et deux cas de parsers. Par ordre de valeur décroissante : la persistance des variantes en base sur une base `:memory:` (un test de trois lignes aurait attrapé BUG-01), le confinement des chemins de `getRepoPath` et de la route de clonage, la construction des chemins MSW dans `initProxy` (overrides, variables d'environnement, tri des handlers), `applyScenarioActions`, la validation des routes HTTP, puis les parcours utilisateur de `RequestDetails` avec des requêtes par rôle comme l'exigent les règles internes du projet.
- **Ajouter les scripts `lint`, `typecheck` et `test`** dans `app_build/package.json` — ils n'existent pas, ce qui rend toute automatisation impossible à écrire de façon stable. Ajouter aussi un script de démarrage à `demo_server/package.json`, qui n'en a aucun, et corriger le nom du package.
- **Activer `noUnusedLocals` et `noUnusedParameters`** dans `tsconfig.json` (déjà `strict` et `noUncheckedIndexedAccess`, `tsc` passe sans erreur) pour éliminer le code mort de CODE-02.
- **Durcir ESLint** : règles typées (`no-floating-promises` aurait signalé BUG-05, `no-misused-promises`, `await-thenable`), `jsx-a11y`, et une règle interdisant les imports depuis `lib/db` dans `components/`. Traiter les 4 erreurs et 9 avertissements actuels plutôt que de les tolérer, et réexaminer les quatre `eslint-disable` posés (`ScenarioPanel.tsx:42`, `CollectionManagerModal.tsx:46`, `git.ts:23`, `proxy.ts:11`), qui masquent des problèmes réels.
- **Corriger `.agents/skills/code-review/scripts/run_linters.sh`** pour propager les codes de sortie au lieu de les absorber : en l'état il ne peut servir de gate.

### DevOps & hygiène du dépôt

- **Déclarer `yaml` en dépendance explicite et épinglée**, supprimer le stub `@types/yaml` déprécié, borner `@types/bun`, et imposer `bun install --frozen-lockfile` partout où l'installation est scriptée. Ajouter une détection de dépendances fantômes et inutilisées — le cas `yaml` est exactement ce que cet outillage attrape.
- **Mettre en place un pipeline GitHub Actions** (le remote est déjà sur GitHub) sur `push` et `pull_request` : installation à lockfile figé, `tsc --noEmit`, ESLint en `--max-warnings 0`, `bun test`, `bun run build`, `bun audit`. Le contenu du rapport de vérification décrit déjà précisément ces étapes — il ne manque que leur exécution automatique. Protéger `main` et faire créer une branche par cycle au workflow d'agents plutôt que de committer directement.
- **Contraindre la version de Bun** (`engines` ou `.bun-version`) et prévoir une matrice CI sur la version cible et la dernière disponible.
- **Centraliser la configuration dans un module unique validé au démarrage** (port, hôte de bind, `TARGET_API_URL`, `REPO_PATH`, chemin des collections, intervalle de sync), avec échec explicite sur valeur invalide et un `.env.example` documenté. Rendre le port configurable — deux collections en parallèle sont aujourd'hui impossibles.
- **Résoudre tous les chemins depuis `import.meta.dir`** plutôt que depuis `process.cwd()` : prérequis à tout empaquetage.
- **Ajouter un endpoint `/health`** (état du watcher, dernier résultat de sync, chemin du dépôt actif, accessibilité de la base) — le `demo_server` en a déjà un, Echo non. Adopter un logger structuré à niveaux et passer le log par requête proxifiée en `debug`.
- **Implémenter l'arrêt propre** sur `SIGINT`/`SIGTERM` (serveur, watcher, MSW, timer de sync, base) et faire échouer le processus sur `uncaughtException` après journalisation.
- **Fournir un export/import JSON de l'état** et un instantané automatique de la base avant tout `reset` ou toute migration : c'est le seul chemin de récupération après SEC-05 ou OPS-11.
- **Compléter l'hygiène du dépôt** : `LICENSE`, `CONTRIBUTING.md` formalisant Conventional Commits et le modèle de branches, README racine et README d'application réécrits (prérequis, ports, variables, lancement du `demo_server`), hooks de pré-commit, Dependabot ou Renovate, et sortie des captures d'écran de l'historique après vérification qu'aucune ne révèle d'URL ou de jeton interne.
- **Réconcilier la documentation avec le code** : `CONTEXT.md`, `CHANGELOG.md` et `production_artifacts/Technical_Specification.md` décrivent des mécanismes et des tables qui n'existent pas ou plus.

---

## 📋 Backlog technique

- [x] Connecter un système de backend complet ou une base de données (base locale SQLite intégrée).
- [ ] Corriger les 5 vulnérabilités critiques (SEC-01 à SEC-05) — **priorité absolue, avant tout partage de l'outil**.
- [ ] Corriger BUG-01 (activation de mock inopérante), qui invalide la fonction principale du produit.
- [ ] Configurer un pipeline CI/CD (OPS-02) et les scripts `lint`/`typecheck`/`test` associés.
- [ ] Traiter les 4 erreurs et 9 avertissements ESLint actuels.
- [ ] Rendre l'application utilisable au clavier et au lecteur d'écran (A11Y-01 à A11Y-03).
- [ ] Améliorer la couverture de tests, en commençant par la couche de persistance et le confinement des chemins.

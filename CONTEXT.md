# Contexte du Projet : Echo

## 🎯 Concept Général et Objectifs
* Le projet **Echo** est un outil de Mocking d'API conçu pour répondre aux besoins des développeurs frontend.
* Son nom s'inscrit dans la nomenclature basée sur la mythologie grecque, rejoignant ainsi deux autres outils internes de l'entreprise : Aegis (un agrégateur de vulnérabilités) et Eos (un orchestrateur de projets).
* Le but de l'outil est de simuler une véritable API en imitant des réponses préconfigurées, ce qui permet au frontend de décider dynamiquement de la donnée renvoyée.
* La source de vérité pour la configuration et les exemples de ces appels API est l'outil **Bruno**, stocké sur un dépôt Git.

## 🏗️ Architecture et Choix Techniques
* L'application est propulsée par le runtime **Bun** et fonctionne comme un serveur HTTP autonome agissant en proxy.
* Le mock des requêtes repose sur la technologie **Mock Service Worker (MSW)** configurée côté serveur (`msw/node`) pour injecter dynamiquement des *handlers*.
* Un mode "Pass-through" est implémenté pour permettre aux développeurs de désactiver le mock sur certaines routes et de laisser passer la requête jusqu'à la véritable API.

## 🔄 Ingestion et Synchronisation des Données
Afin de gérer les plus de 600 requêtes et les nombreux exemples sans impacter les performances de l'outil, Echo intègre un moteur de synchronisation avancé :
* L'outil se synchronise avec les fichiers Bruno (`.bru`) via trois méthodes : un "File System Watcher" (`fs.watch`) pour détecter les changements en temps réel sur le disque, un "Polling Autonome" (tâche de fond effectuant un `git pull` silencieux), et un bouton de synchronisation manuelle.
* La mise à jour se fait de façon incrémentale : l'outil analyse le `git diff` afin d'identifier et de parser uniquement les fichiers altérés.
* Un système de *Hot-Swap* (remplacement à chaud) met à jour les intercepteurs MSW en mémoire de manière sélective sans interrompre les mocks en cours d'utilisation.

## 🖥️ Interface de Contrôle (Dashboard)
* **Design Néo-brutaliste** : L'application adopte une esthétique audacieuse (bordures épaisses, couleurs pastel vives, ombres pleines décalées) supportant entièrement le mode clair et sombre (Dark Mode) pour un confort d'utilisation maximal.
* L'interface adopte une vue structurée en "Split-Screen" (3 colonnes simultanées : Navigation, Liste des requêtes, Édition) avec un rendu virtualisé (*virtual scrolling*) pour afficher la liste massive des requêtes de manière fluide.
* Un panneau latéral (colonne de gauche) reproduit fidèlement l'arborescence des dossiers du projet Bruno et donne accès aux scénarios.
* Les développeurs frontend peuvent sélectionner, pour chaque route, l'exemple MSW à activer via des menus déroulants.
* L'interface intègre un éditeur JSON (Monaco Editor) permettant de surcharger (*override*) le payload de réponse à la volée. Un halo visuel jaune (glow) indique clairement lorsqu'un mock a été modifié. Un bouton "Recharger l'original" permet de purger la modification.
* Un système de Favoris (Starred) permet d'épingler des requêtes spécifiques pour les retrouver rapidement dans une vue dédiée.
* Des boutons de scénarios (Bulk Actions) sont prévus pour appliquer instantanément un ensemble de mocks métiers, comme simuler une panne généralisée (Erreurs 500) sur plusieurs endpoints en un seul clic.

---
**Note sur le développement automatisé** : L'implémentation de ces fonctionnalités est prise en charge par les agents IA configurés dans le dossier `.agents/` (Product Manager, Engineer, QA, DevOps).

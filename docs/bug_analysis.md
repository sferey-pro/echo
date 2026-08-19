# Analyse du Bug de l'Éditeur JSON (Dashboard)

Puisque le composant `JsonEditor` fonctionne parfaitement de manière isolée dans la page `/debug`, le problème vient d'une **collision dans le cycle de vie de React (re-rendu / écrasement d'état)** au niveau du tableau de bord.

Voici les 3 hypothèses principales (et très probables) expliquant pourquoi la frappe est instantanément annulée et le curseur perdu :

### Hypothèse 1 : Le piège du `useEffect` et de l'écrasement perpétuel (La plus probable)
Dans le fichier `RequestDetails/index.tsx`, vous avez un `useEffect` chargé de synchroniser l'état local du payload avec la base de données lorsqu'on clique sur un Mock :
```tsx
  const getPayloadString = (data: unknown) => { ... } // Déclarée DANS le composant (nouvelle référence à chaque rendu)

  useEffect(() => {
    if (activeVariant) {
      setPayload(activeVariant.payload ?? ...);
    }
  }, [request, activeVariant, getPayloadString]); // getPayloadString déclenche la boucle !
```
**Mécanisme exact du bug :**
1. Vous tapez une touche dans l'éditeur.
2. L'état local `payload` est mis à jour (`setPayload`).
3. Le composant `RequestDetails` se re-rend pour afficher le texte.
4. Lors du rendu, React crée une **nouvelle fonction** `getPayloadString` en mémoire.
5. Le `useEffect` remarque que `getPayloadString` a "changé", et s'exécute à nouveau.
6. Il écrase immédiatement votre frappe en remettant l'ancien `activeVariant.payload` sauvegardé.
7. L'éditeur reçoit le vieux texte programmatiquement, ce qui remet le curseur à zéro ou en bas de page.

### Hypothèse 2 : Un `activeVariant` ou un tableau `variants` instable
De manière similaire, si la fonction `useStore()` de Zustand recrée l'objet `request` à chaque micro-changement, ou si la sélection `const variants = request?.variants || []` crée un nouveau tableau vide en continu, le même `useEffect` va se déclencher en boucle à chaque frappe de clavier, provoquant l'écrasement.

### Hypothèse 3 : L'effet de bord de `setSelectedExample("custom")`
Lorsqu'on tape dans le payload, le composant exécute automatiquement :
```tsx
  const handlePayloadChange = (value: string | undefined) => {
    setPayload(value || "");
    setSelectedExample("custom");
  };
```
Si le changement de `selectedExample` vers `"custom"` est écouté par un autre composant parent, ou déclenche une logique conditionnelle qui démonte l'éditeur l'espace d'une milliseconde avant de le remonter, Monaco Editor va perdre le focus. Le composant étant rechargé, il re-pompera l'ancien payload non sauvegardé.

---
**Conclusion :** 
Le bug n'a rien à voir avec Monaco. C'est une **boucle de synchronisation React**. Votre état de saisie local est écrasé instantanément par un `useEffect` instable. Sortir la fonction `getPayloadString` en dehors du composant (ou utiliser un `useCallback`) et vérifier le tableau des dépendances du `useEffect` règlera le problème.

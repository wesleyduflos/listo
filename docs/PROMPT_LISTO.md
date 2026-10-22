# Listo — Spécification et prompt d'implémentation (Claude Code)

> PWA personnelle de gestion des tâches du quotidien, du court au long terme : préparations (départ en week-end, valise), routines, tâches datées, et tâches « un jour ».
> Ce document est la référence unique. Lis-le en entier avant toute action. Toute ambiguïté se pose en question, pas en supposition.

## Fichiers fournis

```
PROMPT_LISTO.md                 ← ce document
maquettes/
  png/                          ← captures ×2 (780 × 1688), à regarder en premier
    01-aujourdhui.png
    02-horizons.png
    03-preparation-detail.png
    04-capture-rapide.png
    05-bilan-du-soir.png
  html/                         ← mêmes écrans en HTML statique (390 × 844)
  fonts/                        ← Geist et Geist Mono (variables, woff2)
```

- **Les PNG sont la référence visuelle.** Ouvre-les en Phase 0 et cite-les dans ton rapport (écarts possibles avec le texte, éléments non couverts par la spec).
- **Les HTML** servent à relever les valeurs exactes (couleurs, tailles, rayons, espacements). Ce sont des maquettes figées : **ne pas copier leur markup ni leurs styles en ligne** dans l'app ; reconstruire avec les composants et les tokens §8.
- **Les données affichées sont fictives.** En cas de contradiction entre une maquette et ce document, **ce document fait foi** ; signale l'écart.
- Les polices du dossier `fonts/` sont à reprendre dans l'app (auto-hébergement, §8.2).
- Écrans sans maquette (à concevoir dans le même langage visuel et à soumettre avant implémentation complète) : liste des préparations, éditeurs de modèle et de liste, Routines, édition de tâche, Paramètres, connexion.

---

## 0. Règles de travail

1. **Phase 0 en lecture seule.** Aucun fichier créé, modifié ou supprimé, aucune commande qui écrit sur disque ou installe quoi que ce soit. Tu produis un rapport et tu t'arrêtes.
2. **Une phase à la fois.** À la fin de chaque phase : récapitulatif des livrables, résultat des critères d'acceptation, écarts éventuels par rapport à cette spec, puis **arrêt et attente de validation**.
3. **Pas d'initiative hors périmètre.** Pas de fonctionnalité, librairie ou refactor non demandés. Si quelque chose te semble manquer, tu le signales dans le récapitulatif.
4. **Commits atomiques** par sous-livrable, messages en français, au format `type(portée): description`.
5. **Langue** : interface et contenus en français. Code, noms de variables et commentaires en anglais.
6. **Tests** : toute logique métier pure (parseur, horizons, récurrence, préparations, séries) est couverte par des tests unitaires avant d'être branchée à l'UI.

---

## 1. Contexte produit

- **Utilisateur unique** (moi). Pas de partage, pas de multi-compte.
- **Usage principal** : téléphone, PWA installée sur l'écran d'accueil. Usage secondaire sur ordinateur.
- **Hors ligne complet** : créer, cocher, modifier sans réseau ; synchronisation automatique au retour.
- **Notifications push** matin et soir.
- **Ton** : sobre et efficace, avec une gratification légère (progression visible, coche satisfaisante, bilan du soir). Pas de confettis, pas de mascotte, pas de gamification lourde.

---

## 2. Stack technique

| Couche | Choix |
|---|---|
| Front | React 18 + Vite + TypeScript (strict) |
| Routage | React Router |
| Styles | CSS Modules + variables CSS (tokens §8). Pas de framework UI. |
| PWA | `vite-plugin-pwa` (Workbox), manifest, icônes, mode `standalone` |
| Back | **Nouveau projet Firebase dédié** : Auth (Google), Firestore, Cloud Functions (v2), Cloud Messaging |
| Hors ligne | Firestore `persistentLocalCache` + `persistentMultipleTabManager` |
| Parsing des dates | `chrono-node` (locale `fr`) + règles maison (§6) |
| Dates | `date-fns` + `date-fns-tz`, fuseau de référence `Europe/Paris` |
| Tests | Vitest (logique), Testing Library (composants clés), émulateur Firestore (règles) |
| Hébergement | Netlify (build Vite, SPA redirect `/* /index.html 200`) |

Cloud Functions planifiées nécessitent le plan Blaze : coût attendu proche de zéro pour un seul utilisateur. Le signaler si un autre choix semble préférable, sans l'appliquer.

---

## 3. Concepts métier

### 3.1 Tâche
Unité de base. Possède : titre, notes optionnelles, priorité (P1/P2/P3), durée estimée optionnelle, échéance optionnelle, horizon, checklist optionnelle, récurrence optionnelle, rattachement optionnel à une préparation.

### 3.2 Horizons
Quatre horizons : **Aujourd'hui**, **Cette semaine**, **Ce mois-ci**, **Un jour**.

- **Si la tâche a une échéance**, son horizon est **calculé** à partir de l'échéance (fonction pure `effectiveHorizon(task, now)`) :
  - échéance passée → **en retard** (statut d'affichage, pas un horizon)
  - échéance aujourd'hui → Aujourd'hui
  - échéance ≤ dimanche de la semaine en cours → Cette semaine
  - échéance ≤ dernier jour du mois en cours → Ce mois-ci
  - au-delà → Ce mois-ci affiché avec sa date, ou groupe « Plus tard » (proposer le meilleur choix en phase 0)
- **Sans échéance**, l'horizon est **choisi manuellement** et stocké (`horizon`).
- La semaine commence le lundi.

### 3.3 Échéances strictes
Toutes les échéances sont strictes. Une tâche ouverte dont l'échéance est passée est **en retard** : bloc dédié en tête de l'écran Aujourd'hui, couleur retard (§8), et elle reste là jusqu'à décision explicite. Une tâche sans échéance n'est jamais en retard.

### 3.4 Priorité
Explicite, trois niveaux, défaut **P2**. Tri à l'intérieur d'un groupe : en retard d'abord, puis priorité, puis échéance, puis ordre manuel.

### 3.5 Durée estimée
Optionnelle, en minutes. Sert à afficher le temps restant de la journée, le temps restant d'une préparation et le temps réalisé dans le bilan.

### 3.6 Checklist (sous-tâches)
Une tâche peut contenir une checklist d'éléments simples (libellé, coché). La progression `n/total` s'affiche sur la tâche. Cocher tous les éléments **ne** termine **pas** automatiquement la tâche : proposer « Tout est prêt, terminer la tâche ? ».

### 3.7 Listes réutilisables
Bibliothèque de listes nommées (ex. « Valise week-end », « Valise ski »), avec éléments et quantité optionnelle. Attacher une liste à une tâche **copie** ses éléments dans la checklist de la tâche (instantané, tout décoché). Modifier la checklist ne touche pas la liste source, sauf action explicite « Enregistrer dans la liste ».

### 3.8 Préparations
Une préparation = un événement daté (départ) + des étapes positionnées à rebours.

- **Modèle de préparation** (ex. « Départ week-end ») : liste d'étapes avec `offsetDays` (0 = jour J, -1 = veille, etc.), heure indicative optionnelle, priorité, durée, liste réutilisable optionnelle.
- **Instancier** un modèle avec une date et heure de départ crée la préparation et ses tâches, avec échéances calculées (`départ + offsetDays`, à l'heure indicative, sinon fin de journée ; le jour J, au plus tard l'heure du départ).
- Les tâches d'une préparation apparaissent **aussi** dans Aujourd'hui / Horizons, avec le nom de la préparation en méta.
- Une préparation peut aussi être créée sans modèle, et sauvegardée comme modèle ensuite.
- Après le départ, la préparation passe en « terminée » ; les tâches restantes suivent la règle de retard normale.

### 3.9 Routines
Tâches récurrentes légères, **par jours de la semaine** (ex. lundi + jeudi, ou tous les jours).

- Elles ne s'accumulent pas : chaque jour concerné repart de zéro, une routine non faite n'est **pas** en retard.
- Affichées en ligne de pastilles dans Aujourd'hui, uniquement les jours concernés.
- Historique journalier conservé pour la **série** (nombre de jours consécutifs où toutes les routines du jour ont été faites ; les jours sans routine prévue ne cassent pas la série).

### 3.10 Récurrence des tâches (≠ routines)
Pour les tâches type « croquettes », « coiffeur » :
- **Fixe** : tous les N jours / semaines / mois, à partir de l'échéance précédente.
- **Souple** : entre X et Y jours **après la date de réalisation réelle** (ex. 35–42 jours). La prochaine occurrence est créée à la complétion, échéance = réalisation + Y jours, horizon affiché dès réalisation + X jours.

### 3.11 « Un jour » et relance
Une tâche « Un jour » non modifiée depuis **30 jours** (`lastTouchedAt`) déclenche une carte de suggestion sur l'écran Horizons : « *X* dort depuis N jours. On la passe en « Ce mois-ci » ? » avec **Remonter** / **Plus tard** (Plus tard = remet `lastTouchedAt` à maintenant). Une seule carte à la fois. Seuil paramétrable.

### 3.12 Statuts
`open` | `done` | `abandoned`. « Abandonner » archive sans culpabiliser : la tâche sort des vues mais reste dans l'historique. Cocher affiche un snackbar **Annuler** pendant 5 s.

---

## 4. Modèle de données Firestore

Tout est sous `users/{uid}`. Les champs de date sont des `Timestamp`. Propose des ajustements en phase 0 si nécessaire, mais justifie-les.

```
users/{uid}
  settings: {
    timezone: "Europe/Paris",
    morningNotifTime: "08:00",
    eveningNotifTime: "21:00",
    notificationsEnabled: boolean,
    somedayNudgeDays: 30,
    defaultPriority: 2
  }

users/{uid}/tasks/{taskId}
  title: string
  notes: string | null
  status: "open" | "done" | "abandoned"
  priority: 1 | 2 | 3
  estimateMin: number | null
  dueAt: Timestamp | null
  horizon: "today" | "week" | "month" | "someday" | null   // utilisé seulement si dueAt == null
  checklist: [{ id, label, qty?: number, done: boolean }]
  sourceListId: string | null
  prepId: string | null
  recurrence: null
    | { mode: "fixed", every: number, unit: "day" | "week" | "month" }
    | { mode: "flex", minDays: number, maxDays: number }
  order: number
  createdAt, updatedAt, lastTouchedAt: Timestamp
  completedAt: Timestamp | null
  abandonedAt: Timestamp | null

users/{uid}/routines/{routineId}
  title: string
  weekdays: number[]          // 1 = lundi … 7 = dimanche
  active: boolean
  order: number
  createdAt: Timestamp

users/{uid}/routineDays/{yyyy-MM-dd}
  planned: string[]           // routineIds prévues ce jour (figé à la première ouverture du jour)
  done: string[]

users/{uid}/lists/{listId}
  name: string
  items: [{ id, label, qty?: number }]
  updatedAt: Timestamp

users/{uid}/prepTemplates/{templateId}
  name: string
  steps: [{ id, title, offsetDays: number, timeHint: "HH:mm" | null,
            priority, estimateMin, listId: string | null }]

users/{uid}/preparations/{prepId}
  name: string
  templateId: string | null
  departAt: Timestamp
  status: "active" | "done"
  createdAt: Timestamp

users/{uid}/fcmTokens/{token}
  createdAt, lastSeenAt: Timestamp, userAgent: string
```

**Règles de sécurité** : lecture/écriture uniquement si `request.auth.uid == uid`, validation de types et d'énumérations sur `tasks` (status, priority, horizon). Tests de règles sur émulateur obligatoires.

**Index** : prévoir ceux nécessaires aux requêtes des vues (status + dueAt, status + horizon, prepId). Lister les index en phase 0.

---

## 5. Écrans

Les maquettes validées (variante « cartes aérées », navigation avec bouton + central) sont dans `maquettes/png/`. Correspondance : §5.2 → `01`, §5.3 → `02`, §5.4 détail → `03`, §5.6 → `04`, §5.7 → `05`. Les descriptions ci-dessous font foi.

### 5.1 Navigation
Barre inférieure : **Aujourd'hui** · **Horizons** · **[ + ]** (bouton central surélevé, carré arrondi 52 px, fond accent, ombre accent) · **Préparations** · **Routines**. Onglet actif en accent et graisse 600. Le + ouvre la capture rapide (§5.6). Paramètres accessibles par une icône en haut à droite d'Aujourd'hui.

### 5.2 Aujourd'hui (écran d'accueil)
De haut en bas :
1. **En-tête** : date du jour (« Jeudi 22 octobre », méta), titre « Aujourd'hui » (30 px, 700, -0.02em), à droite un **anneau de progression** 56 px affichant `faites/total` en mono.
2. **Bloc En retard** (si non vide) : cartes fond retard-doux, case à cocher bordée retard, méta « En retard · échéance hier ».
3. **Carte Préparation active** (si une préparation a des étapes aujourd'hui ou demain) : carte sombre (fond encre), sur-titre « Préparation · J-1 », nom, « Départ demain 18:00 », compteur `5/9` en mono accent-sur-sombre, barre de progression, et les étapes du jour avec durée et progression de checklist (`4/12 · 25 min`). Tap sur la carte → écran Préparation.
4. **Carte tâches du jour** : carte blanche regroupant les tâches (hors préparation) d'aujourd'hui, triées §3.4. Chaque ligne : case ronde 24 px, titre (16 px, 500), méta (contexte · durée en mono), puce priorité.
5. **Ligne de résumé** : « Routines · 2/4 faites » (tap → déplie les pastilles de routines du jour) et « N terminées › » (tap → déplie les tâches faites, barrées, opacité réduite).

Le total de l'anneau = tâches ouvertes ou faites aujourd'hui dont l'horizon effectif est Aujourd'hui (retard inclus) + étapes de préparation du jour. Les routines ont leur compteur séparé.

### 5.3 Horizons
- Titre « Horizons ».
- Sélecteur segmenté 4 positions : **Tout** · **Semaine** · **Mois** · **Un jour**.
- Groupes « Cette semaine → dim. 25 », « Ce mois-ci → 31 oct. », « Un jour · sans date », avec lignes de tâche (méta : échéance ou récurrence ou ancienneté, durée).
- Carte de relance §3.11 en bas, fond accent-doux.
- Glisser une tâche sans date d'un groupe à l'autre change son horizon (phase 7, optionnel ; en phase 2, un menu contextuel suffit).

### 5.4 Préparations
- **Liste** : préparations actives (nom, départ, compte à rebours, progression), puis bouton « Nouvelle préparation » (depuis un modèle ou vierge), puis accès « Modèles » et « Listes réutilisables ».
- **Détail** :
  - Retour « ‹ Préparations », titre, méta « Départ ven. 23 oct · 18:00 · modèle « Départ week-end » ».
  - Trois tuiles : **Départ dans** (`1 j 7 h`, tuile sombre), **Avancement** (`5 / 9`), **Reste** (somme des durées restantes).
  - Chronologie par jour relatif : `J-2 · mer. 21`, `J-1 · aujourd'hui` (en accent), `Jour J · ven. 23 — avant 18:00`. Les jours entièrement faits se replient en une ligne de méta avec coche.
  - La tâche avec checklist se déplie dans une carte : barre de progression, éléments en **grille 2 colonnes** avec cases carrées 18 px, éléments cochés barrés et grisés, pied « + N autres articles » / « + Ajouter un article ».
- **Éditeur de modèle** : liste d'étapes avec J-x, heure, priorité, durée, liste attachée. Réordonnable.
- **Éditeur de liste réutilisable** : éléments, quantités, réordonnables.

### 5.5 Routines
Liste des routines avec jours actifs en pastilles (L M M J V S D), interrupteur actif, création/édition. En tête : série actuelle et meilleure série.

### 5.6 Capture rapide (feuille modale)
Feuille du bas sur fond assombri (`rgba(21,23,28,.45)`), poignée, coins 22 px.
- Libellé « Nouvelle tâche », champ texte 22 px / 600, focus automatique.
- « Compris comme : » puis **étiquettes** issues du parseur (§6), chacune tappable pour corriger : titre nettoyé, date (« Sam. 25 oct »), priorité (`P2`), durée (`15 min`), horizon. Fond accent-doux, texte accent foncé.
- Lignes d'options : **Sous-tâches ou liste** · **Récurrence** · **Rattacher à une préparation**.
- Bouton pleine largeur **Ajouter** (16 px, 600, fond accent, coins 14 px). `Entrée` valide.
- Mise à jour des étiquettes en temps réel (debounce ~150 ms).

### 5.7 Bilan du soir
Accessible depuis la notification du soir et depuis Aujourd'hui après 18:00 (lien discret).
- Titre « Bilan du soir », méta date et heure.
- Carte sombre : grand compteur `6/8` (mono 48 px) « tâches bouclées », rangée de 8 cellules (faites en accent-sur-sombre), trois stats : temps estimé réalisé, routines du jour, série de routines.
- « Pas faites aujourd'hui · N » : une carte par tâche avec boutons **Demain** (primaire) · **Choisir une date** · **Abandonner**. Les tâches en retard affichent « En retard depuis hier » en couleur retard.
- « Demain · ven. 23 » : nombre de tâches, temps total, événement de préparation éventuel.

### 5.8 Paramètres
Heures des notifications, activation push (avec explication iOS : PWA installée requise), seuil de relance « Un jour », priorité par défaut, export JSON des données, déconnexion.

---

## 6. Parseur de capture (langage naturel, français)

Fonction pure `parseCapture(input: string, now: Date): ParsedCapture`, entièrement testée.

```ts
type ParsedCapture = {
  title: string;            // texte nettoyé des jetons reconnus, première lettre en majuscule
  dueAt: Date | null;
  horizon: "today" | "week" | "month" | "someday" | null;
  priority: 1 | 2 | 3 | null;
  estimateMin: number | null;
  tokens: { kind: "date" | "priority" | "duration" | "horizon"; raw: string; start: number; end: number }[];
};
```

Règles :
- **Priorité** : `p1`, `p2`, `p3`, `!!!` (=P1), `!!` (=P2), insensible à la casse.
- **Durée** : `15min`, `15 min`, `1h`, `1h30`, `1 h 30`, `90mn`.
- **Horizon explicite** : `un jour`, `un de ces jours`, `cette semaine`, `semaine pro` / `semaine prochaine` (horizon week + date = lundi suivant ? à arbitrer en phase 0), `ce mois-ci`, `mois pro`.
- **Dates** : via `chrono-node` FR (`demain`, `après-demain`, `samedi`, `lundi prochain`, `le 3`, `3 nov`, `dans 2 semaines`, `ce soir`, `à 18h`). Un jour de semaine seul désigne la prochaine occurrence (aujourd'hui exclu).
- Si une date est trouvée, l'horizon n'est pas stocké (calculé).
- Les jetons non reconnus restent dans le titre.

Jeux de tests minimum (avec `now = jeudi 22 oct 2026 10:00 Europe/Paris`) :

| Saisie | Titre | Échéance | Prio | Durée | Horizon |
|---|---|---|---|---|---|
| `coiffeur samedi p2 15min` | Coiffeur | sam. 24 oct | P2 | 15 | — |
| `vendre la console un jour` | Vendre la console | — | — | — | someday |
| `croquettes demain !!` | Croquettes | ven. 23 oct | P2 | — | — |
| `appeler mutuelle p1` | Appeler mutuelle | — | P1 | — | — |
| `réviser vélo 31 oct 45min p3` | Réviser vélo | 31 oct | P3 | 45 | — |
| `rdv dentiste lundi prochain 9h` | Rdv dentiste | lun. 26 oct 09:00 | — | — | — |
| `trier la cave ce mois-ci 1h30` | Trier la cave | — | — | 90 | month |

Ajouter des cas limites (jetons en début de phrase, doublons de priorité, majuscules, accents).

---

## 7. Notifications

- Inscription FCM depuis Paramètres (consentement explicite), jeton stocké dans `fcmTokens`. Service worker de messaging intégré au SW de la PWA (une seule portée, pas de conflit Workbox / FCM : solution à proposer en phase 0).
- **Cloud Function planifiée toutes les 15 minutes** (`Europe/Paris`) : pour l'utilisateur, si l'heure locale tombe dans la fenêtre de `morningNotifTime` ou `eveningNotifTime` et qu'aucun envoi n'a eu lieu pour ce créneau aujourd'hui (marqueur dans `settings` ou doc dédié), envoyer :
  - **Matin** : titre « Aujourd'hui · 8 tâches · 1 h 10 », corps = **liste** des tâches P1 et en retard (max 5 lignes, puis « + N autres »). Tap → Aujourd'hui.
  - **Soir** : « Bilan · 6/8 bouclées », corps = « 2 tâches à décider ». Tap → Bilan du soir. Pas d'envoi si tout est fait (envoyer alors un message court de félicitation sobre, désactivable).
- Nettoyage des jetons invalides sur erreur d'envoi.
- Contrainte iOS : la push ne fonctionne que si la PWA est installée sur l'écran d'accueil (iOS 16.4+). L'afficher dans Paramètres.

---

## 8. Design system

Direction : clair, froid, net. Contraste volontaire avec mes autres apps (thèmes sombres chauds). **Thème clair uniquement en v1**, mais tous les styles passent par des variables pour permettre un thème sombre plus tard.

### 8.1 Couleurs

```css
:root {
  --ground:          #F2F3EF;  /* fond d'app */
  --surface:         #FFFFFF;  /* cartes, feuilles */
  --surface-sunken:  #E4E6E1;  /* fond du sélecteur segmenté */
  --ink:             #15171C;  /* texte principal, cartes sombres */
  --muted:           #5B606B;  /* méta, libellés */
  --line:            #DDE0DA;  /* séparateurs, bordures */
  --line-soft:       #E6E8E3;  /* séparateurs internes aux cartes */
  --check-border:    #9AA0A9;

  --accent:          #2443D1;  /* cobalt : actions, coches, actif */
  --accent-hover:    #1A33A6;
  --accent-soft:     #E3E8FB;  /* étiquettes, carte de relance */
  --accent-on-dark:  #9DB0FF;  /* accent sur carte sombre */

  --dark-muted:      #AEB3BC;  /* méta sur carte sombre */
  --dark-track:      #2C3038;  /* piste de progression sur sombre */

  --late:            #B3401A;  /* retard : bordures, libellés */
  --late-text:       #8F3315;  /* texte de méta en retard sur fond doux */
  --late-soft:       #FBE7DE;  /* fond carte en retard */

  --scrim:           rgba(21, 23, 28, .45);
}
```

Règles : l'orange est **réservé au retard**. Les priorités ne sont **pas** codées par couleur mais par intensité :
- **P1** : fond `--ink`, texte blanc
- **P2** : fond `--line`, texte `--ink`
- **P3** : contour 1 px `#B9BDB5`, texte `#4A4F58`
Puces : Geist Mono 11 px, 500, padding 2 × 6 px, rayon 4 px.

Contraste minimum 4.5:1 pour tout texte, vérifié en phase 7.

### 8.2 Typographie
- **Geist** (400, 500, 600, 700) pour tout le texte.
- **Geist Mono** (400, 500) pour tous les chiffres : compteurs, durées, heures, comptes à rebours, puces de priorité.
- Polices auto-hébergées (fichiers dans le bundle, pas d'appel Google Fonts à l'exécution, pour le hors ligne).

| Usage | Taille / graisse |
|---|---|
| Titre d'écran | 30 px / 700 / -0.02em |
| Titre de préparation | 26 px / 700 |
| Titre de tâche | 16 px / 500 |
| Corps | 15 px / 400 |
| Méta | 12 px / 400, `--muted` |
| Sur-titre de section | 12 px / 600, majuscules, +0.06em |
| Grand compteur bilan | Geist Mono 48 px / 500 |

### 8.3 Formes et espacements
- Rayons : cartes 16 px, petites cartes 12–14 px, champs 12 px, bouton principal 14 px, FAB 16 px, pastilles 999 px, cases à cocher rondes (tâches) ou 5 px (checklist).
- Marges latérales d'écran : 16–20 px. Grille d'espacement de 4 px.
- Ombres très légères : cartes `0 1px 2px rgba(21,23,28,.05)`, FAB `0 6px 18px rgba(36,67,209,.35)`.
- Cibles tactiles ≥ 44 px.

### 8.4 Gratification (sobre)
- Coche : remplissage accent + tracé de la coche animé (~200 ms), légère mise à l'échelle 0.9 → 1, vibration courte (`navigator.vibrate(10)`) si disponible.
- La ligne cochée glisse vers « terminées » après 600 ms (laisser le temps de voir la coche).
- Anneau de progression animé à chaque changement.
- Toutes les tâches du jour faites : l'anneau devient plein et le libellé passe à « Journée bouclée ». Rien de plus.
- Respecter `prefers-reduced-motion`.

### 8.5 Icônes
Icônes SVG au trait (1.6–1.8 px), un seul jeu cohérent (ex. Lucide). Pas d'emoji.

### 8.6 Identité
- Nom : **Listo** (« liste » + « prêt »).
- Icône d'app : coche cobalt sur fond `--ground`, ou coche blanche sur carré arrondi cobalt. Proposer 2 variantes SVG en phase 1.
- `theme_color` : `#F2F3EF`, `background_color` : `#F2F3EF`.

---

## 9. Phases

### Phase 0 — Audit et plan (LECTURE SEULE)
Aucune écriture. Livrable : un rapport contenant
1. Vérification de l'environnement (versions Node, npm, Firebase CLI ; ce qui manque).
2. Arborescence de fichiers proposée (feature folders).
3. Modèle de données confirmé ou ajusté, avec justification, et liste des index Firestore.
4. Stratégie service worker PWA + FCM (une seule portée).
5. Stratégie hors ligne : ce qui marche sans réseau, gestion des écritures en attente, indicateur de synchronisation.
6. Arbitrages ouverts (au minimum : groupe « Plus tard » §3.2, « semaine pro » §6, heure par défaut d'une échéance sans heure).
7. Risques identifiés.

**Arrêt. Attendre validation.**

### Phase 1 — Socle
- Scaffold Vite + React + TS strict, ESLint, Prettier, Vitest.
- Tokens §8 en variables CSS, polices auto-hébergées, composants de base : `Button`, `Checkbox` (ronde + carrée), `PriorityChip`, `Card`, `ProgressRing`, `ProgressBar`, `SegmentedControl`, `BottomSheet`, `Snackbar`, `BottomNav` avec FAB.
- PWA : manifest, icônes, SW Workbox, installabilité.
- Firebase : config par variables d'environnement, Auth Google, Firestore avec cache persistant, règles + tests sur émulateur.
- Écran de connexion, garde de route, Paramètres minimal (déconnexion).
- Déploiement Netlify (redirect SPA).

**Critères** : PWA installable, connexion Google OK, lecture/écriture Firestore hors ligne puis synchro au retour, tests de règles verts, Lighthouse PWA sans erreur bloquante.

### Phase 2 — Tâches et vues principales
- Logique pure : `effectiveHorizon`, `isLate`, tri §3.4, regroupements (tests).
- CRUD tâche (édition plein écran : titre, notes, priorité, échéance date + heure, durée, horizon si pas de date).
- Écran **Aujourd'hui** (§5.2) sans la carte préparation ni les routines.
- Écran **Horizons** (§5.3) sans la relance.
- Cocher / décocher / snackbar Annuler / Abandonner.

**Critères** : une tâche datée change d'horizon automatiquement avec le temps, une échéance dépassée passe en retard, tri conforme, tout fonctionne hors ligne.

### Phase 3 — Capture rapide
- `parseCapture` + tous les tests §6.
- Feuille de capture §5.6 avec étiquettes éditables en temps réel.
- Récurrence fixe et souple (logique pure testée, création de l'occurrence suivante à la complétion).

**Critères** : tableau de tests §6 vert, création d'une tâche en moins de 3 secondes depuis l'ouverture de l'app.

### Phase 4 — Checklists, listes, préparations
- Checklist sur tâche, progression, proposition de terminer.
- Bibliothèque de listes réutilisables, attache par copie, « Enregistrer dans la liste ».
- Modèles de préparation, instanciation (logique pure testée : calcul des échéances à rebours), préparation vierge, « Enregistrer comme modèle ».
- Écrans Préparations (liste + détail §5.4), carte Préparation dans Aujourd'hui.
- Données d'amorce : modèle « Départ week-end » et liste « Valise week-end » créés au premier lancement (modifiables, supprimables).

**Critères** : instancier « Départ week-end » pour vendredi 18:00 crée les bonnes tâches aux bons jours, la valise se coche hors ligne, la carte Préparation apparaît à J-1 et J.

### Phase 5 — Routines
- CRUD routines par jours de semaine.
- `routineDays` : figer les routines prévues à la première ouverture du jour.
- Pastilles dans Aujourd'hui, écran Routines, calcul de série (logique pure testée, jours sans routine neutres).

**Critères** : une routine lundi/jeudi n'apparaît que ces jours-là, non faite elle ne crée aucun retard, la série est juste sur 30 jours de données de test.

### Phase 6 — Bilan et notifications
- Écran Bilan du soir (§5.7) et ses actions.
- Relance « Un jour » (§3.11).
- FCM : inscription, Cloud Function planifiée, messages matin (liste) et soir, liens profonds, nettoyage des jetons.

**Critères** : notifications reçues à l'heure paramétrée (± 15 min) sur Android et sur iOS en PWA installée, un seul envoi par créneau et par jour, tap ouvre le bon écran.

### Phase 7 — Finition
- Animations de gratification §8.4, `prefers-reduced-motion`.
- Accessibilité : rôles, libellés `aria`, navigation clavier sur ordinateur, contrastes vérifiés.
- Glisser-déposer entre horizons et réordonnancement (si validé).
- Indicateur discret de synchronisation hors ligne.
- Export JSON.
- Passe de tests complète, Lighthouse (PWA, accessibilité ≥ 95, performance mobile ≥ 90).

**Critères** : aucune régression, scores atteints, récapitulatif final des écarts et des pistes v2.

---

## 10. Hors périmètre v1
Partage / multi-utilisateur, synchronisation calendrier, contextes ou lieux, thème sombre, widgets natifs, intégration avec d'autres apps, IA.

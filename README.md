# Listo

PWA personnelle de gestion des tâches du quotidien : Aujourd'hui, Horizons, préparations à rebours, routines, capture en langage naturel et bilan du soir. Spécification complète : [`docs/PROMPT_LISTO.md`](docs/PROMPT_LISTO.md), maquettes dans [`docs/maquettes`](docs/maquettes).

Stack : React 18 + Vite + TypeScript strict, CSS Modules, Firebase plan gratuit **Spark** (Auth Google, Firestore hors ligne), `vite-plugin-pwa` (service worker Workbox), hébergement Netlify.

Pas de notifications push : elles exigeraient une Cloud Function planifiée, donc le plan Blaze. Le bilan du soir reste accessible depuis Aujourd'hui après 18:00.

## Développement

```bash
npm install
npm run dev:emu        # app branchée sur les émulateurs (dans un autre terminal : npm run emulators)
npm test               # logique métier + composants (Vitest)
npm run test:rules     # règles Firestore sur émulateur (Java 11+ requis)
npm run lint && npm run typecheck && npm run build
```

En mode émulateur, l'écran de connexion propose « Connexion de test » (aucun compte Google nécessaire).

## Mise en production

### 1. Firebase (nouveau projet dédié, plan Spark)

1. Console Firebase → créer le projet (plan Spark gratuit, ne pas activer la facturation).
2. **Authentication** → activer le fournisseur Google. Ajouter le domaine Netlify dans *Domaines autorisés*.
3. **Firestore** → créer la base (région `eur3` ou `europe-west1`).
4. **Paramètres du projet → Vos applications** → ajouter une app Web, copier la config dans `.env` (voir `.env.example`).
5. Déployer règles et index :

```bash
cp .firebaserc.example .firebaserc     # renseigner l'id du projet
npx firebase login
npx firebase deploy --only firestore
```

### 2. Netlify

1. Nouveau site depuis ce dépôt (build `npm run build`, dossier `dist` : déjà dans `netlify.toml`).
2. Variables d'environnement : toutes les `VITE_FIREBASE_*` de `.env.example`.
3. Connexion Google dans la PWA installée sur iOS : dans `netlify.toml`, remplacer `YOUR_PROJECT_ID` dans la redirection `/__/auth/*`, puis mettre `VITE_FIREBASE_AUTH_DOMAIN` = le domaine Netlify (ex. `listo.netlify.app`) et ajouter `https://listo.netlify.app/__/auth/handler` aux URI de redirection autorisées du client OAuth (Google Cloud → Identifiants).

### 3. Sur le téléphone

Ouvrir le site, « Ajouter à l'écran d'accueil », puis se connecter avec Google.

## Architecture

```
src/domain/     logique pure et testée (horizons, tri, récurrence, préparations, séries, parseur, relance)
src/data/       Firestore : convertisseurs, fournisseur temps réel, actions (écritures non bloquantes)
src/ui/         design system (tokens §8, composants de base)
src/features/   un dossier par écran / fonctionnalité
src/sw.ts       service worker : précache Workbox de l'app (hors ligne complet)
tests/rules/    tests des règles de sécurité sur émulateur
```

# Listo

PWA personnelle de gestion des tâches du quotidien : Aujourd'hui, Horizons, préparations à rebours, routines, capture en langage naturel, bilan du soir et notifications push. Spécification complète : [`docs/PROMPT_LISTO.md`](docs/PROMPT_LISTO.md), maquettes dans [`docs/maquettes`](docs/maquettes).

Stack : React 18 + Vite + TypeScript strict, CSS Modules, Firebase (Auth Google, Firestore hors ligne, Cloud Functions v2, Cloud Messaging), `vite-plugin-pwa` (service worker unique Workbox + FCM), hébergement Netlify.

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

### 1. Firebase (nouveau projet dédié)

1. Console Firebase → créer le projet, passer au plan **Blaze** (requis pour la fonction planifiée ; coût attendu ≈ 0 € pour un utilisateur).
2. **Authentication** → activer le fournisseur Google. Ajouter le domaine Netlify dans *Domaines autorisés*.
3. **Firestore** → créer la base (région `eur3` ou `europe-west1`).
4. **Paramètres du projet → Vos applications** → ajouter une app Web, copier la config dans `.env` (voir `.env.example`).
5. **Cloud Messaging → Configuration Web** → générer une paire de clés, copier la clé publique dans `VITE_FIREBASE_VAPID_KEY`.
6. Déployer règles, index et fonction :

```bash
cp .firebaserc.example .firebaserc     # renseigner l'id du projet
npx firebase login
npm --prefix functions install
npx firebase deploy --only firestore,functions
```

La fonction `notify` (région `europe-west1`) tourne toutes les 15 minutes (`Europe/Paris`), envoie au plus un message par créneau et par jour et supprime les jetons invalides.

### 2. Netlify

1. Nouveau site depuis ce dépôt (build `npm run build`, dossier `dist` : déjà dans `netlify.toml`).
2. Variables d'environnement : toutes les `VITE_FIREBASE_*` de `.env.example`.
3. Connexion Google dans la PWA installée sur iOS : dans `netlify.toml`, remplacer `YOUR_PROJECT_ID` dans la redirection `/__/auth/*`, puis mettre `VITE_FIREBASE_AUTH_DOMAIN` = le domaine Netlify (ex. `listo.netlify.app`) et ajouter `https://listo.netlify.app/__/auth/handler` aux URI de redirection autorisées du client OAuth (Google Cloud → Identifiants).

### 3. Sur le téléphone

Ouvrir le site, « Ajouter à l'écran d'accueil », se connecter, puis Paramètres → activer les notifications (sur iOS 16.4+, uniquement depuis la PWA installée).

## Architecture

```
src/domain/     logique pure et testée (horizons, tri, récurrence, préparations, séries, parseur, notifications)
src/data/       Firestore : convertisseurs, fournisseur temps réel, actions (écritures non bloquantes)
src/ui/         design system (tokens §8, composants de base)
src/features/   un dossier par écran / fonctionnalité
src/sw.ts       service worker unique : précache Workbox + Firebase Messaging
functions/      Cloud Function planifiée, réutilise src/domain (bundle esbuild)
tests/rules/    tests des règles de sécurité sur émulateur
```

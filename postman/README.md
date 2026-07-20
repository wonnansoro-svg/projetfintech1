# Tests Postman — règles de sécurité Firebase COOPAVEC

Teste `firestore.rules` directement en HTTP, sans passer par l'app React.

## 1. Mise en route

1. Importer les deux fichiers dans Postman : `COOPAVEC-Firebase.postman_collection.json` et `COOPAVEC.postman_environment.json`, puis sélectionner l'environnement **"COOPAVEC — fintech-f4dee"** en haut à droite.
2. **Récupérer la vraie clé Web API Firebase** (celle qui manque actuellement dans `.env.local`, voir plus bas) : Firebase Console → projet `fintech-f4dee` → ⚙️ Paramètres du projet → Général → section "Vos applications" → app Web → "Clé API Web". La coller dans la variable d'environnement `apiKey`.
3. Créer (ou identifier) **4 comptes de test dédiés** — un par rôle — et remplir leurs identifiants dans l'environnement : `farmerEmail`/`farmerPassword`, `adminEmail`/`adminPassword`, `investorEmail`/`investorPassword`, `agentEmail`/`agentPassword`. **N'utilisez jamais un vrai compte bénéficiaire** — le dossier 04 écrit et modifie de vraies données Firestore.
4. Exécuter le dossier **"00 - Auth"** en premier (4 requêtes) — elles récupèrent les jetons de connexion et les uid, stockés automatiquement dans l'environnement pour le reste de la collection.

## 2. Ce que couvre la suite

| Dossier | Contenu | Écrit des données ? |
|---|---|---|
| 00 - Auth | Connexion des 4 rôles | Non |
| 01 - Profiles | Lecture/liste selon rôle | Non |
| 02 - Wallets | Lecture selon rôle | Non |
| 03 - Credits / Bons | Refus de l'ancien flux (fermier ne peut plus demander lui-même) | Non |
| ⚠️ 04 - Cycle de vie d'un bon | Admin génère → fermier approuve → investisseur paie → nettoyage | **Oui — comptes de test uniquement** |
| 05 - BondInvestments | Refus de validation par un non-admin + refus de création par un non-investisseur (voir §3) | Non |
| 06 - PhoneIndex | Lecture publique par clé vs liste bloquée | Non |
| 07 - Contributions & SusuGroups | Refus pour un fermier | Non |

Exécuter dans l'ordre via **Postman Runner** (icône ▶ en haut de la collection) pour que les variables se transmettent d'une requête à l'autre.

## 3. Point d'attention — corrigé

La règle `bondInvestments.create` ne vérifiait que `investorId == request.auth.uid` — **elle ne vérifiait pas que l'auteur avait le rôle `investor`**. N'importe quel utilisateur connecté (y compris un fermier) pouvait créer un enregistrement de paiement `"pending"` à son propre nom sans avoir réellement payé ; si un admin l'approuvait par erreur, le montant aurait été crédité gratuitement.

**Corrigé** : `firestore.rules` exige maintenant `isInvestor()` (nouvelle fonction, vérifie `myRole() == "investor"`) en plus de la correspondance d'uid. Le test `05 - Créer un investissement — en tant que farmer` attend désormais un **403**. ⚠️ Comme toujours dans ce projet, il faut redéployer pour que ce soit effectif : `firebase deploy --only firestore:rules`.

## 4. ⚠️ Clé API Firebase — deux endroits distincts à renseigner

- **`.env.local`** (ce dépôt, en local) : nécessaire pour `npm run dev`, `npm run build` en local, et pour le dossier "00 - Auth" de cette collection Postman. Il contenait un **placeholder invalide** (`AIzaSyDemo123456789`, confirmé `API_KEY_INVALID` auprès de Google) — remplacé par une valeur à compléter (§1, étape 2). **Vercel ne renseigne pas ce fichier** : les variables d'environnement configurées sur Vercel n'existent que pendant le build/déploiement Vercel, elles ne touchent jamais votre machine locale.
- **Vercel** (déploiement web) : si vous y avez ajouté la vraie clé, c'est correct pour que la version déployée sur Vercel fonctionne — mais `.env.local` doit *quand même* être corrigé séparément pour que le dev local, `npm run build` local (utilisé par `nginx/`) et cette collection Postman fonctionnent chez vous.

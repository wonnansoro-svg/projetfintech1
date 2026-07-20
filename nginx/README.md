# Héberger COOPAVEC pour le test terrain (Windows)

Sert le build de production (`dist/`) sur le réseau Wi-Fi local, pour que les téléphones des testeurs y accèdent sans passer par le serveur de dev.

## Option rapide — sans installer nginx

Le projet a déjà un script `preview` (Vite) qui sert `dist/` correctement (SPA + bons en-têtes) :

```bash
npm run build
npm run preview -- --host --port 8080
```

Affiche l'URL réseau à donner aux testeurs (ex. `http://10.198.26.77:8080`). Suffisant pour un test terrain ponctuel — pas besoin de nginx si vous voulez aller vite.

## Option nginx (si vous voulez précisément nginx)

1. **Installer nginx pour Windows** : télécharger le zip "stable" sur [nginx.org/en/download.html](http://nginx.org/en/download.html), extraire (ex. `C:\nginx`).
2. **Builder l'app** :
   ```bash
   npm run build
   ```
3. **Vérifier le chemin `root`** dans `nginx/nginx.conf` — il pointe déjà vers `d:/PROJET_Dev_Front_end/projetfintech1/dist` (chemin absolu de cette machine). Adapter si le projet est déplacé.
4. **Lancer nginx avec cette config** (depuis le dossier d'installation nginx, en PowerShell) :
   ```powershell
   cd C:\nginx
   .\nginx.exe -c "d:\PROJET_Dev_Front_end\projetfintech1\nginx\nginx.conf"
   ```
5. **Autoriser le port dans le pare-feu Windows** (une fois, en administrateur) :
   ```powershell
   New-NetFirewallRule -DisplayName "COOPAVEC test terrain" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow
   ```
6. **Depuis un téléphone connecté au même Wi-Fi** : ouvrir `http://10.198.26.77:8080` (adapter l'IP — revérifier avec `ipconfig` si elle a changé, chercher "Adresse IPv4" sous l'adaptateur Wi-Fi).

Pour arrêter : `.\nginx.exe -s stop` (toujours depuis `C:\nginx`).

## Après chaque changement de code

nginx sert des fichiers statiques — il ne recompile rien. Après toute modification :
```bash
npm run build
```
puis recharger la page sur le téléphone (nginx sert immédiatement la nouvelle version, pas besoin de relancer nginx).

## ⚠️ Rappel

Le test terrain nécessite que **`.env.local` contienne la vraie clé API Firebase** avant `npm run build` (voir `postman/README.md` §4) — sinon l'app buildée ne pourra ni se connecter ni afficher de données, quel que soit le serveur qui la sert.

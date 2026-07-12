---
name: verify
description: How to build, launch, and probe the COOPAVEC React app for runtime verification.
---

# Verifying COOPAVEC (projetfintech1)

## Build & launch

```bash
npx tsc -b            # typecheck (fast, no emit issue = clean)
npx vite build         # full production build (catches bundling issues tsc misses, e.g. missing static assets referenced by string paths)
npm run dev -- --port <PORT> --strictPort   # dev server, run in background
```

Static checks possible without a browser:
```bash
curl -sS http://localhost:<PORT>/                     # index.html shell
curl -sS http://localhost:<PORT>/src/App.tsx | grep …  # Vite-transformed source — confirms no transform-time syntax error and that expected strings/components made it into what the browser would receive
curl -sS -o /dev/null -w "%{http_code} %{content_type}\n" http://localhost:<PORT>/<file>.png  # confirms a public/ static asset resolves (e.g. WavePaymentBanner's /wave-qr.png)
```

## Gotcha: no browser automation tool in this environment

There is no Playwright/Puppeteer/computer-use tool available here, and no
`.claude/skills/verifier-*` exists in this repo. This means **actual pixel-level
GUI verification (clicking through screens, visually confirming a component
renders) is not possible from this environment** — only build/transform/static-asset
checks above are reachable. If a browser tool becomes available in a future
session, use it to drive `http://localhost:<PORT>/` directly.

## Gotcha: real Firebase backend, no emulator

`src/firebase.ts` points at a live Firebase project (`fintech-f4dee`), not the
local emulator suite (no `firebase.json` emulator config wired into `firebase.ts`).
There are no test credentials available to this session. Logging in as
farmer/admin/investor/agent to reach role-gated screens (Bokanmin, Bon de
financement, Agent terrain, Admin) requires either:
- the user manually clicking through and reporting back / sharing screenshots, or
- test credentials provided by the user, still combined with a browser tool.

`firestore.rules` changes need a manual `firebase deploy --only firestore:rules`
(not run automatically) before role-gated Firestore reads/writes for a new role
(e.g. `agent`) will actually work — a build/typecheck pass does NOT confirm the
rules are live.

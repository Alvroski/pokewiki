# PokéWiki — Handoff / living spec

**Live:** https://alvroski.github.io/pokewiki/  (GitHub Pages, repo `Alvroski/pokewiki`, public)
**What it is:** offline-first mobile PWA, Pokémon **evolution** reference. Add to Home Screen → works offline.

## Status (2026-11-16) — finalized draft, deployed
- All **1025** species (national dex base forms). Data in `data/pokedex.json` (~268 KB), sprites in `sprites/` (~4.2 MB, pixel).
- Names **EN / DE / ES** + genus. Types shown.
- **Evolution** is the primary section (top, accent panel). Linear + branching (Eevee) supported. Tap any stage → its article.
- Evolution **methods trilingual**, built on the frontend from *structured* data (`method` objects: trigger/level/item/location/…); item & location names localized at build time. Label composer: `M` + `composeMethod()` in `index.html`.
- **Names moved to bottom** per user — evolution is the point of the tool.
- **Forms demo** (`FORMEN & VARIANTEN`): alternate forms for 9 iconic species only (`FORM_DEMO` in `build-data.mjs`): Mega / Gigantamax / regional. Shown as display-only cards.
- PWA: `sw.js` (cache-first, caches app+data+all sprites on install), `manifest.webmanifest`. Bump `CACHE` version on redeploy.

## Decisions locked (from user)
- Scope = all 1025 base forms. **Forms: user wanted a demo first** before committing to all forms as full entries → only `FORM_DEMO` species have forms now.
- Delivery = hosted public URL (GitHub Pages). ✅
- Methods = translated to DE/ES. ✅
- Sprites = pixel (not official artwork). ✅

## Open / next (await user "go")
1. **Full forms** — promote all alternate forms (Mega/Gmax/regional/other) to real, navigable entries across all species, not just the 9-species demo. Decide list UX (toggle to show forms? separate from base dex?).
2. **Method edge cases** — a few exotic triggers render as "Special" (e.g. tower/affection/recoil-damage cases). Audit `structMethod`/`composeMethod` if we want 100% coverage.
3. Optional: official artwork on detail page (user chose pixel for now; revisit if wanted).

## Rebuild data (new Pokémon / games)
```bash
node build-data.mjs            # default LAST=1025
LAST=1030 node build-data.mjs  # bump when new mons added
```
Then bump `CACHE` in `sw.js`, commit, push (Pages auto-deploys from `main`).

## Deploy
Push to `main` → GitHub Pages rebuilds automatically. Repo is public; content is public Pokémon data only.

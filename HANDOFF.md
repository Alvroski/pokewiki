# PokéWiki — Handoff / living spec

**Live app:** https://alvroski.github.io/pokewiki/  (GitHub Pages, repo `Alvroski/pokewiki`, public)
**Printable book:** https://alvroski.github.io/pokewiki/print.html
**What it is:** offline-first mobile PWA, Pokémon **evolution** reference. Add to Home Screen → works offline.

## Status (2026-11-16) — all requested features shipped
- **1025** species (national dex) + **326 alternate forms** (Mega/Gmax/regional/battle). Data `data/pokedex.json` (~320 KB), sprites `sprites/` (~5.3 MB pixel).
- Names **EN / DE / ES** + genus + types.
- **Evolution** is the primary section (top, accent panel). Linear + branching, tap any stage → its article.
- Evolution **methods trilingual**, composed on the frontend from *structured* data. Rich coverage (level, items, trade+held, friendship/affection/beauty, known move/type, location, party species/type, Atk/Def, gender, time, rain, 3-crits, recoil, take-damage, agile/strong-style, towers). No bare "Special" — unknown triggers fall back to a readable name.
- **Regional-evolution correctness overlay** (`REGIONAL_EVO` in `index.html`, researched from Bulbapedia): distinct species that only evolve from a regional form get a region **badge** + correct method. Covers Perrserker, Obstagoon, Sirfetch'd, Mr. Rime, Runerigus, Cursola (Galar); Kleavor, Ursaluna, Basculegion, Sneasler, Overqwil, Wyrdeer (Hisui); Clodsire (Paldea). Fixes the "Meowth→Perrserker" issue → now shows **GALAR** badge.
- **Game-mechanics note**: trade evolutions show 🔗 + a note that a **Linking Cord** works in Legends: Arceus / BDSP / Scarlet-Violet (no trading). Researched.
- **Forms** section: functional forms as cards with region badges; cosmetic variants grouped compactly below.
- **UX**: search bar persistent everywhere; prev/next article nav buttons + keyboard ← →; logo/☰ → full list.
- **Printable book** `print.html`: cover + how-to legend, space-smart multi-column evolution families, single-stage grid, EN/DE/ES selector, double-sided friendly. "🖨 Print book" link in app footer.
- PWA: `sw.js` (`CACHE` = `pokewiki-v3`, cache-first, caches app+data+all sprites on install). Bump `CACHE` on redeploy.

## Decisions locked (from user)
Scope = all 1025 + **all forms** (done). Hosted public (done). Methods translated (done). Pixel sprites (done).
Names moved below evolution (done). Add arrow nav + persistent search + logo-home (done). Research game mechanics (done). Printable book (done).

## Open / next (await user)
1. **Form-specific evolution branches beyond the overlay**: same-species regional evolutions (e.g. Alolan Pikachu→Alolan Raichu via Thunder Stone in Alola) aren't drawn as separate chain edges — only the base edge shows. Could add per-form notes if wanted.
2. **Multiple evolution_details per edge**: we take the first only (e.g. Persian shows Kanto Lv.28; the Alolan-Meowth→Alolan-Persian friendship path is not separately shown). Expand if needed.
3. **Forms as navigable pages** with their own stats/evo subgraph (currently display cards on the base page).
4. **Book polish**: tune columns/sprite sizes after a real print test; optional per-generation chapters.
5. Tech debt: `print.html` duplicates a trimmed copy of the method composer + `REGIONAL_EVO` (self-contained by choice). Consider extracting a shared `evo.js` if they diverge.

## Rebuild data (new Pokémon / games)
```bash
node build-data.mjs            # default LAST=1025, fetches species + all forms
LAST=1030 node build-data.mjs  # bump when new mons added
```
Then bump `CACHE` in `sw.js`, commit, push (Pages auto-deploys from `main`).

## Deploy
Push to `main` → GitHub Pages rebuilds automatically (~1 min). Repo public; public Pokémon data only.

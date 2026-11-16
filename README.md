# PokéWiki

Offline-first Pokémon evolution wiki — mobile PWA. Focus: **evolution lines**, with
trilingual names (EN / DE / ES), localized evolution methods, pixel sprites, and a
demo set of alternate forms (Mega / Gigantamax / regional).

## Use it
Open the hosted URL on your phone → browser menu → **Add to Home Screen**.
After the first load it works fully offline (service worker caches app, data, sprites).

## Project
- `index.html` — the whole app (HTML/CSS/JS, no build step).
- `data/pokedex.json` — bundled data (names, genus, types, evolution chains, forms).
- `sprites/` — pixel sprites, one PNG per Pokémon id.
- `sw.js`, `manifest.webmanifest` — offline + installable.
- `build-data.mjs` — regenerates the data bundle from [PokéAPI](https://pokeapi.co).

## Updating data (new Pokémon / games)
```bash
node build-data.mjs            # fetch all species (default LAST=1025)
LAST=1030 node build-data.mjs  # bump when new Pokémon are added
```
Then bump the `CACHE` version in `sw.js` and redeploy so clients pick up the update.

Data & sprites © PokéAPI / Pokémon; this is a personal reference tool.

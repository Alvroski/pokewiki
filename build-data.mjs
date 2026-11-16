// build-data.mjs — fetches Pokémon data from PokéAPI into a compact local bundle.
// Final: all species (1..LAST) base forms, trilingual EN/DE/ES names + structured
// evolution methods, plus a demo set of alternate forms (Mega/Gmax/regional).
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync, createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const LAST = Number(process.env.LAST || 1025);   // last national-dex id to fetch
const LANGS = ["en", "de", "es"];
const API = "https://pokeapi.co/api/v2";
const OUT_DIR = "data";
const SPRITE_DIR = "sprites";

// species whose alternate forms we pull in as a demo of "all variations"
const FORM_DEMO = [3, 6, 9, 25, 26, 52, 94, 150, 133];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJSON(url, tries = 5) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
      if (res.status === 404) return null;
    } catch (_) { /* retry */ }
    await sleep(400 * (i + 1));
  }
  console.warn("\nFailed: " + url);
  return null;
}

async function pool(items, worker, size = 10) {
  const out = new Array(items.length);
  let idx = 0;
  const run = async () => {
    while (idx < items.length) { const i = idx++; out[i] = await worker(items[i], i); }
  };
  await Promise.all(Array.from({ length: size }, run));
  return out;
}

const names3 = (arr) => {
  const o = {};
  for (const n of arr || []) if (LANGS.includes(n.language.name)) o[n.language.name] = n.name;
  return o;
};
const genus3 = (arr) => {
  const o = {};
  for (const g of arr || []) if (LANGS.includes(g.language.name)) o[g.language.name] = g.genus;
  return o;
};

// ---- localized lookup for items / moves / locations referenced in evolutions ----
const localCache = new Map(); // key `${kind}:${name}` -> {en,de,es}
function refKey(kind, name) { return `${kind}:${name}`; }
async function fetchLocal(kind, name) {
  const key = refKey(kind, name);
  if (localCache.has(key)) return;
  const data = await getJSON(`${API}/${kind}/${name}`);
  const n = names3(data?.names);
  // fallback: prettify the slug
  if (!n.en) n.en = name.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  localCache.set(key, n);
}
const L = (kind, name) => (name ? localCache.get(refKey(kind, name)) || null : null);

// collect every (kind,name) referenced by a raw chain's evolution_details
function collectRefs(node, set) {
  for (const d of node.evolution_details || []) {
    if (d.item) set.add(refKey("item", d.item.name));
    if (d.held_item) set.add(refKey("item", d.held_item.name));
    if (d.known_move) set.add(refKey("move", d.known_move.name));
    if (d.known_move_type) set.add(refKey("type", d.known_move_type.name));
    if (d.location) set.add(refKey("location", d.location.name));
    if (d.trade_species) set.add(refKey("pokemon-species", d.trade_species.name));
  }
  for (const c of node.evolves_to || []) collectRefs(c, set);
}

// build a STRUCTURED method (frontend composes the sentence per language)
function structMethod(details) {
  if (!details || !details.length) return null;
  const d = details[0];
  const m = { trigger: d.trigger?.name };
  if (d.min_level) m.level = d.min_level;
  if (d.min_happiness) m.friendship = true;
  if (d.min_affection) m.affection = true;
  if (d.min_beauty) m.beauty = true;
  if (d.time_of_day) m.time = d.time_of_day;
  if (d.gender === 1) m.gender = 1;
  if (d.gender === 2) m.gender = 2;
  if (d.needs_overworld_rain) m.rain = true;
  if (d.item) m.item = L("item", d.item.name);
  if (d.held_item) m.heldItem = L("item", d.held_item.name);
  if (d.known_move) m.move = L("move", d.known_move.name);
  if (d.known_move_type) m.moveType = L("type", d.known_move_type.name);
  if (d.location) m.location = L("location", d.location.name);
  if (d.trade_species) m.tradeSpecies = L("pokemon-species", d.trade_species.name);
  return m;
}

function simplifyChain(node) {
  const id = Number(node.species.url.split("/").filter(Boolean).pop());
  return {
    id,
    to: (node.evolves_to || []).map((c) => ({ method: structMethod(c.evolution_details), ...simplifyChain(c) })),
  };
}

async function downloadSprite(id) {
  const dest = `${SPRITE_DIR}/${id}.png`;
  if (existsSync(dest)) return true;
  const url = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
    return true;
  } catch (_) { return false; }
}

// alternate forms (varieties) for a species -> demo entries
async function fetchForms(speciesData) {
  const out = [];
  for (const v of speciesData.varieties || []) {
    if (v.is_default) continue;
    const slug = v.pokemon.name;
    const mon = await getJSON(`${API}/pokemon/${slug}`);
    if (!mon) continue;
    const form = await getJSON(`${API}/pokemon-form/${slug}`);
    let nm = names3(form?.names);
    if (!nm.en) nm.en = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    out.push({
      key: slug,
      pid: mon.id,
      name: nm,
      types: (mon.types || []).map((t) => t.type.name),
      sprite: `${SPRITE_DIR}/${mon.id}.png`,
    });
    await downloadSprite(mon.id);
  }
  return out;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(SPRITE_DIR, { recursive: true });

  const ids = Array.from({ length: LAST }, (_, i) => i + 1);
  console.log(`Fetching ${ids.length} species (+pokemon, +sprites)...`);
  const pokemon = {};
  const chainUrls = new Set();
  const rawSpecies = {}; // keep for forms pass
  let done = 0;

  await pool(ids, async (id) => {
    const sp = await getJSON(`${API}/pokemon-species/${id}`);
    if (!sp) return;
    rawSpecies[id] = sp;
    const mon = await getJSON(`${API}/pokemon/${id}`);
    if (sp.evolution_chain?.url) chainUrls.add(sp.evolution_chain.url);
    pokemon[id] = {
      id,
      name: names3(sp.names),
      genus: genus3(sp.genera),
      types: (mon?.types || []).map((t) => t.type.name),
      sprite: `${SPRITE_DIR}/${id}.png`,
      chain: sp.evolution_chain ? Number(sp.evolution_chain.url.split("/").filter(Boolean).pop()) : null,
    };
    await downloadSprite(id);
    if (++done % 50 === 0) process.stdout.write(` ${done}`);
  }, 12);

  console.log(`\nFetching ${chainUrls.size} evolution chains...`);
  const rawChains = await pool([...chainUrls], (url) => getJSON(url), 12);

  // collect + fetch localized names for everything referenced in evolutions
  const refs = new Set();
  for (const ch of rawChains) if (ch) collectRefs(ch.chain, refs);
  console.log(`Localizing ${refs.size} referenced items/moves/locations...`);
  await pool([...refs], (r) => { const [kind, name] = r.split(/:(.+)/); return fetchLocal(kind, name); }, 12);

  // build structured chains now that localCache is populated
  const chains = {};
  for (const ch of rawChains) if (ch) chains[ch.id] = simplifyChain(ch.chain);

  // forms demo
  console.log(`Fetching alternate forms for ${FORM_DEMO.length} demo species...`);
  for (const id of FORM_DEMO) {
    if (!rawSpecies[id] || !pokemon[id]) continue;
    pokemon[id].forms = await fetchForms(rawSpecies[id]);
  }

  const bundle = {
    generatedAt: new Date().toISOString(),
    last: LAST,
    langs: LANGS,
    count: Object.keys(pokemon).length,
    pokemon,
    chains,
  };
  await writeFile(`${OUT_DIR}/pokedex.json`, JSON.stringify(bundle));
  console.log(`\nDone. ${bundle.count} Pokémon, ${Object.keys(chains).length} chains -> ${OUT_DIR}/pokedex.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });

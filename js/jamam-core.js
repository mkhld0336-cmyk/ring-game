/* =============================================================================
   JAMAM CORE  ·  js/jamam-core.js  ·  Chunk 1A  ·  v2.0.0
   Foundation for every JAMAM page. No dependencies, no external assets.
   Load this FIRST, before any other jamam-*.js file. Safe to put in <head>.

   window.JAMAM exposes:
     store    get / set / update / remove / keys / getStr / setStr
     on / off / once / emit        tiny event bus (optional priority)
     migrate()                     one-time data repair, never wipes data
     migrate.register(name, fn)    other modules add their own one-time steps
     haptics  tap / setEnabled / isEnabled / isSupported
     themes   apply / getActive / list / own / isOwned
     rng      seeded / hash / newSeed / dailySeed
     util     today / msToMidnight / clamp / esc / isObj
     player   getName / setName
     game     start / end           (end fans out through the 'game:end' event)
     i18n     register / t          J.t(key, vars), J.lang(), J.isRTL()
     ready(fn)                      runs after the DOM is parsed

   Events: store:set, store:external, migrated, theme:change, theme:owned,
           haptics:change, player:name, game:start, game:end
   ============================================================================= */
(function (global) {
'use strict';

if (global.JAMAM && global.JAMAM.core) return;           // load-once guard

const J = global.JAMAM = global.JAMAM || {};
J.core = { version: '2.0.0', chunk: '1A' };

/* ---------------------------------------------------------------- constants */
const KEYS = Object.freeze({
  lang: 'jamam_games_lang',
  name: 'jamam_player_name',
  theme: 'jamam_theme',                         // dark/light, owned by the hub
  playcounts: 'jamam_playcounts',
  achievements: 'jamam_unlocked_achievements',
  xp: 'jamam_player_xp',
  daily: 'jamam_daily',
  coins: 'jamam_coins',
  haptics: 'jamam_haptics',
  stats: 'jamam_stats',
  challenges: 'jamam_challenges',
  music: 'jamam_music',
  replays: 'jamam_replays',
  colorTheme: 'jamam_color_theme',              // neon/sunset/forest/ice
  schema: 'jamam_schema',
  backup: 'jamam_backup_v1'
});
// Per-game save keys that already exist in the wild. Never deleted or renamed.
const LEGACY_KEYS = Object.freeze([
  'neonPulseRoyalV3', 'neon_pulse_v2_save', 'ghostOfMeSave',
  'vanishFloorSave', 'neonFluxSaveV1'
]);
const GAMES = Object.freeze([
  'neon-pulse', 'neon-flux', 'beat-slasher',
  'ghost-of-me', 'vanishing-floor', 'echo-sonar'
]);
const LANGS = Object.freeze([
  'en', 'ar', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'tr', 'hi', 'id'
]);
const RTL_LANGS = Object.freeze(['ar', 'he', 'fa', 'ur']);
const DEFAULT_LANG = 'en';

J.KEYS = KEYS;
J.LEGACY_KEYS = LEGACY_KEYS;
J.GAMES = GAMES;
J.LANGS = LANGS;

/* --------------------------------------------------------------------- util */
const util = {
  today: function () {                          // local date, YYYY-MM-DD
    const d = new Date();
    const p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  },
  msToMidnight: function () {                   // ms until next local midnight
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1) - n;
  },
  clamp: function (n, lo, hi) { return Math.min(hi, Math.max(lo, n)); },
  isObj: function (v) { return v !== null && typeof v === 'object' && !Array.isArray(v); },
  esc: function (s) {                           // escape text before innerHTML
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(s).replace(/[&<>"']/g, function (c) { return map[c]; });
  }
};
J.util = util;

function clone(v) {
  return (v !== null && typeof v === 'object') ? JSON.parse(JSON.stringify(v)) : v;
}

/* ---------------------------------------------------------------- event bus */
const handlers = {};

function on(evt, fn, prio) {                    // higher prio runs first
  const list = handlers[evt] || (handlers[evt] = []);
  list.push({ fn: fn, prio: prio || 0 });
  list.sort(function (a, b) { return b.prio - a.prio; });
  return function () { off(evt, fn); };         // returns an unsubscribe function
}
function off(evt, fn) {
  if (handlers[evt]) handlers[evt] = handlers[evt].filter(function (h) { return h.fn !== fn; });
}
function once(evt, fn, prio) {
  const un = on(evt, function (data) { un(); fn(data); }, prio);
  return un;
}
function emit(evt, data) {                      // a failing handler never breaks the rest
  const list = (handlers[evt] || []).slice();
  for (let i = 0; i < list.length; i++) {
    try { list[i].fn(data); } catch (e) { console.warn('[JAMAM] handler error in "' + evt + '":', e); }
  }
  return data;
}
J.on = on; J.off = off; J.once = once; J.emit = emit;

/* -------------------------------------------------------------------- store */
// localStorage with an in-memory fallback (private mode, quota, blocked storage).
const mem = {};
let ls = null;
try { ls = global.localStorage; ls.getItem('__jamam_probe'); } catch (e) { ls = null; }

function rawGet(k) {
  try { if (ls) { const v = ls.getItem(k); if (v !== null) return v; } } catch (e) { /* fall through */ }
  return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null;
}
function rawSet(k, v) {                         // true only if truly persisted
  try { if (ls) { ls.setItem(k, v); delete mem[k]; return true; } } catch (e) { /* quota */ }
  mem[k] = v;
  return false;
}
function rawRemove(k) {
  try { if (ls) ls.removeItem(k); } catch (e) { /* ignore */ }
  delete mem[k];
}

const store = {
  // JSON values. Returns a fresh copy of `def` when missing or unparsable.
  get: function (key, def) {
    const raw = rawGet(key);
    if (raw === null) return clone(def);
    try { return JSON.parse(raw); } catch (e) { return clone(def); }
  },
  set: function (key, val) {
    let s;
    try { s = JSON.stringify(val); } catch (e) { return false; }
    const ok = rawSet(key, s);
    emit('store:set', { key: key });
    return ok;
  },
  // Read, let fn change the copy (return it or mutate it), save, return the result.
  update: function (key, def, fn) {
    const cur = store.get(key, def);
    const out = fn(cur);
    const val = out === undefined ? cur : out;
    store.set(key, val);
    return val;
  },
  // Plain strings (jamam_games_lang, jamam_player_name, jamam_theme are NOT JSON).
  getStr: function (key, def) { const v = rawGet(key); return v === null ? def : v; },
  setStr: function (key, val) { const ok = rawSet(key, String(val)); emit('store:set', { key: key }); return ok; },
  remove: function (key) { rawRemove(key); emit('store:set', { key: key }); },
  keys: function (prefix) {
    const out = [];
    try { if (ls) for (let i = 0; i < ls.length; i++) out.push(ls.key(i)); } catch (e) { /* ignore */ }
    Object.keys(mem).forEach(function (k) { if (out.indexOf(k) < 0) out.push(k); });
    return prefix ? out.filter(function (k) { return k.indexOf(prefix) === 0; }) : out;
  }
};
J.store = store;

// Another tab changed JAMAM data (game tab -> hub tab). Lets UIs refresh.
if (global.addEventListener) {
  global.addEventListener('storage', function (e) {
    if (e.key && e.key.indexOf('jamam_') === 0) {
      if (e.key === KEYS.haptics) hapticsOn = null;
      emit('store:external', { key: e.key });
    }
  });
}

/* ---------------------------------------------------------------- migration */
// Steps run once per browser, tracked by name in jamam_schema. Nothing is
// deleted: legacy saves stay, and a backup snapshot is taken before repairs.
const steps = [];
let migrated = false;

function readSchema() {
  const s = store.get(KEYS.schema, null);
  return (util.isObj(s) && Array.isArray(s.done)) ? s : { v: 2, done: [], at: 0 };
}
function runStep(step, schema, ran) {
  if (schema.done.indexOf(step.name) >= 0) return;
  try { step.fn(); schema.done.push(step.name); ran.push(step.name); }
  catch (e) { console.warn('[JAMAM] migration step failed:', step.name, e); }
}
function migrate() {
  const schema = readSchema();
  const ran = [];
  steps.forEach(function (st) { runStep(st, schema, ran); });
  migrated = true;
  if (ran.length) { schema.at = Date.now(); store.set(KEYS.schema, schema); }
  emit('migrated', { ran: ran.slice(), done: schema.done.slice() });
  return ran;
}
migrate.register = function (name, fn) {        // modules call this at load time
  if (steps.some(function (s) { return s.name === name; })) return false;
  const step = { name: name, fn: fn };
  steps.push(step);
  if (migrated) {                               // registered late: run it now
    const schema = readSchema();
    const ran = [];
    runStep(step, schema, ran);
    if (ran.length) { schema.at = Date.now(); store.set(KEYS.schema, schema); }
  }
  return true;
};
J.migrate = migrate;

migrate.register('core.backup-v1', function () {  // snapshot before any repair
  if (!ls) return;
  const snap = {};
  let size = 0;
  for (let i = 0; i < ls.length; i++) {
    const k = ls.key(i);
    const mine = (k.indexOf('jamam_') === 0 && k !== KEYS.backup && k !== KEYS.schema) ||
                 LEGACY_KEYS.indexOf(k) >= 0;
    if (!mine) continue;
    const v = ls.getItem(k) || '';
    size += v.length;
    if (size <= 200000) snap[k] = v;
  }
  if (Object.keys(snap).length) rawSet(KEYS.backup, JSON.stringify({ at: Date.now(), data: snap }));
});

migrate.register('core.repair-playcounts', function () {
  const raw = rawGet(KEYS.playcounts);
  if (raw === null) return;
  let obj = null;
  try { obj = JSON.parse(raw); } catch (e) { obj = null; }
  const fixed = {};
  if (util.isObj(obj)) {
    Object.keys(obj).forEach(function (k) {
      const n = Math.floor(Number(obj[k]));
      fixed[k] = isFinite(n) && n > 0 ? n : 0;
    });
  }
  store.set(KEYS.playcounts, fixed);
});

migrate.register('core.repair-achievements', function () {
  const raw = rawGet(KEYS.achievements);
  if (raw === null) return;
  let arr = null;
  try { arr = JSON.parse(raw); } catch (e) { arr = null; }
  const fixed = [];
  if (Array.isArray(arr)) {
    arr.forEach(function (id) {
      if (typeof id === 'string' && fixed.indexOf(id) < 0) fixed.push(id);
    });
  }
  store.set(KEYS.achievements, fixed);
});

/* ------------------------------------------------------------------ haptics */
const HAPTIC_PATTERNS = {
  hit: 10, miss: 30, levelup: [50, 30, 50], achievement: 100, coin: 5
};
let hapticsOn = null;                           // cached; null = read again

function hapticsEnabled() {
  if (hapticsOn === null) hapticsOn = store.get(KEYS.haptics, { enabled: true }).enabled !== false;
  return hapticsOn;
}
const haptics = {
  isSupported: function () {
    return !!(global.navigator && typeof global.navigator.vibrate === 'function');
  },
  isEnabled: hapticsEnabled,
  setEnabled: function (b) {
    hapticsOn = !!b;
    store.set(KEYS.haptics, { enabled: hapticsOn });
    emit('haptics:change', { enabled: hapticsOn });
    return hapticsOn;
  },
  // type: 'hit' | 'miss' | 'levelup' | 'achievement' | 'coin' | milliseconds
  tap: function (type) {
    if (!hapticsEnabled() || !haptics.isSupported()) return false;
    const p = typeof type === 'number' ? type : (HAPTIC_PATTERNS[type || 'hit'] || HAPTIC_PATTERNS.hit);
    try { return global.navigator.vibrate(p); } catch (e) { return false; }
  }
};
J.haptics = haptics;

/* ------------------------------------------------------------------- themes */
// Pages opt in by using var(--jm-accent) etc. Existing page CSS is untouched.
const THEMES = {
  neon: { name: 'Neon', price: 0, c: {
    accent: '#57e8ff', accent2: '#ff4fd8', gold: '#f7c969', bg: '#070817', bg2: '#0f1425',
    text: '#eaf2ff', muted: '#94a3b8', glow: 'rgba(87,232,255,.45)' } },
  sunset: { name: 'Sunset', price: 200, c: {
    accent: '#ff8a3d', accent2: '#b05cff', gold: '#ffd27a', bg: '#2a0a10', bg2: '#3d121c',
    text: '#fff1e6', muted: '#d9a79a', glow: 'rgba(255,138,61,.45)' } },
  forest: { name: 'Forest', price: 200, c: {
    accent: '#3cff8c', accent2: '#2dd4bf', gold: '#e6c36a', bg: '#1a1109', bg2: '#26190e',
    text: '#eaf7ea', muted: '#a8b89a', glow: 'rgba(60,255,140,.4)' } },
  ice: { name: 'Ice', price: 200, c: {
    accent: '#6ec6ff', accent2: '#f4fbff', gold: '#cfe9ff', bg: '#06142e', bg2: '#0b2149',
    text: '#f4fbff', muted: '#9bb6d6', glow: 'rgba(110,198,255,.45)' } }
};

function themeState() {                         // always returns a valid state
  const s = store.get(KEYS.colorTheme, null);
  let owned = (s && Array.isArray(s.owned)) ? s.owned.filter(function (id) { return THEMES[id]; }) : [];
  owned = owned.filter(function (id, i) { return owned.indexOf(id) === i; });
  if (owned.indexOf('neon') < 0) owned.unshift('neon');
  const active = (s && THEMES[s.active] && owned.indexOf(s.active) >= 0) ? s.active : 'neon';
  return { active: active, owned: owned };
}
function paintTheme(name) {
  const c = THEMES[name].c;
  const root = global.document.documentElement;
  Object.keys(c).forEach(function (k) { root.style.setProperty('--jm-' + k, c[k]); });
  root.setAttribute('data-jamam-theme', name);
}
const themes = {
  // Owned themes only. opts.preview = try an unowned theme without saving it.
  apply: function (name, opts) {
    opts = opts || {};
    if (!THEMES[name]) return false;
    const st = themeState();
    if (st.owned.indexOf(name) < 0 && !opts.preview) return false;
    paintTheme(name);
    if (!opts.preview && st.active !== name) { st.active = name; store.set(KEYS.colorTheme, st); }
    emit('theme:change', { name: name, preview: !!opts.preview });
    return true;
  },
  getActive: function () { return themeState().active; },
  isOwned: function (id) { return themeState().owned.indexOf(id) >= 0; },
  own: function (id) {                          // the shop calls this after coins.spend
    if (!THEMES[id]) return false;
    const st = themeState();
    if (st.owned.indexOf(id) < 0) { st.owned.push(id); store.set(KEYS.colorTheme, st); }
    emit('theme:owned', { id: id });
    return true;
  },
  list: function () {
    const st = themeState();
    return Object.keys(THEMES).map(function (id) {
      const tr = J.t('theme_' + id);
      return {
        id: id, price: THEMES[id].price, colors: clone(THEMES[id].c),
        name: tr === 'theme_' + id ? THEMES[id].name : tr,
        owned: st.owned.indexOf(id) >= 0, active: st.active === id
      };
    });
  }
};
J.themes = themes;

try { if (global.document && global.document.documentElement) paintTheme(themeState().active); }
catch (e) { /* theme is cosmetic: never block the page */ }

/* ---------------------------------------------------------------------- rng */
// Seeded generator (mulberry32). Same seed gives the same sequence everywhere,
// which is what replays, ghosts and daily layouts rely on.
function hashStr(str) {                         // FNV-1a, 32-bit
  let h = 2166136261 >>> 0;
  str = String(str);
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
function seeded(seed) {
  const initial = (typeof seed === 'string') ? hashStr(seed) : (Number(seed) >>> 0);
  let s = initial;
  function rand() {                             // drop-in replacement for Math.random()
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  rand.seed = initial;
  rand.state = function () { return s; };
  rand.setState = function (v) { s = v >>> 0; };
  rand.range = function (a, b) { return a + rand() * (b - a); };
  rand.int = function (a, b) { return a + Math.floor(rand() * (b - a + 1)); };   // inclusive
  rand.chance = function (p) { return rand() < p; };
  rand.pick = function (arr) { return arr[Math.floor(rand() * arr.length)]; };
  rand.shuffle = function (arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  };
  // Independent stream derived from the original seed (e.g. spawns vs power-ups).
  rand.fork = function (label) { return seeded(hashStr(initial + '#' + label)); };
  return rand;
}
J.rng = {
  seeded: seeded,
  hash: hashStr,
  newSeed: function () {
    try {
      if (global.crypto && global.crypto.getRandomValues) {
        return global.crypto.getRandomValues(new Uint32Array(1))[0];
      }
    } catch (e) { /* fall back */ }
    return Math.floor(Math.random() * 4294967296) >>> 0;   // seeding only, not gameplay
  },
  dailySeed: function (gameId) { return hashStr(util.today() + '|' + gameId); }
};

/* ------------------------------------------------------- player + language */
J.player = {
  getName: function () {
    const n = String(store.getStr(KEYS.name, '') || '').trim();
    return n || 'Player';
  },
  setName: function (name) {
    const n = String(name || '').replace(/[<>]/g, '').trim().slice(0, 24);
    if (!n) return false;
    store.setStr(KEYS.name, n);
    emit('player:name', { name: n });
    return true;
  }
};

J.lang = function () {                          // saved choice, else browser, else English
  const saved = store.getStr(KEYS.lang, '');
  if (LANGS.indexOf(saved) >= 0) return saved;
  const nav = String((global.navigator && global.navigator.language) || DEFAULT_LANG).slice(0, 2).toLowerCase();
  return LANGS.indexOf(nav) >= 0 ? nav : DEFAULT_LANG;
};
J.isRTL = function (lang) { return RTL_LANGS.indexOf(lang || J.lang()) >= 0; };
J.applyDir = function (lang) {                  // opt-in helper, never called automatically
  const l = lang || J.lang();
  global.document.documentElement.setAttribute('lang', l);
  global.document.documentElement.setAttribute('dir', J.isRTL(l) ? 'rtl' : 'ltr');
};

// Dictionaries are registered by data files (Chunk 1D): J.i18n.register('en', {...})
const dict = {};
J.i18n = {
  dict: dict,
  register: function (lang, obj) { dict[lang] = Object.assign(dict[lang] || {}, obj); },
  t: function (key, vars, lang) {
    const l = lang || J.lang();
    let s = (dict[l] && dict[l][key] !== undefined) ? dict[l][key]
          : (dict.en && dict.en[key] !== undefined) ? dict.en[key] : key;
    s = String(s);
    return vars ? s.replace(/\{(\w+)\}/g, function (m, n) { return n in vars ? vars[n] : m; }) : s;
  }
};
J.t = function (key, vars) { return J.i18n.t(key, vars); };

/* ----------------------------------------------------------- game lifecycle */
// Games call JAMAM.game.start(id) when a run begins and JAMAM.game.end(id, data)
// when it finishes. Other modules subscribe to 'game:end' (xp, coins, stats,
// daily, achievements, challenges, replays) and write into payload.results so
// the game-over screen can show what was earned.
const startedAt = {};
const lastEnd = {};
J.game = {
  start: function (gameId) {
    startedAt[gameId] = Date.now();
    emit('game:start', { gameId: gameId, at: startedAt[gameId] });
    return startedAt[gameId];
  },
  // data: { score, time (seconds), won, extra:{ combo, level, ... } }
  end: function (gameId, data) {
    data = util.isObj(data) ? data : {};
    const now = Date.now();
    if (lastEnd[gameId] && now - lastEnd[gameId] < 400) return null;   // double-call guard
    lastEnd[gameId] = now;
    if (GAMES.indexOf(gameId) < 0) console.warn('[JAMAM] unknown gameId:', gameId);
    let time = Number(data.time);
    if (!isFinite(time) || time < 0) time = startedAt[gameId] ? (now - startedAt[gameId]) / 1000 : 0;
    const payload = {
      gameId: gameId,
      score: Math.max(0, Math.floor(Number(data.score) || 0)),
      time: Math.round(time * 10) / 10,
      won: !!data.won,
      extra: util.isObj(data.extra) ? data.extra : {},
      date: util.today(),
      at: now,
      results: {}
    };
    delete startedAt[gameId];
    emit('game:end', payload);
    return payload;
  }
};

/* -------------------------------------------------------------------- boot */
J.ready = function (fn) {
  if (global.document && global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else { fn(); }
};
// Run migrations after the other modules have had the chance to register steps.
J.ready(function () { migrate(); });

})(window);

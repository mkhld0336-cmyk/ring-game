/* =============================================================================
   JAMAM CORE  ·  js/jamam-core.js  ·  v2.1.0
   ============================================================================= */
(function (global) {
'use strict';

if (global.JAMAM && global.JAMAM.core) return;

const J = global.JAMAM = global.JAMAM || {};
J.core = { version: '2.1.0' };

const KEYS = Object.freeze({
  lang: 'jamam_games_lang', name: 'jamam_player_name', theme: 'jamam_theme',
  playcounts: 'jamam_playcounts', achievements: 'jamam_unlocked_achievements',
  xp: 'jamam_player_xp', daily: 'jamam_daily', coins: 'jamam_coins',
  haptics: 'jamam_haptics', stats: 'jamam_stats', challenges: 'jamam_challenges',
  music: 'jamam_music', replays: 'jamam_replays', colorTheme: 'jamam_color_theme',
  schema: 'jamam_schema', backup: 'jamam_backup_v1',
  levels: 'jamam_levels', analytics: 'jamam_analytics'
});
const GAMES = Object.freeze([
  'neon-pulse', 'neon-flux', 'beat-slasher', 'ghost-of-me',
  'vanishing-floor', 'echo-sonar', 'solar-grid', 'orbit-switch',
  'pulse-blade', 'orbit-drop', 'aura-dash', 'tower-of-glory'
]);
const LANGS = Object.freeze(['en','ar','es','fr','de','it','pt','ru','zh','ja','ko','tr','hi','id']);
const RTL_LANGS = Object.freeze(['ar','he','fa','ur']);
const DEFAULT_LANG = 'en';
J.KEYS = KEYS; J.GAMES = GAMES; J.LANGS = LANGS;

const util = {
  today: function(){ const d=new Date(),p=n=>(n<10?'0':'')+n; return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate()); },
  msToMidnight: function(){ const n=new Date(); return new Date(n.getFullYear(),n.getMonth(),n.getDate()+1)-n; },
  clamp: function(n,lo,hi){ return Math.min(hi,Math.max(lo,n)); },
  isObj: function(v){ return v!==null && typeof v==='object' && !Array.isArray(v); },
  esc: function(s){ const map={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}; return String(s).replace(/[&<>"']/g,c=>map[c]); }
};
J.util = util;
function clone(v){ return (v!==null && typeof v==='object') ? JSON.parse(JSON.stringify(v)) : v; }

// Event Bus
const handlers = {};
function on(evt,fn,prio){ const list=handlers[evt]||(handlers[evt]=[]); list.push({fn,prio:prio||0}); list.sort((a,b)=>b.prio-a.prio); return ()=>off(evt,fn); }
function off(evt,fn){ if(handlers[evt]) handlers[evt]=handlers[evt].filter(h=>h.fn!==fn); }
function once(evt,fn,prio){ const un=on(evt,data=>{un();fn(data);},prio); return un; }
function emit(evt,data){ const list=(handlers[evt]||[]).slice(); for(let i=0;i<list.length;i++){ try{ list[i].fn(data); }catch(e){ console.warn('[JAMAM] handler error:',evt,e); } } return data; }
J.on=on; J.off=off; J.once=once; J.emit=emit;

// Store
const mem={}; let ls=null;
try{ ls=global.localStorage; ls.getItem('__probe'); }catch(e){ ls=null; }
function rawGet(k){ try{ if(ls){const v=ls.getItem(k); if(v!==null) return v;} }catch(e){} return Object.prototype.hasOwnProperty.call(mem,k)?mem[k]:null; }
function rawSet(k,v){ try{ if(ls){ls.setItem(k,v); delete mem[k]; return true;} }catch(e){} mem[k]=v; return false; }
function rawRemove(k){ try{ if(ls) ls.removeItem(k); }catch(e){} delete mem[k]; }
const store = {
  get: function(key,def){ const raw=rawGet(key); if(raw===null) return clone(def); try{ return JSON.parse(raw); }catch(e){ return clone(def); } },
  set: function(key,val){ let s; try{ s=JSON.stringify(val); }catch(e){ return false; } const ok=rawSet(key,s); emit('store:set',{key}); return ok; },
  update: function(key,def,fn){ const cur=store.get(key,def); const out=fn(cur); const val=out===undefined?cur:out; store.set(key,val); return val; },
  getStr: function(key,def){ const v=rawGet(key); return v===null?def:v; },
  setStr: function(key,val){ const ok=rawSet(key,String(val)); emit('store:set',{key}); return ok; },
  remove: function(key){ rawRemove(key); emit('store:set',{key}); },
  keys: function(prefix){ const out=[]; try{ if(ls) for(let i=0;i<ls.length;i++) out.push(ls.key(i)); }catch(e){} Object.keys(mem).forEach(k=>{ if(out.indexOf(k)<0) out.push(k); }); return prefix?out.filter(k=>k.indexOf(prefix)===0):out; }
};
J.store = store;

// Haptics
const HAPTIC_PATTERNS = { hit:10, miss:30, levelup:[50,30,50], achievement:100, coin:5, impactLight:15, impactHeavy:60 };
let hapticsOn=null;
function hapticsEnabled(){ if(hapticsOn===null) hapticsOn=store.get(KEYS.haptics,{enabled:true}).enabled!==false; return hapticsOn; }
const haptics = {
  isSupported: ()=>!!(global.navigator && typeof global.navigator.vibrate==='function'),
  isEnabled: hapticsEnabled,
  setEnabled: function(b){ hapticsOn=!!b; store.set(KEYS.haptics,{enabled:hapticsOn}); emit('haptics:change',{enabled:hapticsOn}); return hapticsOn; },
  tap: function(type){ if(!hapticsEnabled()||!haptics.isSupported()) return false; const p=typeof type==='number'?type:(HAPTIC_PATTERNS[type||'hit']||HAPTIC_PATTERNS.hit); try{ return global.navigator.vibrate(p); }catch(e){ return false; } }
};
J.haptics = haptics;

// Themes
const THEMES = {
  neon: { name:'Neon', price:0, c:{ accent:'#57e8ff', accent2:'#ff4fd8', gold:'#f7c969', bg:'#070817', bg2:'#0f1425', text:'#eaf2ff', muted:'#94a3b8' } },
  sunset: { name:'Sunset', price:200, c:{ accent:'#ff8a3d', accent2:'#b05cff', gold:'#ffd27a', bg:'#2a0a10', bg2:'#3d121c', text:'#fff1e6', muted:'#d9a79a' } },
  forest: { name:'Forest', price:200, c:{ accent:'#3cff8c', accent2:'#2dd4bf', gold:'#e6c36a', bg:'#1a1109', bg2:'#26190e', text:'#eaf7ea', muted:'#a8b89a' } },
  ice: { name:'Ice', price:200, c:{ accent:'#6ec6ff', accent2:'#f4fbff', gold:'#cfe9ff', bg:'#06142e', bg2:'#0b2149', text:'#f4fbff', muted:'#9bb6d6' } }
};
function themeState(){ const s=store.get(KEYS.colorTheme,null); let owned=(s&&Array.isArray(s.owned))?s.owned.filter(id=>THEMES[id]):[]; owned=owned.filter((id,i)=>owned.indexOf(id)===i); if(owned.indexOf('neon')<0) owned.unshift('neon'); const active=(s&&THEMES[s.active]&&owned.indexOf(s.active)>=0)?s.active:'neon'; return { active, owned }; }
function paintTheme(name){ const c=THEMES[name].c; const root=global.document.documentElement; Object.keys(c).forEach(k=>root.style.setProperty('--jm-'+k,c[k])); root.setAttribute('data-jamam-theme',name); }
const themes = {
  apply: function(name,opts){ opts=opts||{}; if(!THEMES[name]) return false; const st=themeState(); if(st.owned.indexOf(name)<0&&!opts.preview) return false; paintTheme(name); if(!opts.preview&&st.active!==name){ st.active=name; store.set(KEYS.colorTheme,st); } emit('theme:change',{name,preview:!!opts.preview}); return true; },
  getActive: ()=>themeState().active,
  isOwned: id=>themeState().owned.indexOf(id)>=0,
  own: function(id){ if(!THEMES[id]) return false; const st=themeState(); if(st.owned.indexOf(id)<0){ st.owned.push(id); store.set(KEYS.colorTheme,st); } emit('theme:owned',{id}); return true; },
  list: function(){ const st=themeState(); return Object.keys(THEMES).map(id=>{ const tr=J.t('theme_'+id); return { id, price:THEMES[id].price, colors:clone(THEMES[id].c), name:tr==='theme_'+id?THEMES[id].name:tr, owned:st.owned.indexOf(id)>=0, active:st.active===id }; }); }
};
J.themes = themes;
try{ if(global.document && global.document.documentElement) paintTheme(themeState().active); }catch(e){}

// RNG
function hashStr(str){ let h=2166136261>>>0; str=String(str); for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,16777619)>>>0; } return h>>>0; }
function seeded(seed){
  const initial=(typeof seed==='string')?hashStr(seed):(Number(seed)>>>0);
  let s=initial;
  function rand(){ s=(s+0x6D2B79F5)>>>0; let t=s; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; }
  rand.seed=initial;
  rand.state=()=>s;
  rand.setState=v=>{s=v>>>0;};
  rand.range=(a,b)=>a+rand()*(b-a);
  rand.int=(a,b)=>a+Math.floor(rand()*(b-a+1));
  rand.chance=p=>rand()<p;
  rand.pick=arr=>arr[Math.floor(rand()*arr.length)];
  rand.shuffle=arr=>{ const a=arr.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(rand()*(i+1)); const tmp=a[i];a[i]=a[j];a[j]=tmp; } return a; };
  rand.fork=label=>seeded(hashStr(initial+'#'+label));
  return rand;
}
J.rng = {
  seeded, hash:hashStr,
  newSeed: ()=>{ try{ if(global.crypto&&global.crypto.getRandomValues) return global.crypto.getRandomValues(new Uint32Array(1))[0]; }catch(e){} return Math.floor(Math.random()*4294967296)>>>0; },
  dailySeed: gameId=>hashStr(util.today()+'|'+gameId)
};

// Player & Lang
J.player = {
  getName: ()=>{ const n=String(store.getStr(KEYS.name,'')||'').trim(); return n||'Player'; },
  setName: name=>{ const n=String(name||'').replace(/[<>]/g,'').trim().slice(0,24); if(!n) return false; store.setStr(KEYS.name,n); emit('player:name',{name:n}); return true; }
};
J.lang = function(){ const saved=store.getStr(KEYS.lang,''); if(LANGS.indexOf(saved)>=0) return saved; const nav=String((global.navigator&&global.navigator.language)||DEFAULT_LANG).slice(0,2).toLowerCase(); return LANGS.indexOf(nav)>=0?nav:DEFAULT_LANG; };
J.isRTL = lang=>RTL_LANGS.indexOf(lang||J.lang())>=0;
J.applyDir = function(lang){ const l=lang||J.lang(); global.document.documentElement.setAttribute('lang',l); global.document.documentElement.setAttribute('dir',J.isRTL(l)?'rtl':'ltr'); };

const dict = {};
J.i18n = {
  dict,
  register: (lang,obj)=>{ dict[lang]=Object.assign(dict[lang]||{},obj); },
  t: function(key,vars,lang){ const l=lang||J.lang(); let s=(dict[l]&&dict[l][key]!==undefined)?dict[l][key]:(dict.en&&dict.en[key]!==undefined)?dict.en[key]:key; s=String(s); return vars?s.replace(/\{(\w+)\}/g,(m,n)=>n in vars?vars[n]:m):s; }
};
J.t = (key,vars)=>J.i18n.t(key,vars);

// Game lifecycle
const startedAt={}, lastEnd={};
J.game = {
  start: function(gameId){ startedAt[gameId]=Date.now(); emit('game:start',{gameId,at:startedAt[gameId]}); return startedAt[gameId]; },
  end: function(gameId,data){
    data=util.isObj(data)?data:{};
    const now=Date.now();
    if(lastEnd[gameId]&&now-lastEnd[gameId]<400) return null;
    lastEnd[gameId]=now;
    let time=Number(data.time);
    if(!isFinite(time)||time<0) time=startedAt[gameId]?(now-startedAt[gameId])/1000:0;
    const payload={ gameId, score:Math.max(0,Math.floor(Number(data.score)||0)), time:Math.round(time*10)/10, won:!!data.won, extra:util.isObj(data.extra)?data.extra:{}, date:util.today(), at:now, results:{} };
    delete startedAt[gameId];
    emit('game:end',payload);
    return payload;
  }
};

// Ready
J.ready = function(fn){ if(global.document && global.document.readyState==='loading') global.document.addEventListener('DOMContentLoaded',fn,{once:true}); else fn(); };

// ============================================
// 🆕 نظام المستويات الموحد
// ============================================
J.levels = {
  config: {},
  
  getCurrentLevel: function(gameKey) {
    const levels = J.store.get(KEYS.levels, {});
    return levels[gameKey] || 1;
  },
  
  completeLevel: function(gameKey, score) {
    const levels = J.store.get(KEYS.levels, {});
    const currentLvl = levels[gameKey] || 1;
    levels[gameKey] = currentLvl + 1;
    J.store.set(KEYS.levels, levels);
    
    if (window.showToast) window.showToast('🏆 Level ' + (currentLvl + 1) + ' Unlocked!');
    J.emit('level:complete', { gameKey, newLevel: levels[gameKey], score });
    console.log('[Levels] ' + gameKey + ' → Level ' + levels[gameKey]);
    return levels[gameKey];
  },
  
  resetLevel: function(gameKey) {
    const levels = J.store.get(KEYS.levels, {});
    levels[gameKey] = 1;
    J.store.set(KEYS.levels, levels);
    return 1;
  },
  
  getAllLevels: function() {
    return J.store.get(KEYS.levels, {});
  }
};

// ============================================
// 🆕 تتبع الزوار (Analytics)
// ============================================
J.analytics = {
  sessionId: null,
  startTime: Date.now(),
  
  init: function() {
    this.sessionId = this.generateId();
    try {
      localStorage.setItem('jamam_session', JSON.stringify({
        id: this.sessionId,
        date: new Date().toDateString()
      }));
    } catch(e) {}
    
    const daily = J.store.get('jamam_daily_users', {});
    const today = util.today();
    daily[today] = (daily[today] || 0) + 1;
    J.store.set('jamam_daily_users', daily);
    
    this.logAction('session_start', { lang: J.lang() });
    console.log('[Analytics] Session: ' + this.sessionId);
  },
  
  logAction: function(action, details) {
    console.log('[Analytics] ' + action, details || '');
    const events = J.store.get('jamam_events', []);
    events.push({ action: action, time: Date.now(), details: details || {} });
    if (events.length > 200) events.shift();
    J.store.set('jamam_events', events);
  },
  
  unload: function() {
    const duration = (Date.now() - this.startTime) / 1000;
    this.logAction('session_end', { duration_sec: Math.round(duration) });
  },
  
  generateId: function() {
    return 'xxxx-xxxx'.replace(/x/g, () => Math.floor(Math.random()*16).toString(16));
  }
};

J.ready(function() {
  J.analytics.init();
  window.addEventListener('beforeunload', () => J.analytics.unload());
});

// Event logging hook
J.on('game:end', function(data) {
  J.analytics.logAction('game_end', { game: data.gameId, score: data.score });
});

})(window);

/* ===================== interactie, paneel, presetmenu's, labels, render-lus ===================== */
document.documentElement.lang = 'nl';
const $ = id => document.getElementById(id);
const els = {
  sheet: $('sheet'), crumbs: $('crumbs'), name: $('selName'), meta: $('selMeta'), desc: $('selDesc'), spec: $('selSpec'), kids: $('selKids'), kidsTitle: $('kidsTitle'),
  toggle: $('actToggle'), open: $('actOpen'), all: $('actAll'), up: $('actUp'), dive: $('actDive'), dim: $('actDim'), iso: $('actIsolate'), focus: $('actFocus'),
  tree: $('tree'), search: $('treeSearch'), treeInfo: $('treeInfo'), labels: $('labels'), leaders: $('leaders'), hint: $('hint'), presets: $('presets'), legend: $('legend'),
  menu: $('menu'), tip: $('tip'), press: $('press'), explode: $('explode'), explodeName: $('explodeName'), explodeOut: $('explodeOut'), play: $('play'), undo: $('undo'),
  help: $('help'), helpDlg: $('helpDlg'), tourBar: $('tourBar'), tourText: $('tourText'), tourStop: $('tourStop'), dock: $('dock'), topbar: $('topbar'),
  quality: $('tQuality'), qualityRow: $('qualityRow'), qualityNote: $('qualityNote'),
  notice: $('notice'), toast: $('toast'), isoBadge: $('isoBadge'), isoName: $('isoName'),
};
// Tijden en afstanden van golf 5c-1 bij elkaar (er is nog geen CFG; oudere constanten staan bij hun gebruik).
const UI_ISO_FADE_MS = 300;                  // U4: uitfaden van wat bij isoleren uit beeld gaat
const UI_TOAST_MS = 1800;                    // U8, U9: korte melding onderin (volledige labelnaam, beeld opgeslagen)
const UI_HINT_MS = 9000;                     // hint bij de start, daarna (U8) de suggestie tot de eerste klik
const UI_LABEL_MAX = 24, UI_LABEL_MAX_NARROW = 10; // U2: hoogstens zoveel labels; smal scherm (onder 600 px) minder
const UI_THEME_KEY = 's26u-theme';        // U5: onthouden themakeuze (light, dark; systeem = niets bewaard)
const UI_PRESS_VIBRATE_MS = 10;              // U8: trilling als de ring bij lang drukken vol is
let MODE = 'part', LABELS = true, CTX = null, ACTIVE_PRESET = 'assembled', needs = true;
let uiLabelForce = false;
const requestRender = () => { needs = true; };
const fmtCount = n => (n.count === 1 ? '1 onderdeel' : `${n.count} onderdelen`);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const uiTouch = !!(window.matchMedia && matchMedia('(hover: none), (pointer: coarse)').matches);
if (uiTouch) document.body.classList.add('touch');
// Indeling van het paneel: onder als lade (telefoon staand), als kolom rechts (bureaublad en telefoon liggend).
// Dezelfde voorwaarde staat in de mediaquery van head.html (blok 'telefoon liggend: zijkolom').
const uiMqSide = window.matchMedia ? matchMedia('(max-width: 919.98px) and (max-height: 520px) and (orientation: landscape)') : null;
const uiSide = () => !!(uiMqSide && uiMqSide.matches);
const uiSheetBottom = () => window.innerWidth < 920 && !uiSide();
controls.minDistance = 0.05;
let uiUiDirty = true;            // schermvlakken van de bediening opnieuw meten
let uiSyncPending = false;
const uiUiChanged = () => {
  uiUiDirty = true; requestRender();
  if (!uiSyncPending) { uiSyncPending = true; Promise.resolve().then(() => { uiSyncPending = false; uiSyncLabels(); }); }
};

/* ---------- hulpfuncties voor de boom ---------- */
function uiScopeRoot() { return ISO.length === 1 ? ISO[0] : ROOT; }
function pathFrom(n) { const p = []; for (let a = n; a; a = a.parent) { p.unshift(a); if (ISO.includes(a)) break; } return p; }
function uiClosedAbove(n) { for (let a = n.parent; a; a = a.parent) { if (!uiOpen(a)) return a; if (ISO.includes(a)) break; } return null; }
function uiDeepestOpen(p) { let a = null; pathFrom(p).forEach(x => { if (x.asm && uiOpen(x)) a = x; }); return a; }

/* ---------- selectie en paneel ---------- */
// U7: de uitleg bij het hele toestel in de modus Openen (de beschrijving in systems.js noemt het uitklappen)
const uiOpenRootDesc = 'Samsung Galaxy S26 Ultra in White, 1 TB met 16 GB RAM. Openen: klik op het achterglas, de onderafdekplaat, de luidspreker onder, de batterij, de SIM-lade, de S Pen of het scherm om het te openen of eruit te halen; nog een klik sluit het weer. De volgorde volgt de teardown: eerst het achterglas, dan onderafdekplaat en luidspreker, dan pas de batterij. Rechtsklik, Shift+klik of vasthouden sluit de binnenste open opener.';
function select(n, opts = {}) {
  n = n || uiScopeRoot();
  if (uiLifted && uiLifted !== n) uiDrop();
  if (DIM && !isUnder(n, DIM)) uiSetDim(null); // U19: de selectie verlaat de focus (omhoog, breadcrumb, ander deel): de rest komt terug
  SEL = n;
  applyMats();
  renderPanel();
  if (opts.focus) focusNodes([SEL], null, SEL.asm ? 1.1 : 1.6, { min: 0.3 });
  if (treeVisible()) renderTree();
  uiSyncExplode();
  requestRender();
}
function renderPanel() {
  const n = SEL || ROOT;
  els.crumbs.innerHTML = '';
  ancestors(n).forEach((a, i) => {
    if (i) { const sp = document.createElement('span'); sp.textContent = '›'; els.crumbs.appendChild(sp); }
    const b = document.createElement('button'); b.textContent = a.name; b.onclick = () => { uiPush(); select(a, { focus: true }); uiAfterAction(); }; els.crumbs.appendChild(b);
  });
  // U6: de live regions (#selName, #selMeta) alleen beschrijven als er iets verandert; een schermlezer leest anders elke
  // herhaalde opbouw van het paneel voor (bij elke handeling twee tot drie keer)
  if (els.name.textContent !== n.name) els.name.textContent = n.name;
  let state;
  if (OPENMODE && n.opn && !n.opn.lead) state = n.ot > 0 ? '<span class="state open">Open</span>' : '<span class="state">Dicht</span>';
  else if (OPENMODE && n.asm) state = '<span class="state">Gemonteerd</span>';
  else if (n.asm) state = uiOpen(n) ? '<span class="state open">Uitgeklapt</span>' : (n.target > 0 ? '<span class="state">Deels uitgeklapt</span>' : '<span class="state">Ingeklapt</span>');
  else state = n === uiLifted ? '<span class="state open">Uitgelicht</span>' : '<span class="state">Onderdeel</span>';
  const isoTxt = ISO.includes(n) ? ' · geïsoleerd' : '';
  const meta = `${state}${n.asm ? fmtCount(n) : (n.parent ? 'in ' + esc(n.parent.name) : '')}${isoTxt}`;
  if (els.meta._h !== meta) { els.meta._h = meta; els.meta.innerHTML = meta; }
  // in Openen krijgt de wortel een eigen uitleg bij de modus (U7: een eigen tekst, geen knip uit de beschrijving in systems.js)
  els.desc.textContent = (OPENMODE && n === ROOT) ? uiOpenRootDesc : (n.d || '');
  els.spec.innerHTML = (n.spec || []).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
  els.spec.hidden = !n.spec;
  els.kids.innerHTML = '';
  els.kidsTitle.hidden = !n.asm;
  renderPn(n);
  if (n.asm) {
    els.kidsTitle.textContent = `Bestaat uit (${n.kids.length})`;
    const MAXK = 80;
    n.kids.slice(0, MAXK).forEach((k, i) => {
      const b = document.createElement('button');
      b.innerHTML = `<b>${i + 1}</b>${esc(k.name)}`;
      b.onclick = () => reveal(k);
      els.kids.appendChild(b);
    });
    if (n.kids.length > MAXK) {
      const b = document.createElement('button'); b.textContent = `… en nog ${n.kids.length - MAXK} (zie Onderdelen)`;
      b.onclick = () => { showTab('tree'); if (uiSheetBottom()) setSheet('open'); };
      els.kids.appendChild(b);
    }
  }
  const plan = OPENMODE ? uiPanelPlan(n) : null;
  els.open.hidden = !plan;
  if (plan) { els.open.textContent = plan.open ? 'Openen' : 'Sluiten'; els.open.setAttribute('aria-label', (plan.open ? 'Openen: ' : 'Sluiten: ') + uiOpenLabel(plan.n)); els.open.title = (plan.open ? 'Opent ' : 'Sluit ') + uiOpenLabel(plan.n) + ' (Enter)'; }
  // in Openen is er niets uit te klappen of te isoleren: alleen de opener en In beeld blijven
  els.toggle.hidden = !n.asm || OPENMODE;
  els.toggle.textContent = n.asm && uiOpen(n) ? 'Inklappen' : 'Uitklappen';
  els.all.hidden = !n.asm || OPENMODE;
  els.dive.hidden = n.asm || OPENMODE;
  els.dim.hidden = !DIM || OPENMODE;
  if (DIM) els.dim.title = 'De gedimde rest van het toestel weer volledig tonen (buiten ' + DIM.name + ')';
  els.up.hidden = OPENMODE; els.iso.hidden = OPENMODE;
  els.up.disabled = !uiClosedAbove(n);
  els.up.title = els.up.disabled ? 'Alles boven deze selectie is al uitgeklapt' : 'De dichte groep boven de selectie uitklappen (Enter)';
  const isoOn = ISO.length === 1 && ISO[0] === n;
  els.iso.textContent = isoOn || (ISO.length && n === ROOT) ? 'Alles tonen' : 'Isoleren';
  els.iso.disabled = n === ROOT && !ISO.length;
  syncSheetHeight();
  uiUiDirty = true;
}
/* ---------- onderdeelnummers ---------- */
// Gegevens uit PN_DATA (src/partnumbers.js). map: pad zonder wortel -> [eenheid, 'zelf' | 'deel' | 'set', regel].
// 'zelf': het onderdeel is zelf de verkoopeenheid; 'deel' of 'set': het zit in de eenheid en wordt daarmee besteld.
// Een knoop zonder regel is niet onderzocht. De pagina toont alleen wat er staat en voegt zelf geen nummers toe.
let uiPnIdx = new Map(), uiPnUnitNode = new Map(), uiPnBad = [], uiPnCov = new Map();
const UI_LINK_REL = 'noopener noreferrer'; // R5: cataloguslinks zonder opener en zonder verwijzende pagina (Referer)
const uiPnCompact = t => String(t).toLowerCase().replace(/[\s.\-\/]/g, '');
const uiPnHasNum = r => !!r && ((r.u.oe && r.u.oe.length > 0) || (r.u.am && r.u.am.length > 0));
function uiPnBuild() {
  uiPnIdx = new Map(); uiPnUnitNode = new Map(); uiPnBad = []; uiPnCov = new Map();
  // paden opzoeken in een vaste tabel: een naam kan zelf een schuine streep bevatten (ABS/ESP-unit)
  const full = new Map(ALL.map(k => [uiPathOf(k).replace(/^[^/]+\//, ''), k]));
  for (const [path, e] of Object.entries(PN_DATA.map || {})) {
    const n = full.get(path) || uiByPath(path), id = Array.isArray(e) ? e[0] : null, u = id != null && PN_DATA.units ? PN_DATA.units[id] : null;
    if (!n) { uiPnBad.push(path + ': pad bestaat niet'); continue; }
    if (!u) { uiPnBad.push(path + ': eenheid ' + id + ' ontbreekt'); continue; }
    const kind = e[1] === 'deel' || e[1] === 'set' ? e[1] : 'zelf';
    const q = [...(u.oe || []).map(x => x[0]), ...(u.am || []).map(x => x[1])].map(uiPnCompact).join(' ');
    uiPnIdx.set(n, { id, kind, rule: e[2] || '', u, q });
    if (kind === 'zelf' && !uiPnUnitNode.has(id)) uiPnUnitNode.set(id, n);
  }
}
function uiPnCheck() { return uiPnBad.slice(); }
function uiPnRec(n) { return uiPnIdx.get(n) || null; }
// aantal onderdelen onder n waarvoor een nummer bekend is (een eenheid met nummer telt voor al haar onderdelen)
function uiPnCover(n) {
  let c = uiPnCov.get(n);
  if (c != null) return c;
  const r = uiPnRec(n);
  c = uiPnHasNum(r) ? n.count : (n.asm ? n.kids.reduce((a, k) => a + uiPnCover(k), 0) : 0);
  uiPnCov.set(n, c);
  return c;
}
function renderPn(n) {
  const box = $('pnBody'), mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  box.textContent = '';
  const r = uiPnRec(n), u = r && r.u, st = mk('p', 'pn-status');
  let badge, ok = false;
  if (r && r.kind === 'zelf' && u.st === 'past') { badge = 'Past volgens catalogus'; ok = true; }
  else if (r && r.kind === 'zelf' && u.st === 'model') badge = u.kz ? 'Gekozen voor dit toestel' : 'Variant: kies op modelcode en kleur';
  else if (r && r.kind === 'zelf' && u.st === 'nietgevonden') badge = 'Niet gevonden';
  else if (r && r.kind !== 'zelf') badge = r.kind === 'set' ? 'Deel van set' : 'Deel van';
  else if (!n.asm || uiPnCover(n) === 0) badge = 'Niet onderzocht';
  if (badge) st.appendChild(mk('span', 'state' + (ok ? ' ok' : ''), badge));
  if (r && r.kind !== 'zelf') {
    const un = uiPnUnitNode.get(r.id);
    if (un && un !== n) { const b = mk('button', null, u.n || un.name); b.type = 'button'; b.onclick = () => reveal(un); st.appendChild(b); }
    else st.appendChild(mk('b', null, u.n || r.id));
    if (r.rule) st.appendChild(mk('small', null, r.rule));
  } else if (r && u.n && u.n !== n.name) st.appendChild(mk('small', null, u.n));
  if (n.asm) {
    const sub = n.kids.reduce((a, k) => a + uiPnCover(k), 0);
    if (sub > 0) st.appendChild(mk('small', null, `Hieronder hebben ${sub} van ${n.count} onderdelen een nummer.`));
  }
  box.appendChild(st);
  const kz = r && r.kind === 'zelf' && u.kz;
  if (kz) {
    // De uitvoering voor het toestel van de gebruiker (kleur en geheugen; zie build_pn.py). IMEI en serienummer staan nooit in de gegevens.
    box.appendChild(mk('h4', null, 'Gekozen voor dit toestel'));
    const k = mk('div', 'pn-kzbox');
    k.appendChild(mk('p', 'pn-txt', kz.v));
    const gek = [...(kz.o || []), ...(kz.a || []).map(x => x[0] + ' ' + x[1])];
    if (gek.length) k.appendChild(mk('p', 'pn-txt', 'Nummer: ' + gek.join(', ') + '. Bewijs ' + kz.b + ', zekerheid van de keuze ' + kz.z + '.'));
    k.appendChild(mk('p', 'pn-txt', kz.g));
    const bronnen = (kz.s || []).filter(x => /^https:\/\//i.test(x));
    if (bronnen.length) {
      const d = mk('div', 'pn-src');
      for (const url of bronnen) { const a = mk('a', null, url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]); a.href = url; a.target = '_blank'; a.rel = UI_LINK_REL; d.appendChild(a); }
      k.appendChild(d);
    }
    if (PN_DATA.meta && PN_DATA.meta.toestel) k.appendChild(mk('small', null, PN_DATA.meta.toestel));
    box.appendChild(k);
  }
  const isKz = (oe, am) => !!kz && (oe != null ? (kz.o || []).includes(oe) : (kz.a || []).some(x => x[0] === am[0] && x[1] === am[1]));
  if (uiPnHasNum(r)) {
    const head = (txt) => box.appendChild(mk('h4', null, txt));
    if (u.oe && u.oe.length) {
      head(r.kind === 'zelf' ? (u.oe.length > 1 ? 'Samsung-servicenummers' : 'Samsung-servicenummer') : 'Samsung-servicenummer van ' + (u.n || r.id));
      const ul = mk('ul', 'pn-nums');
      for (const [num, note, lvl] of u.oe) { const li = mk('li'); if (isKz(num)) li.className = 'pn-kz'; li.appendChild(mk('b', null, num)); if (isKz(num)) li.appendChild(mk('em', null, 'gekozen')); if (lvl) li.appendChild(uiPnLvl(mk, lvl)); if (note) li.appendChild(mk('span', null, note)); ul.appendChild(li); }
      box.appendChild(ul);
    }
    if (u.am && u.am.length) {
      head('Andere fabrikanten');
      const t = mk('table', 'pn-tab'), hr = t.createTHead().insertRow();
      for (const h of ['Merk', 'Nummer', 'Bewijs', 'Opmerking']) hr.appendChild(mk('th', null, h));
      const tb = t.createTBody();
      for (const [merk, num, note, lvl] of u.am) { const tr = tb.insertRow(); if (isKz(null, [merk, num])) tr.className = 'pn-kz'; tr.appendChild(mk('td', null, merk)); tr.appendChild(mk('td', 'num', num)); const td = mk('td'); if (lvl) td.appendChild(uiPnLvl(mk, lvl)); tr.appendChild(td); const tn = mk('td', null, note || ''); if (tr.className === 'pn-kz') tn.appendChild(mk('em', null, (note ? ' ' : '') + 'gekozen')); tr.appendChild(tn); }
      box.appendChild(t);
    }
    box.appendChild(mk('p', 'pn-txt', 'Bewijs: A staat in een servicecatalogus van Samsung voor dit model; B is een Samsung-servicenummer dat minstens twee onafhankelijke onderdelenleveranciers voor dit model noemen; C noemt één leverancier; D komt alleen uit een advertentie voor een gebruikt onderdeel of een teardown.'));
  }
  if (u && u.var) { box.appendChild(mk('h4', null, kz ? 'Varianten in de catalogus' : 'Variant')); box.appendChild(mk('p', 'pn-txt', u.var)); }
  if (u && u.per) { box.appendChild(mk('h4', null, 'Verpakking')); box.appendChild(mk('p', 'pn-txt', u.per)); }
  const links = u && (u.src || []).filter(x => x && /^https?:\/\//i.test(x[0]));
  if (links && links.length) {
    box.appendChild(mk('h4', null, 'Bronnen'));
    const d = mk('div', 'pn-src');
    for (const [url, label] of links) { const a = mk('a', null, label || url); a.href = url; a.target = '_blank'; a.rel = UI_LINK_REL; d.appendChild(a); }
    box.appendChild(d);
  }
  if (u && u.info && u.info.length) {
    box.appendChild(mk('h4', null, 'Onderhoud'));
    const dl = mk('dl', 'pn-info');
    for (const [label, waarde, bron] of u.info) { dl.appendChild(mk('dt', null, label)); const dd = mk('dd', null, waarde); if (bron) dd.appendChild(mk('small', null, bron)); dl.appendChild(dd); }
    box.appendChild(dl);
  }
  const inf = PN_DATA.info && PN_DATA.info[uiPathOf(n).replace(/^[^/]+\//, '')];
  if (inf && inf.length) {
    box.appendChild(mk('h4', null, 'Onderhoud en bekende problemen'));
    const dl = mk('dl', 'pn-info');
    for (const [label, waarde, bron, zeker] of inf) {
      dl.appendChild(mk('dt', null, label));
      const dd = mk('dd', null, waarde);
      if (bron || zeker) { const sm = mk('small', null, (zeker ? zeker + (bron ? ', ' : '') : '')); if (bron && /^https?:\/\//i.test(bron)) { const a = mk('a', null, 'bron'); a.href = bron; a.target = '_blank'; a.rel = UI_LINK_REL; sm.appendChild(a); } else if (bron) sm.appendChild(document.createTextNode(bron)); dd.appendChild(sm); }
      dl.appendChild(dd);
    }
    box.appendChild(dl);
  }
  if (PN_DATA.meta && PN_DATA.meta.checked && (r || n.asm)) box.appendChild(mk('p', 'pn-txt', 'Gegevens gecontroleerd op ' + PN_DATA.meta.checked + '.'));
}
function uiPnLvl(mk, lvl) {
  const e = mk('span', 'pn-lvl', lvl);
  e.title = { A: 'In een servicecatalogus van Samsung voor dit model', B: 'Bij minstens twee onafhankelijke onderdelenleveranciers voor dit model', C: 'Bij één onderdelenleverancier', D: 'Alleen uit een advertentie voor een gebruikt onderdeel of een teardown' }[lvl] || '';
  return e;
}

// Na elke gebruikershandeling: paneel, boom, schuif, presetknoppen en stap-terug bijwerken.
// I5/I6: schakelaars en spreidingsschuif volgen de stand ook na presets, stap terug en de rondleiding
function uiSyncToggles() {
  $('tXray').checked = XRAY; $('tSys').checked = SYSCOL; els.legend.hidden = !SYSCOL;
  const sp = Math.round(SPREAD * 100); $('spread').value = String(sp); $('spreadOut').textContent = sp + '%';
}
function uiAfterAction() {
  renderPanel();
  if (treeVisible()) renderTree();
  uiSyncExplode(); uiSyncCats(); uiSyncUndo(); uiSyncToggles(); uiSyncOpenUi(); uiSyncIso();
  applyMats(); // I3: geen gele selectietint meer op een groep die open is gegaan
  uiHideTip();
  uiSyncLabels();
  uiUrlSync();
  requestRender();
}
// Labels direct bijwerken (niet pas bij het volgende frame), zodat er nooit een label van een vorige stand blijft staan.
function uiSyncLabels() {
  if (!uiReady) return;
  ROOT.obj.updateMatrixWorld(); camera.updateMatrixWorld();
  updateLabels();
}
function uiAfterUndo() { applyMats(); uiAfterAction(); }
function clearPreset() { if (ACTIVE_PRESET) { ACTIVE_PRESET = null; uiSyncCats(); } }

/* ---------- handelingen ---------- */
// Klik op onderdeel P (modus Onderdeel): is de eigen groep G dicht, dan klapt alleen G ter plekke uit;
// staat G al open, dan wordt P geselecteerd en uitgelicht. Een klik klapt nooit een groep boven G uit.
function uiAct(p) {
  if (!p) { uiBackground(); return; }
  if (OPENMODE) { uiOpenAct(p); return; }
  if (p.asm) { // label of lijst van een groep
    if (MODE === 'collapse') { if (uiOpen(p)) doCollapse(p); else { uiPush(); select(p); uiAfterAction(); } return; }
    if (MODE === 'select' || uiOpen(p)) { uiPush(); select(p); uiAfterAction(); return; }
    doExplode(p); return;
  }
  if (MODE === 'collapse') { uiCollapseAt(p); return; }
  if (MODE === 'select') { uiPush(); select(p); uiAfterAction(); return; }
  const g = MODE === 'layers' ? pathFrom(p).find(x => x.asm && !uiOpen(x)) : (uiOpen(p.parent) ? null : p.parent);
  if (g) { doExplode(g); return; }
  uiPush(); select(p); uiLift(p); uiAfterAction();
}
function tapNode(n) { uiAct(n); }
function doExplode(g) {
  uiPush();
  setTarget(g, 1); updateGround();
  CTX = g; uiLabelForce = false; clearPreset();
  select(g);
  uiSoftFrame([g]);
  uiAfterAction();
}
function doCollapse(a) {
  uiPush();
  collapseTree(a); updateGround(); // I4: de vloer volgt de eindstand
  CTX = a.parent && uiOpen(a.parent) ? a.parent : null; uiLabelForce = false; clearPreset();
  select(a);
  uiAfterAction();
}
function uiCollapseAt(p) {
  if (OPENMODE) { uiOpenClose(p); return; }
  const a = uiDeepestOpen(p);
  if (a) { doCollapse(a); return; }
  uiPush(); select(p); uiAfterAction();
}
function uiBackground() {
  const r = uiScopeRoot();
  if (SEL === r && !uiLifted) return;
  uiPush(); uiDrop(); select(r); uiAfterAction();
}
// Dubbelklik: alle dichte groepen op het pad van de isolatiewortel (of de auto) tot en met de ouder van P openen, laag voor laag.
function uiDive(p) {
  if (!p) return;
  uiPush();
  let i = 0;
  for (const a of pathFrom(p)) if (a.asm && a !== p && !uiOpen(a)) setTarget(a, 1, (i++) * (REDUCED ? 0 : 0.22));
  CTX = p.parent || p; uiLabelForce = false; clearPreset();
  if (!OPENMODE) uiSetDim(p); // U19
  select(p);
  focusNodes([p], null, p.asm ? 1.15 : 1.7, { min: 0.3, dur: Math.max(0.95, i * 0.22 + 0.55) });
  uiAfterAction();
}
function reveal(n) {
  if (OPENMODE) { // in Openen klapt niets uit: alleen selecteren en in beeld brengen
    uiPush();
    if (uiSheetBottom() && els.sheet.dataset.state === 'open') setSheet('peek');
    select(n);
    focusNodes([n], null, n.asm ? 1.12 : 1.6, { min: 0.3 });
    uiAfterAction();
    return;
  }
  uiPush();
  if (ISO.length && !uiInScope(n)) { ISO = []; applyVisibility(); updateGround(); }
  let i = 0;
  for (const a of ancestors(n)) if (!uiOpen(a)) setTarget(a, 1, (i++) * (REDUCED ? 0 : 0.18));
  CTX = n.parent || null; uiLabelForce = false; clearPreset();
  uiSetDim(n); // U19 (de wortel zet het uit)
  // telefoon: paneel terug naar de smalle stand, zodat je ziet wat er gebeurt
  if (uiSheetBottom() && els.sheet.dataset.state === 'open') setSheet('peek');
  select(n);
  focusNodes([n], null, n.asm ? 1.12 : 1.6, { min: 0.3, dur: Math.max(0.95, i * 0.18 + 0.55) });
  uiAfterAction();
}
function uiUp() {
  const a = SEL && uiClosedAbove(SEL);
  if (a) doExplode(a);
}
// Kadreren na een klik: alleen bewegen als de groep niet (goed) in beeld is.
function uiSoftFrame(nodes) {
  const pts = uiCollect(nodes, true);
  if (!pts.length) return;
  const b = uiProject(pts), v = uiFreeView();
  const inside = b && b.x0 >= v.x0 && b.x1 <= v.x1 && b.y0 >= v.y0 && b.y1 <= v.y1;
  const cover = b ? ((b.x1 - b.x0) * (b.y1 - b.y0)) / Math.max(1, (v.x1 - v.x0) * (v.y1 - v.y0)) : 0;
  if (inside && cover > 0.06) return;
  const f = uiFitPoints(pts, null, 1.3, { min: 0.45 });
  if (f) { animCam(f.pos, f.target, 0.9); uiLastFit = { nodes, dir: null, pad: 1.3, opt: { min: 0.45 } }; }
}
const uiPv = V3(0, 0, 0);
function uiProject(pts) {
  camera.updateMatrixWorld();
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < pts.length; i += 3) {
    uiPv.set(pts[i], pts[i + 1], pts[i + 2]).project(camera);
    if (uiPv.z > 1) return null;
    const x = (uiPv.x * 0.5 + 0.5) * W, y = (-uiPv.y * 0.5 + 0.5) * H;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return Number.isFinite(x0) ? { x0, y0, x1, y1 } : null;
}
function uiFreeView() { return { x0: VIEW.l, y0: VIEW.t, x1: W - VIEW.r, y1: H - VIEW.b }; }
// U4: isoleren met een korte fade van wat uit beeld gaat (uiFadeFrom in app1.js) en de badge in het dock (uiSyncIso)
function isolate(list) {
  uiSetDim(null);
  const before = uiVisibleMeshes();
  ISO = list.slice(); applyVisibility(); uiFadeFrom(before); applyMats(); updateGround(); uiSyncIso(); requestRender();
}
function uiSyncIso() {
  const on = ISO.length > 0, txt = ISO.map(n => n.name).join(' en ');
  if (els.isoBadge.hidden !== !on) { els.isoBadge.hidden = !on; uiUiChanged(); layoutView(); }
  if (on && els.isoName.textContent !== txt) { els.isoName.textContent = txt; uiUiDirty = true; }
}
$('isoShowAll').onclick = () => $('btnShowAll').click();

els.toggle.onclick = () => { const n = SEL; if (!n.asm) return; uiOpen(n) ? doCollapse(n) : doExplode(n); };
els.all.onclick = () => { const n = SEL; if (!n.asm) return; uiPush(); explodeAllUnder(n); CTX = n; uiLabelForce = false; clearPreset(); focusNodes([n], null, 1.04); uiAfterAction(); };
els.up.onclick = uiUp;
els.dim.onclick = () => { uiPush(); uiSetDim(null); uiAfterAction(); };
els.dive.onclick = () => uiDive(SEL);
els.iso.onclick = () => {
  uiPush();
  const on = ISO.length && (ISO.includes(SEL) || SEL === ROOT);
  isolate(on ? [] : [SEL]); clearPreset();
  focusNodes(on ? [ROOT] : [SEL]);
  uiAfterAction();
};
els.focus.onclick = () => { focusNodes([SEL], null, SEL.asm ? 1.08 : 1.6, { min: 0.25 }); };

/* ---------- openmodus: bediening ---------- */
// Openers (OPENERS in app1.js) draaien of schuiven open. In de modus Openen doet een klik dat in plaats van uitklappen.
// Klikregel: neem de openers op het pad van het geraakte onderdeel, van buiten naar binnen (volgers tellen als hun leider).
// De eerste dichte opener gaat open; zijn ze allemaal open, dan sluit de binnenste. Een klik op de ruit van een dicht
// portier opent dus het portier, daarna de ruit; een tweede klik op de ruit sluit de ruit weer. Rechtsklik, Shift+klik en
// lang drukken sluiten de binnenste open opener op het pad. Ingang: alles dicht (Gemonteerd); uitgang: alle openers dicht.
const uiOpenLabel = n => (n.opn && n.opn.label) || n.name;
function uiOpenPath(p) {
  const chain = []; for (let a = p; a; a = a.parent) chain.unshift(a);
  const out = [];
  for (const a of chain) if (a.opn) { const l = a.opn.lead || a; if (!out.includes(l)) out.push(l); }
  return out;
}
// wat een klik op p nu doet: { n: de opener, open: true om te openen, false om te sluiten } of null
function uiOpenPlan(p) {
  const list = p ? uiOpenPath(p) : [];
  if (!list.length) return null;
  const closed = list.find(n => n.ot === 0);
  return closed ? { n: closed, open: true } : { n: list[list.length - 1], open: false };
}
// paneel en Enter: staat de selectie zelf voor een opener (een leider), dan werkt de knop op die opener, ook als een
// buitenste opener dicht is (de knop past dan bij de badge Open of Dicht); bij een ander onderdeel geldt de klikregel
function uiPanelPlan(p) {
  if (p && p.opn && !p.opn.lead) return { n: p, open: p.ot === 0 };
  return uiOpenPlan(p);
}
// camera bij openen: richting en kader uit open.look, het kader in de eindstand (focusNodes rekent de doelstand mee)
function uiOpenFrame(nodes, dir, pad) { focusNodes(nodes, dir, pad, { min: 0.3 }); }
function uiOpenTo(n, open) {
  uiStopPlay(); uiStopTour(); hideHint();
  uiPush();
  uiSetOpen(n, open ? 1 : 0);
  clearPreset(); CTX = null; uiLabelForce = false;
  select(n); // eerst het paneel: de kaart wordt bij een selectie hoger en het vrije beeld rekent met zijn werkelijke hoogte
  if (open) { // bij sluiten beweegt de camera niet
    if (uiSheetBottom()) { syncSheetHeight(); layoutView(); }
    const lk = n.opn.look || {}, nodes = (lk.nodes || []).map(r => uiRef(r, n.name)).filter(Boolean);
    uiOpenFrame(nodes.length ? nodes : [n], lk.dir ? V3(...lk.dir) : null, 1.1);
  }
  uiAfterAction();
}
function uiOpenAct(p) {
  const pl = uiOpenPlan(p);
  if (pl) uiOpenTo(pl.n, pl.open);
  else { uiPush(); select(p); uiAfterAction(); }
}
function uiOpenClose(p) {
  const open = p ? uiOpenPath(p).filter(n => n.ot > 0) : [];
  if (open.length) uiOpenTo(open[open.length - 1], false);
  else if (p) { uiPush(); select(p); uiAfterAction(); }
}
function uiOpenAllTo(v) {
  uiStopPlay(); uiStopTour(); hideHint();
  uiPush();
  for (const n of OPENERS) uiSetOpen(n, v ? 1 : 0);
  clearPreset();
  if (v) uiOpenFrame([ROOT], DIRS.iso, 1.04);
  uiAfterAction();
}
function uiSetOpenMode(on) {
  on = !!on;
  if (on === OPENMODE) return;
  uiStopPlay(); uiStopTour();
  uiPush();
  if (on) {
    appApplyPreset(appPresetById.get('assembled'), { noHistory: true, openMode: true });
  } else {
    OPENMODE = false;
    for (const n of OPENERS) uiSetOpen(n, 0);
  }
  clearPreset();
  uiUiChanged();
  uiAfterAction();
}
const uiOpenBtns = [...document.querySelectorAll('#openSeg [data-omode]')];
uiOpenBtns.forEach((b, i) => {
  b.addEventListener('click', () => { hideHint(); uiSetOpenMode(b.dataset.omode === 'open'); });
  b.addEventListener('keydown', e => { if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return; const j = (i + (e.key === 'ArrowRight' ? 1 : uiOpenBtns.length - 1)) % uiOpenBtns.length; uiSetOpenMode(uiOpenBtns[j].dataset.omode === 'open'); uiOpenBtns[j].focus(); e.preventDefault(); });
});
$('btnOpenAll').onclick = () => uiOpenAllTo(true);
$('btnCloseAll').onclick = () => uiOpenAllTo(false);
els.open.onclick = () => { const pl = uiPanelPlan(SEL); if (pl) uiOpenTo(pl.n, pl.open); };
// openerlijst: een knop per opener (aria-pressed = open), bereikbaar met toetsenbord en schermlezer
const uiOpenChips = OPENERS.map(n => {
  const b = document.createElement('button');
  b.type = 'button'; b.textContent = uiOpenLabel(n); b.setAttribute('aria-pressed', 'false');
  b.onclick = () => { uiCloseOpenList(); uiOpenTo(n, n.ot === 0); };
  $('openList').appendChild(b);
  return [n, b];
});
let uiOpenListOn = false;
$('btnOpenList').onclick = () => {
  uiOpenListOn = !uiOpenListOn; $('btnOpenList').setAttribute('aria-expanded', String(uiOpenListOn)); uiSyncOpenUi(); uiUiChanged(); layoutView();
  if (window.innerWidth < 920) uiRefitSoon(); // de lijst neemt vrij beeld in of geeft het terug: de auto past in wat overblijft
};
// Op een smal scherm (telefoon staand en liggend, tablet) is de lijst een keuzemenu: na een keuze gaat hij dicht, zodat hij het
// beeld niet afdekt en het vrije beeld weer de volle hoogte heeft voordat de camera de opener kadreert. Op het bureaublad
// staat hij naast het beeld en blijft open.
function uiCloseOpenList() {
  if (!uiOpenListOn || window.innerWidth >= 920) return;
  uiOpenListOn = false; $('btnOpenList').setAttribute('aria-expanded', 'false'); uiSyncOpenUi(); uiUiChanged(); layoutView();
}
function uiSyncOpenUi() {
  uiUrlSync(); // de adresbalk volgt de openstand (ook via de testhaken setOpen en openAll)
  $('app').classList.toggle('omode', OPENMODE);
  uiOpenBtns.forEach(b => { const on = (b.dataset.omode === 'open') === OPENMODE; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
  let open = 0;
  for (const [n, b] of uiOpenChips) { const on = n.ot > 0; if (on) open++; if (b.getAttribute('aria-pressed') !== String(on)) b.setAttribute('aria-pressed', String(on)); }
  const txt = open + '/' + OPENERS.length;
  if ($('openCount').textContent !== txt) $('openCount').textContent = txt;
  const showList = OPENMODE && uiOpenListOn;
  if ($('openList').hidden === showList) $('openList').hidden = !showList;
  if (uiOpenWas !== OPENMODE) { uiOpenWas = OPENMODE; uiUiChanged(); layoutView(); }
}
let uiOpenWas = false;

/* ---------- onderdelenboom ---------- */
const openRows = new Set([ROOT.id]);
function treeVisible() { return !$('tab-tree').hidden && (!uiSheetBottom() || els.sheet.dataset.state === 'open'); }
function treeRow(n, level) {
  const li = document.createElement('li'); li.setAttribute('role', 'none');
  const row = document.createElement('div'); row.className = 'trow' + (n === SEL ? ' sel' : ''); row.setAttribute('role', 'treeitem'); row.setAttribute('aria-level', String(level)); row.setAttribute('aria-selected', String(n === SEL));
  const tw = document.createElement('button'); tw.className = 'tw';
  if (n.asm) { const op = openRows.has(n.id); row.setAttribute('aria-expanded', String(op)); tw.textContent = op ? '▾' : '▸'; tw.setAttribute('aria-label', op ? 'Inklappen in lijst' : 'Uitklappen in lijst'); tw.onclick = () => { op ? openRows.delete(n.id) : openRows.add(n.id); renderTree(); }; } else { tw.tabIndex = -1; tw.setAttribute('aria-hidden', 'true'); }
  const dot = document.createElement('span'); dot.className = 'dot' + (uiOpen(n) ? ' open' : ''); if (!n.asm) dot.style.visibility = 'hidden';
  dot.title = uiOpen(n) ? 'uitgeklapt' : 'ingeklapt';
  const nm = document.createElement('button'); nm.className = 'tn'; nm.textContent = n.name; nm.onclick = () => reveal(n);
  const c = document.createElement('span'); c.className = 'tc'; c.textContent = n.asm ? n.count : '';
  row.append(tw, dot, nm, c); li.appendChild(row);
  if (n.asm && openRows.has(n.id)) { const ul = document.createElement('ul'); ul.setAttribute('role', 'group'); n.kids.forEach(k => ul.appendChild(treeRow(k, level + 1))); li.appendChild(ul); }
  return li;
}
// U10: synoniemen. Een zoekterm die een woord uit een groep bevat, zoekt ook met de andere woorden van die groep
// ("accu" vindt de Batterij, "usb-c" ook de laadpoort). Vergelijken gebeurt op uiNorm (app1.js):
// kleine letters zonder diakrieten, zodat "Röntgen", "rontgen" en "RONTGEN" hetzelfde zijn.
const uiSynonyms = [
  ['accu', 'batterij'], ['display', 'scherm'], ['moederbord', 'logicabord', 'printplaat'], ['vapor chamber', 'dampkamer', 'koelplaat'],
  ['simlade', 'sim-lade', 'simkaarthouder'], ['speaker', 'luidspreker'], ['laadpoort', 'usb-c', 'oplaadpoort'], ['stylus', 's pen'],
  ['achterglas', 'achterkant', 'backcover'], ['selfiecamera', 'frontcamera'], ['vingerafdruk', 'fingerprint'], ['trilmotor', 'vibratiemotor'],
];
// alle zoektermen voor q: q zelf en elke variant waarin een synoniem is ingevuld; terms[0] is q
function uiSearchTerms(q) {
  q = uiNorm(q).trim();
  const terms = [q];
  if (!q) return terms;
  for (const group of uiSynonyms) for (const w of group) if (q.includes(w)) for (const o of group) { if (o === w) continue; const v = q.replace(w, o); if (!terms.includes(v)) terms.push(v); }
  return terms;
}
function renderTree() {
  const terms = uiSearchTerms(els.search.value), q = terms[0];
  els.tree.innerHTML = '';
  const ul = document.createElement('ul');
  if (q.length >= 2) {
    const qn = uiPnCompact(q), byNum = qn.length >= 3 && /\d/.test(qn);   // een zoekterm met cijfers zoekt ook in de nummers
    const all = ALL.filter(n => terms.some(t => n.norm.includes(t)) || (byNum && (uiPnIdx.get(n) || { q: '' }).q.includes(qn))), hits = all.slice(0, 80);
    const syn = terms.length > 1 ? ` (ook gezocht op ${terms.slice(1).join(', ')})` : '';
    els.treeInfo.textContent = all.length ? (all.length === 1 ? '1 treffer' : `${all.length} treffers`) + syn + (all.length > hits.length ? `, de eerste ${hits.length} staan hieronder` : '') : 'Geen onderdeel gevonden met die naam' + syn + '.';
    hits.forEach(n => { const li = treeRow(n, 1); const small = document.createElement('div'); small.className = 'tpath'; small.textContent = ancestors(n).slice(1).map(a => a.name).join(' › ') || 'hele toestel'; li.appendChild(small); ul.appendChild(li); });
  } else {
    els.treeInfo.textContent = q.length === 1 ? 'Typ minstens twee letters.' : '';
    ul.appendChild(treeRow(ROOT, 1));
  }
  els.tree.appendChild(ul);
}
els.search.addEventListener('input', renderTree);

/* ---------- tabs en paneel (mobiel) ---------- */
function showTab(id) {
  ['info', 'tree', 'view'].forEach(t => { $('tab-' + t).hidden = t !== id; $('tabbtn-' + t).setAttribute('aria-selected', String(t === id)); $('tabbtn-' + t).tabIndex = t === id ? 0 : -1; });
  if (id === 'tree') { ancestors(SEL).forEach(a => openRows.add(a.id)); renderTree(); }
}
['info', 'tree', 'view'].forEach((t, i, arr) => {
  const b = $('tabbtn-' + t);
  b.addEventListener('click', () => showTab(t));
  b.addEventListener('keydown', e => { if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return; const j = (i + (e.key === 'ArrowRight' ? 1 : arr.length - 1)) % arr.length; showTab(arr[j]); $('tabbtn-' + arr[j]).focus(); e.preventDefault(); });
});
function setSheet(state) {
  if (uiSide()) state = 'open'; // zijkolom: altijd de volle inhoud, geen peek en geen lade
  els.sheet.dataset.state = state;
  $('sheetToggle').setAttribute('aria-expanded', String(state === 'open'));
  $('sheetToggle').setAttribute('aria-label', state === 'open' ? 'Paneel kleiner maken' : 'Paneel groter maken');
  $('btnParts').setAttribute('aria-pressed', String(state === 'open' && !$('tab-tree').hidden));
  $('btnView').setAttribute('aria-pressed', String(state === 'open' && !$('tab-view').hidden));
  syncSheetHeight(); layoutView(); uiRefitSoon();
  if (treeVisible()) renderTree();
}
// Draaien of formaat wisselen tussen lade en zijkolom: stand van het paneel en vrij beeld opnieuw bepalen
if (uiMqSide) { const f = () => { setSheet(uiSide() ? 'open' : 'peek'); }; uiMqSide.addEventListener ? uiMqSide.addEventListener('change', f) : uiMqSide.addListener(f); }
$('sheetToggle').onclick = () => setSheet(els.sheet.dataset.state === 'open' ? 'peek' : 'open');
$('btnParts').onclick = () => { const open = els.sheet.dataset.state === 'open' && !$('tab-tree').hidden; showTab('tree'); setSheet(open ? 'peek' : 'open'); };
$('btnView').onclick = () => { const open = els.sheet.dataset.state === 'open' && !$('tab-view').hidden; showTab('view'); setSheet(open ? 'peek' : 'open'); };
function syncSheetHeight() {
  if (uiSheetBottom()) document.getElementById('app').style.setProperty('--sheet-h', (els.sheet.dataset.state === 'open' ? 0 : els.sheet.offsetHeight) + 'px');
}

/* ---------- weergave-bediening ---------- */
$('spread').addEventListener('input', e => { uiSetSpread(e.target.value / 100, false); $('spreadOut').textContent = e.target.value + '%'; requestRender(); });
$('spread').addEventListener('change', () => { updateGround(); focusNodes(contextNodes()); });
$('tLabels').addEventListener('change', e => { LABELS = e.target.checked; requestRender(); });
$('tXray').addEventListener('change', e => { uiPush(); XRAY = e.target.checked; clearPreset(); applyMats(); uiAfterAction(); });
$('tSys').addEventListener('change', e => { uiPush(); SYSCOL = e.target.checked; clearPreset(); applyMats(); uiAfterAction(); });
$('tRotate').addEventListener('change', e => { controls.autoRotate = e.target.checked; requestRender(); });
els.quality.addEventListener('change', e => uiSetLite(!e.target.checked));
$('tDim').addEventListener('change', e => { uiDimOn = e.target.checked; if (!uiDimOn) uiSetDim(null); applyMats(); uiAfterAction(); });
$('tBatch').addEventListener('change', e => { uiSetBatching(e.target.checked); requestRender(); });
els.legend.innerHTML = Object.entries(SYS_COLORS).filter(([k]) => ROOT.kids.some(c => c.name === k)).map(([k, c]) => `<span><i style="background:#${c.toString(16).padStart(6, '0')}"></i>${esc(k)}</span>`).join('');
document.querySelectorAll('[data-cam]').forEach(b => b.addEventListener('click', () => focusNodes(contextNodes(), DIRS[b.dataset.cam])));
// U5: thema. 'system' volgt prefers-color-scheme (geen data-theme); 'light' en 'dark' staan op <html> en in localStorage.
// De MutationObserver op data-theme (hieronder bij thema) past lichten en vloer aan.
const uiThemeBtns = [...document.querySelectorAll('#themeSeg [data-theme]')];
function uiThemeChoice() { const t = document.documentElement.getAttribute('data-theme'); return t === 'light' || t === 'dark' ? t : 'system'; }
function uiSetTheme(t) {
  t = t === 'light' || t === 'dark' ? t : 'system';
  if (t === 'system') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t);
  try { if (t === 'system') window.localStorage.removeItem(UI_THEME_KEY); else window.localStorage.setItem(UI_THEME_KEY, t); } catch (_) { }
  uiSyncTheme();
}
function uiSyncTheme() {
  const cur = uiThemeChoice();
  uiThemeBtns.forEach(b => { const on = b.dataset.theme === cur; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
}
uiThemeBtns.forEach((b, i) => {
  b.addEventListener('click', () => uiSetTheme(b.dataset.theme));
  b.addEventListener('keydown', e => { if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return; const j = (i + (e.key === 'ArrowRight' ? 1 : uiThemeBtns.length - 1)) % uiThemeBtns.length; uiSetTheme(uiThemeBtns[j].dataset.theme); uiThemeBtns[j].focus(); e.preventDefault(); });
});
uiSyncTheme();
// U9: beeld opslaan en de kaart afdrukken
function uiSlug(s) { return uiNorm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'beeld'; }
function uiSaveImage() {
  const n = SEL || ROOT, r = uiPnRec(n), nums = r && r.kind === 'zelf' && r.u ? [...(r.u.oe || []).map(x => x[0]), ...(r.u.am || []).map(x => x[0] + ' ' + x[1])] : [];
  uiGroundSide();
  renderer.render(scene, camera); // op verzoek tekenen: de buffer wordt na het tonen niet bewaard
  const dpr = renderer.getPixelRatio(), w = canvas.width, h = canvas.height, bar = Math.round(44 * dpr);
  const c2 = document.createElement('canvas'); c2.width = w; c2.height = h + bar;
  const g = c2.getContext('2d');
  const cs = getComputedStyle(document.body);
  g.fillStyle = cs.backgroundColor || '#e5e9ed'; g.fillRect(0, 0, w, h + bar);
  g.drawImage(canvas, 0, 0);
  g.fillStyle = cs.color || '#151a21'; g.textBaseline = 'middle';
  g.font = `700 ${Math.round(15 * dpr)}px ${cs.fontFamily}`; g.fillText(n.name, Math.round(14 * dpr), h + bar / 2, w * 0.55);
  g.font = `${Math.round(12 * dpr)}px ${cs.fontFamily}`; g.textAlign = 'right';
  g.fillText((nums.length ? 'Onderdeelnummer ' + nums.slice(0, 2).join(', ') + ' · ' : '') + 'Galaxy S26 Ultra explosietekening, versie ' + uiVersion, w - Math.round(14 * dpr), h + bar / 2, w * 0.43);
  const name = `s26u-${uiSlug(n.name)}.png`;
  return new Promise(res => c2.toBlob(blob => {
    if (!blob) { uiToast('Het beeld kon niet worden opgeslagen.'); res(null); return; }
    const a = document.createElement('a'), url = URL.createObjectURL(blob);
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    uiToast('Beeld opgeslagen als ' + name);
    res({ name, w: c2.width, h: c2.height, numbers: nums });
  }, 'image/png'));
}
$('btnShot').onclick = () => { uiSaveImage(); };
$('btnPrint').onclick = () => { showTab('info'); try { window.print(); } catch (_) { } };
// korte melding onderin (U8, U9); een nieuwe vervangt de vorige
let uiToastTimer = 0;
function uiToast(txt) {
  els.toast.textContent = txt; els.toast.hidden = false; els.toast.classList.remove('gone');
  clearTimeout(uiToastTimer);
  uiToastTimer = setTimeout(() => { els.toast.classList.add('gone'); setTimeout(() => { if (els.toast.classList.contains('gone')) els.toast.hidden = true; }, REDUCED ? 0 : 300); }, UI_TOAST_MS);
}
// R2: melding die blijft staan tot ze wordt weggehaald (contextverlies)
function uiNotice(txt) { els.notice.hidden = !txt; els.notice.textContent = txt || ''; }
$('btnExplodeAll').onclick = () => { const r = uiScopeRoot(); uiPush(); explodeAllUnder(r); CTX = r; uiLabelForce = false; clearPreset(); focusNodes(contextNodes(), null, 1.02); uiAfterAction(); };
$('btnCollapseAll').onclick = () => { uiPush(); collapseAll(); uiDrop(); CTX = null; clearPreset(); focusNodes(contextNodes()); uiAfterAction(); };
$('btnShowAll').onclick = () => { uiPush(); isolate([]); clearPreset(); select(ROOT); focusNodes([ROOT]); uiAfterAction(); };
const uiModeBtns = [...document.querySelectorAll('#modes [data-mode]')];
function uiSetMode(m) {
  MODE = m;
  uiModeBtns.forEach(x => { const on = x.dataset.mode === m; x.setAttribute('aria-checked', String(on)); x.tabIndex = on ? 0 : -1; });
  uiSetHover(null); uiHideTip(); requestRender();
}
uiModeBtns.forEach((b, i) => {
  b.addEventListener('click', () => uiSetMode(b.dataset.mode));
  b.addEventListener('keydown', e => { if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return; const j = (i + (e.key === 'ArrowRight' ? 1 : uiModeBtns.length - 1)) % uiModeBtns.length; uiSetMode(uiModeBtns[j].dataset.mode); uiModeBtns[j].focus(); e.preventDefault(); });
});

/* ---------- explosieschuif en afspelen ---------- */
// Werkgroep: de geselecteerde groep, anders de enige geïsoleerde groep, anders de hele auto.
// Met L niveaus en x = waarde × L krijgt een groep op relatieve diepte r doel clamp(x − r, 0, 1).
function uiWorking() { if (SEL && SEL.asm) return SEL; if (ISO.length === 1) return ISO[0]; return ROOT; }
const uiLevelCache = new Map();
function uiLevels(w) {
  let L = uiLevelCache.get(w);
  if (!L) { L = []; for (const a of subtree(w)) if (a.asm) { const r = a.depth - w.depth; (L[r] || (L[r] = [])).push(a); } uiLevelCache.set(w, L); }
  return L;
}
function uiExplodeX(w) { let x = 0; for (const lv of uiLevels(w)) { let s = 0; for (const a of lv) s += a.target; x += s / lv.length; } return x; }
function uiApplyX(w, x, now) {
  uiLevels(w).forEach((lv, r) => { const t = clamp(x - r, 0, 1); for (const a of lv) now ? uiSetNow(a, t) : setTarget(a, t, 0, 0.6); });
  // Een opgetild onderdeel gaat terug zodra zijn groep dichtgaat, anders zweeft het buiten de gesloten auto.
  if (uiLifted && !uiOpen(uiLifted.parent)) uiDrop();
}
const uiFmt = (v, d = 1) => v.toFixed(d).replace('.', ',');
let uiDrag = false, uiPlayS = null;
function uiSyncExplode(fromSlider) {
  const w = uiWorking(), L = uiLevels(w).length, x = uiExplodeX(w), v = L ? x / L : 0;
  if (!fromSlider && !uiDrag) els.explode.value = String(Math.round(v * 1000));
  els.explodeOut.textContent = Math.round(v * 100) + '%';
  els.explode.setAttribute('aria-valuetext', `${uiFmt(x)} van ${L} ${L === 1 ? 'laag' : 'lagen'}`);
  if (els.explodeName.textContent !== w.name) { els.explodeName.textContent = w.name; uiUiDirty = true; }
  const lbl = uiPlayS ? 'Stop' : (v >= 0.999 ? 'Monteren' : 'Demonteren');
  if (els.play.lastChild.textContent !== lbl) { els.play.lastChild.textContent = lbl; els.play.setAttribute('aria-label', lbl); uiUiDirty = true; }
  els.play.setAttribute('aria-pressed', String(!!uiPlayS));
  els.play.firstChild.innerHTML = uiPlayS ? '<path d="M7 6h3v12H7zM14 6h3v12h-3z"/>' : (v >= 0.999 ? '<path d="M16 5L5 12l11 7z"/>' : '<path d="M8 5l11 7-11 7z"/>');
}
els.explode.addEventListener('input', () => {
  if (!uiDrag) { uiDrag = true; uiStopPlay(); uiStopTour(); hideHint(); uiPush(); uiSetDim(null); applyMats(); }
  const w = uiWorking(), L = uiLevels(w).length;
  uiApplyX(w, (els.explode.value / 1000) * L, true);
  CTX = w; uiLabelForce = false; clearPreset();
  uiSyncExplode(true); requestRender();
});
els.explode.addEventListener('change', () => { uiDrag = false; updateGround(); uiAfterAction(); });
function uiSetExplodeValue(v) {
  uiStopPlay(); uiPush(); uiSetDim(null);
  const w = uiWorking();
  uiApplyX(w, clamp(v, 0, 1) * uiLevels(w).length, false);
  CTX = w; uiLabelForce = false; clearPreset(); updateGround();
  uiAfterAction();
}
function uiPlay() {
  if (uiPlayS) { uiStopPlay(); return; }
  uiStopTour(); uiPush(); uiSetDim(null);
  const w = uiWorking(), L = uiLevels(w).length, x0 = uiExplodeX(w);
  const up = x0 / L < 0.999, x1 = up ? L : 0;
  uiPlayS = { w, x: x0, x1, v: (up ? 1 : -1) / 0.8 };
  CTX = w; uiLabelForce = false; clearPreset();
  // camera naar de eindstand
  const saved = []; uiLevels(w).forEach((lv, r) => lv.forEach(a => { saved.push([a, a.target]); a.target = clamp(x1 - r, 0, 1); }));
  try { focusNodes([w], null, 1.05, { dur: Math.min(2.5, Math.abs(x1 - x0) * 0.8) }); } finally { saved.forEach(([a, t]) => { a.target = t; }); }
  if (REDUCED) finishAll();
  uiAfterAction();
}
function uiStepPlay(dt) {
  const s = uiPlayS; if (!s) return false;
  s.x += s.v * dt;
  const done = s.v > 0 ? s.x >= s.x1 : s.x <= s.x1;
  if (done) s.x = s.x1;
  uiApplyX(s.w, s.x, true);
  if (done) { uiPlayS = null; updateGround(); uiAfterAction(); } else uiSyncExplode();
  return true;
}
function uiStopPlay() { if (!uiPlayS) return; uiPlayS = null; updateGround(); uiAfterAction(); }
els.play.onclick = uiPlay;
els.undo.onclick = () => { uiStopPlay(); uiStopTour(); uiUndo(); };
function uiSyncUndo() { els.undo.disabled = !uiHist.length; }

/* ---------- presets: categorieknoppen en menu ---------- */
let uiMenuCat = null, uiMenuBtn = null;
function uiBuildCats() {
  els.presets.innerHTML = '';
  for (const cat of appCats) {
    const list = PRESETS.filter(p => p.cat === cat && appPresetOk(p));
    if (!list.length) continue;
    const b = document.createElement('button');
    b.className = 'cat'; b.dataset.cat = cat; b.setAttribute('aria-haspopup', 'menu'); b.setAttribute('aria-expanded', 'false');
    b.tabIndex = els.presets.children.length ? -1 : 0; // U6: één tabstop voor de werkbalk, pijlen lopen erdoorheen
    b.innerHTML = `<b>${esc(cat)}</b><small></small>`;
    b.onclick = () => (uiMenuCat === cat ? uiCloseMenu(true) : uiOpenMenu(cat, b));
    b.addEventListener('keydown', e => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); uiOpenMenu(cat, b); } });
    b.addEventListener('focus', () => uiCatTabStop(b));
    els.presets.appendChild(b);
  }
  uiSyncCats();
}
function uiCatTabStop(b) { for (const c of els.presets.children) c.tabIndex = c === b ? 0 : -1; }
// pijlen links en rechts, Home en End in de werkbalk met presetcategorieën (role="toolbar")
els.presets.addEventListener('keydown', e => {
  if (!/^(ArrowLeft|ArrowRight|Home|End)$/.test(e.key)) return;
  const cats = [...els.presets.children], i = cats.indexOf(document.activeElement);
  if (i < 0 || !cats.length) return;
  const j = e.key === 'Home' ? 0 : e.key === 'End' ? cats.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : cats.length - 1)) % cats.length;
  e.preventDefault(); uiCatTabStop(cats[j]); cats[j].focus();
});
function uiSyncCats() {
  const p = ACTIVE_PRESET && appPresetById.get(ACTIVE_PRESET);
  for (const b of els.presets.children) {
    const cat = b.dataset.cat, n = PRESETS.filter(q => q.cat === cat && appPresetOk(q)).length;
    const on = !!p && p.cat === cat;
    b.classList.toggle('on', on);
    const txt = cat === 'Overzicht' && appTour ? 'Rondleiding loopt' : (on ? p.label : `${n} presets`);
    if (b.lastChild.textContent !== txt) { b.lastChild.textContent = txt; uiUiDirty = true; }
    b.setAttribute('aria-label', `${cat}${on ? ', actief: ' + p.label : ''}`);
  }
  // In een zijwaarts schuivende rij (telefoon) schuift een nieuwe actieve categorie in beeld; handmatig schuiven blijft ongemoeid
  const act = p ? p.cat : null;
  if (act !== uiCatSeen) {
    uiCatSeen = act;
    const on = act && els.presets.querySelector('.cat.on'), row = els.presets;
    if (on && row.scrollWidth > row.clientWidth + 1) {
      const rr = row.getBoundingClientRect(), br = on.getBoundingClientRect();
      if (br.left < rr.left + 16) row.scrollLeft += br.left - rr.left - 16;
      else if (br.right > rr.right - 24) row.scrollLeft += br.right - rr.right + 24;
    }
  }
}
let uiCatSeen = null;
function uiMenuItems() { return [...els.menu.querySelectorAll('.mi')]; }
function uiOpenMenu(cat, btn) {
  uiCloseMenu(false);
  uiMenuCat = cat; uiMenuBtn = btn;
  const m = els.menu;
  m.innerHTML = '';
  // U6: de kop met de sluitknop staat buiten het element met role="menu"; dat bevat alleen menuitems
  const head = document.createElement('div'); head.className = 'mhead';
  head.innerHTML = `<span>${esc(cat)}</span>`;
  const close = document.createElement('button'); close.className = 'mclose'; close.setAttribute('aria-label', 'Menu sluiten'); close.textContent = '×'; close.onclick = () => uiCloseMenu(true);
  head.appendChild(close); m.appendChild(head);
  const list = document.createElement('div'); list.setAttribute('role', 'menu'); list.setAttribute('aria-label', 'Presets ' + cat); m.appendChild(list);
  for (const p of PRESETS.filter(q => q.cat === cat && appPresetOk(q))) {
    const b = document.createElement('button');
    b.className = 'mi'; b.setAttribute('role', 'menuitem'); b.dataset.preset = p.id; b.tabIndex = -1;
    const label = p.tour && appTour ? 'Stop rondleiding' : p.label;
    b.innerHTML = `<span class="mi-t">${esc(label)}${p.key ? `<kbd>${p.key}</kbd>` : ''}</span><span class="mi-n">${esc(p.note)}</span>`;
    if (p.id === ACTIVE_PRESET) b.setAttribute('aria-current', 'true');
    b.onclick = () => { uiCloseMenu(false); uiRunPreset(p.id); };
    list.appendChild(b);
  }
  m.hidden = false;
  btn.setAttribute('aria-expanded', 'true');
  uiPlaceMenu();
  const items = uiMenuItems();
  const cur = items.find(i => i.getAttribute('aria-current') === 'true') || items[0];
  if (cur) cur.focus({ preventScroll: true });
  uiUiChanged();
}
function uiPlaceMenu() {
  const m = els.menu, btn = uiMenuBtn;
  if (!btn || m.hidden) return;
  if (window.innerWidth <= 600) { m.style.left = ''; m.style.top = ''; m.style.bottom = ''; m.style.maxHeight = ''; return; }
  const r = btn.getBoundingClientRect();
  const w = m.offsetWidth;
  m.style.left = clamp(r.left, 8, window.innerWidth - w - 8) + 'px';
  m.style.top = 'auto';
  m.style.bottom = (window.innerHeight - r.top + 8) + 'px';
  m.style.maxHeight = Math.max(160, r.top - 16) + 'px';
}
function uiCloseMenu(focusBack) {
  if (!uiMenuCat) return;
  els.menu.hidden = true; els.menu.innerHTML = '';
  if (uiMenuBtn) { uiMenuBtn.setAttribute('aria-expanded', 'false'); if (focusBack) uiMenuBtn.focus({ preventScroll: true }); }
  uiMenuCat = null; uiMenuBtn = null;
  uiUiChanged();
}
function uiMenuKey(e) {
  const items = uiMenuItems(); if (!items.length) return false;
  const i = items.indexOf(document.activeElement);
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const j = i < 0 ? 0 : (i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length; items[j].focus(); return true; }
  if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); items[e.key === 'Home' ? 0 : items.length - 1].focus(); return true; }
  if (e.key === 'Escape') { e.preventDefault(); uiCloseMenu(true); return true; }
  if (e.key === 'Tab') { uiCloseMenu(false); return false; }
  if (e.key === 'Enter' || e.key === ' ') { if (i >= 0) { e.preventDefault(); items[i].click(); } return true; }
  return false;
}
document.addEventListener('pointerdown', e => {
  const t = e.target;
  if (uiMenuCat && !els.menu.contains(t) && !(uiMenuBtn && uiMenuBtn.contains(t))) uiCloseMenu(false);
  if (!(t.closest && t.closest('#play'))) uiStopPlay();
  if (!(t.closest && t.closest('#tourBar, #menu, [data-cat="Overzicht"], #help, #helpDlg'))) uiStopTour();
  hideHint();
}, true);
function uiRunPreset(id) {
  const p = appPresetById.get(id); if (!p) return false;
  hideHint(); uiCloseMenu(false);
  if (p.tour) { appTour ? uiStopTour() : uiStartTour(); return true; }
  return appApplyPreset(p);
}
function uiTourCaption(p, i, n) {
  if (!p) { els.tourBar.hidden = true; if (window.innerWidth < 920) layoutView(); uiUiChanged(); return; }
  els.tourText.innerHTML = `<b>Rondleiding ${i + 1} van ${n} · ${esc(p.label)}</b>${esc(p.note)}`;
  els.tourBar.hidden = false;
  if (window.innerWidth < 920) layoutView();
  uiUiChanged();
}
// R4: de knoppen in de rondleidingsbalk volgen de stand (pauze of hervat, vorige uit bij de eerste stap)
function uiSyncTour() {
  uiSyncCats();
  const t = appTour, paused = !!(t && t.paused), pb = $('tourPause');
  pb.setAttribute('aria-pressed', String(paused));
  pb.setAttribute('aria-label', paused ? 'Hervatten' : 'Pauze'); pb.title = paused ? 'Rondleiding hervatten' : 'Rondleiding pauzeren';
  pb.firstElementChild.innerHTML = paused ? '<path d="M8 5l11 7-11 7z"/>' : '<path d="M7 5h4v14H7zM13 5h4v14h-4z"/>';
  $('tourPrev').disabled = !t || t.i <= 0;
  $('tourNext').disabled = !t;
}
els.tourStop.onclick = () => uiStopTour();
$('tourPause').onclick = () => uiTourPause(!(appTour && appTour.paused));
$('tourPrev').onclick = () => uiTourStep(-1);
$('tourNext').onclick = () => uiTourStep(1);
// een verborgen tabblad zet de rondleiding stil; komt het terug, dan loopt hij verder (een eigen pauze blijft staan)
document.addEventListener('visibilitychange', () => {
  if (!appTour) return;
  if (document.hidden) { if (!appTour.paused) { uiTourPause(true); appTour.auto = true; } }
  else if (appTour.auto) { appTour.auto = false; uiTourPause(false); }
});

/* ---------- aanwijzen en tikken ---------- */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
ray.layers.enableAll(); // samengevoegd getekende onderdelen staan op laag 1 en blijven aanwijsbaar
let uiPickXray = [], uiPickXrayKey = -1;
function uiPickList() {
  if (!XRAY) return uiPickable;
  if (uiPickXrayKey !== uiPickVer) { uiPickXray = uiPickable.filter(m => !m.userData.node.isBody); uiPickXrayKey = uiPickVer; }
  return uiPickXray;
}
function pick(cx, cy, loose) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
  camera.updateMatrixWorld(); ROOT.obj.updateMatrixWorld();
  ray.setFromCamera(ndc, camera);
  const list = uiPickList();
  const hits = ray.intersectObjects(list, false);
  // U19: een gedimd deel voor de focus slaat de klik over; raakt de straal niets in de focus, dan telt het gedimde deel
  let hit = hits[0];
  if (hit && uiDimSet && uiDimmed(hit.object)) { const f = hits.find(h => !uiDimmed(h.object)); if (f) hit = f; }
  if (hit) return hit.object.userData.node;
  if (!loose) return null;
  // vinger naast een klein onderdeel: het dichtstbijzijnde onderdeel binnen 22 px
  let best = null, bd = 22 * 22;
  for (const m of list) {
    const n = m.userData.node;
    uiPv.copy(n.lc).applyMatrix4(m.matrixWorld).project(camera);
    if (uiPv.z > 1) continue;
    const dx = (uiPv.x * 0.5 + 0.5) * r.width + r.left - cx, dy = (-uiPv.y * 0.5 + 0.5) * r.height + r.top - cy, d = dx * dx + dy * dy;
    if (d < bd) { bd = d; best = n; }
  }
  return best;
}
// Wat een klik in de huidige modus zou raken.
function uiActTarget(p) {
  if (!p) return null;
  if (OPENMODE) { const pl = uiOpenPlan(p); return pl ? pl.n : p; }
  if (MODE === 'part') return uiOpen(p.parent) ? p : p.parent;
  if (MODE === 'layers') return pathFrom(p).find(x => x.asm && !uiOpen(x)) || p;
  if (MODE === 'collapse') return uiDeepestOpen(p) || p;
  return p;
}
function uiTipText(p, t) {
  if (OPENMODE) { const pl = uiOpenPlan(p); return pl ? `${uiOpenLabel(pl.n)} · <i>klik om te ${pl.open ? 'openen' : 'sluiten'}</i>` : `${p.name} · <i>niets te openen</i>`; }
  if (MODE === 'collapse') return t.asm ? `${t.name} · ${fmtCount(t)} · klik om in te klappen` : `${p.name} · <i>niets uitgeklapt om in te klappen</i>`;
  if (MODE === 'select') return `${p.name} · <i>klik voor gegevens</i>`;
  if (t.asm) return `${t.name} · ${fmtCount(t)} · klik om uit te klappen`;
  return `${t.name} · <i>klik om uit te lichten</i>`;
}
function uiShowTip(html, x, y) {
  const tip = els.tip;
  if (tip._h !== html) { tip.innerHTML = html.replace(/<(?!\/?i>)/g, '&lt;'); tip._h = html; }
  tip.hidden = false;
  const w = tip.offsetWidth, h = tip.offsetHeight;
  let tx = x + 14, ty = y + 16;
  if (tx + w > window.innerWidth - 8) tx = Math.max(8, x - w - 12);
  if (ty + h > window.innerHeight - 8) ty = y - h - 12;
  tip.style.transform = `translate(${Math.round(tx)}px, ${Math.round(ty)}px)`;
}
function uiHideTip() { els.tip.hidden = true; if (uiSetHover(null)) requestRender(); canvas.style.cursor = ''; }
let uiHoverPos = null, uiHoverT = 0, uiHoverTimer = 0;
function uiDoHover() {
  uiHoverTimer = 0;
  if (!uiHoverPos) return;
  uiHoverT = performance.now();
  const p = pick(uiHoverPos.x, uiHoverPos.y);
  if (!p) { uiHideTip(); return; }
  const t = uiActTarget(p);
  if (uiSetHover(t)) requestRender();
  uiShowTip(uiTipText(p, t), uiHoverPos.x, uiHoverPos.y);
  canvas.style.cursor = OPENMODE && !uiOpenPlan(p) ? '' : 'pointer';
}
function uiHoverTarget(x, y) { const p = pick(x, y); const t = uiActTarget(p); return t ? t.name : null; }

const uiPtrs = new Map();
let down = null, pointers = 0, uiLastTap = null, uiPressS = null;
function uiCancelPress() {
  if (!uiPressS) return;
  clearTimeout(uiPressS.show); clearTimeout(uiPressS.fire); clearTimeout(uiPressS.zero); cancelAnimationFrame(uiPressS.raf);
  els.press.hidden = true; els.press.classList.remove('run');
  uiPressS = null;
}
// Lang drukken, tikken en dubbeltikken worden beslist op de tijdstempels van het gebaar zelf (event.timeStamp),
// niet op het moment waarop een handler toevallig draait. De timer toont de ring en wapent het lang drukken;
// vóór het doorvoeren laat hij wachtende invoer eerst afhandelen (een animatieframe en daarna een nul-timeout).
// Komt er in die tijd een pointerup of pointercancel binnen, dan beslist die (op zijn eigen tijdstempel).
const UI_PRESS_MS = 500;
function uiCommitPress(d, fromUp) {
  if (d.consumed || (d.ended && !fromUp)) return;
  d.consumed = true;
  if (uiPressS && uiPressS.d === d) uiCancelPress();
  try { navigator.vibrate && navigator.vibrate(UI_PRESS_VIBRATE_MS); } catch (_) { } // U8: de ring is vol (alleen waar vibrate bestaat)
  if (d.pick) uiCollapseAt(d.pick);
}
function uiStartPress(d) {
  uiCancelPress();
  const s = uiPressS = { d, raf: 0, zero: 0 };
  s.show = setTimeout(() => { els.press.style.transform = `translate(${d.x}px, ${d.y}px)`; els.press.hidden = false; void els.press.offsetWidth; els.press.classList.add('run'); }, 150);
  // gewapend: eerst wachtende invoer laten afhandelen, dan pas doorvoeren als de vinger er nog ligt. Kwam een timer
  // te laat (de hoofddraad was bezig, er kan invoer in de rij staan), dan opnieuw kijken tot de draad weer vrij is.
  s.tries = 0;
  const later = (ms, fn) => { const due = performance.now() + ms; s.fire = setTimeout(() => fn(performance.now() - due), ms); };
  const check = lag => {
    if (uiPressS !== s || d.ended) return;
    if (lag > 40 && s.tries++ < 40) { later(30, check); return; }
    s.raf = requestAnimationFrame(() => later(0, lag2 => {
      if (uiPressS !== s || d.ended) return;
      if (lag2 > 40 && s.tries++ < 40) { later(30, check); return; }
      uiCommitPress(d);
    }));
  };
  later(UI_PRESS_MS, check);
}
canvas.addEventListener('pointerdown', e => {
  for (const l of labelPool) l._pd = false; // elk gebaar begint schoon: geen label houdt een oude druk vast
  uiPtrs.set(e.pointerId, e.pointerType);
  pointers = uiPtrs.size;
  try { canvas.focus({ preventScroll: true }); } catch (_) { }
  uiHideTip();
  if (uiPtrs.size === 1) {
    down = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, type: e.pointerType, button: e.button, shift: e.shiftKey, consumed: false, ended: false };
    down.pick = pick(e.clientX, e.clientY, e.pointerType !== 'mouse'); // de pick van deze tik, ook voor een dubbeltik
    if (e.pointerType !== 'mouse' && e.button === 0) uiStartPress(down);
  } else { if (down) down.ended = true; down = null; uiCancelPress(); }
});
canvas.addEventListener('pointermove', e => {
  if (down && down.id === e.pointerId && Math.hypot(e.clientX - down.x, e.clientY - down.y) >= 7) uiCancelPress();
  if (e.pointerType !== 'mouse' || e.buttons) { if (!els.tip.hidden) uiHideTip(); return; }
  uiHoverPos = { x: e.clientX, y: e.clientY };
  const wait = 60 - (performance.now() - uiHoverT);
  if (wait <= 0) uiDoHover(); else if (!uiHoverTimer) uiHoverTimer = setTimeout(uiDoHover, wait);
});
canvas.addEventListener('pointerleave', () => { uiHoverPos = null; clearTimeout(uiHoverTimer); uiHoverTimer = 0; uiHideTip(); });
canvas.addEventListener('pointerup', e => {
  uiPtrs.delete(e.pointerId); pointers = uiPtrs.size;
  if (!down || down.id !== e.pointerId) return;
  const d = down; down = null;
  d.ended = true;
  uiCancelPress();
  if (d.consumed) return;
  const moved = Math.hypot(e.clientX - d.x, e.clientY - d.y), dt = e.timeStamp - d.t;
  if (moved >= 7) return; // slepen is nooit een klik
  // lang drukken op touch: beslist door de duur van het gebaar zelf, ook als de timer nog niet aan de beurt was
  if (d.type !== 'mouse' && d.button === 0 && dt >= UI_PRESS_MS) { uiCommitPress(d, true); return; }
  if (dt >= 600) return;
  if (d.button === 2) { if (d.type === 'mouse') { d.pick ? uiCollapseAt(d.pick) : uiBackground(); } return; }
  if (d.button !== 0) return;
  const now = e.timeStamp, L = uiLastTap;
  if (L && now - L.t < 420 && now - L.t >= 0 && Math.hypot(e.clientX - L.x, e.clientY - L.y) < 26 && L.type === d.type) {
    uiLastTap = null;
    if (OPENMODE) return; // in Openen is dubbelklik gelijk aan een enkele klik: de eerste klik heeft al gedaan wat er te doen was
    if (L.pick) uiDive(L.pick); // altijd het onderdeel van de eerste tik
    return;
  }
  uiLastTap = { t: now, x: e.clientX, y: e.clientY, pick: d.pick, type: d.type };
  if (d.shift) { d.pick ? uiCollapseAt(d.pick) : uiBackground(); return; }
  uiAct(d.pick);
});
const uiPtrReset = () => { uiPtrs.clear(); pointers = 0; if (down) down.ended = true; down = null; uiCancelPress(); };
canvas.addEventListener('pointercancel', e => { uiPtrs.delete(e.pointerId); pointers = uiPtrs.size; if (down && down.id === e.pointerId) { down.ended = true; down = null; } uiCancelPress(); });
canvas.addEventListener('lostpointercapture', e => { if (uiPtrs.has(e.pointerId) && down && down.id === e.pointerId && down.type !== 'mouse') { uiPtrs.delete(e.pointerId); pointers = uiPtrs.size; } });
window.addEventListener('blur', uiPtrReset);
document.addEventListener('visibilitychange', () => { if (document.hidden) uiPtrReset(); });
canvas.addEventListener('contextmenu', e => e.preventDefault()); // rechtsklik zelf wordt in pointerup afgehandeld (niet na slepen)
// Een tik op het canvas is in pointerup al volledig afgehandeld. De browser stuurt daarna nog muis-compatibiliteits-
// gebeurtenissen en een click, die op het element vallen dat er op dat moment ligt: na het selecteren staat daar vaak
// een net verschoven label, dat dan een tweede actie uitvoert (bewezen in de itest: tik op Binnenframe motorkap,
// click op label Koplampsproeiers). touchend afvangen onderdrukt die nagekomen click.
canvas.addEventListener('touchend', e => { if (e.cancelable) e.preventDefault(); }, { passive: false });
canvas.addEventListener('wheel', () => { uiStopPlay(); uiStopTour(); hideHint(); uiHideTip(); }, { passive: true });

/* ---------- hint en hulp ---------- */
const uiHintKey = 's26u-hint-v1';
let uiHintStage = 0; // 0 geen, 1 de uitleg, 2 de suggestie (U8); elke handeling sluit hem voorgoed
function uiInitHint() {
  let seen = false;
  try { seen = window.localStorage.getItem(uiHintKey) === '1'; } catch (_) { seen = false; }
  if (seen) { els.hint.hidden = true; return; }
  uiHintStage = 1;
  els.hint.textContent = uiTouch
    ? 'Tik op een onderdeel om het uit te klappen · dubbeltik om er direct heen te gaan · houd vast om in te klappen'
    : 'Klik op een onderdeel om het uit te klappen · dubbelklik om er direct naartoe te gaan · rechtsklik om in te klappen';
  setTimeout(uiHintNext, UI_HINT_MS);
}
// U8: na de uitleg één concrete suggestie, tot de eerste klik of tik (daarna nooit meer: de hint telt als gezien)
function uiHintNext() {
  if (uiHintStage !== 1 || els.hint.hidden || els.hint.classList.contains('gone')) return;
  uiHintStage = 2;
  els.hint.textContent = uiTouch ? 'Probeer: tik op het achterglas' : 'Probeer: klik op het achterglas';
  uiUiChanged();
}
function hideHint(instant) {
  if (instant === true && !els.hint.hidden) { uiHintStage = 0; els.hint.hidden = true; els.hint.classList.add('gone'); try { window.localStorage.setItem(uiHintKey, '1'); } catch (_) { } uiUiChanged(); return; }
  if (els.hint.hidden || els.hint.classList.contains('gone')) return;
  uiHintStage = 0;
  els.hint.classList.add('gone');
  try { window.localStorage.setItem(uiHintKey, '1'); } catch (_) { }
  setTimeout(() => { els.hint.hidden = true; uiUiChanged(); uiSyncLabels(); }, REDUCED ? 0 : 450);
}
// U7: het hulpvenster leest de categorieën en sneltoetsen uit appCats en PRESETS (niet met de hand bijhouden)
function uiFillHelp() {
  const keyed = PRESETS.filter(p => p.key && appPresetOk(p)).sort((a, b) => a.key.localeCompare(b.key));
  $('helpCats').textContent = `${appCats.length} categorieën (${appCats.join(', ')}) met kant-en-klare standen, ook de rondleiding.`;
  $('helpKeysT').innerHTML = keyed.length ? `<kbd>${esc(keyed[0].key)}</kbd> tot <kbd>${esc(keyed[keyed.length - 1].key)}</kbd>` : '';
  $('helpKeys').textContent = keyed.map(p => p.label).join(', ') + '.';
}
// U6: zolang het hulpvenster open is, is de rest van de pagina inert (waar de browser dat kent) en blijft Tab in het venster
function uiHelpInert(on) {
  if (!('inert' in HTMLElement.prototype)) return;
  for (const el of els.helpDlg.parentElement.children) if (el !== els.helpDlg) el.inert = on;
}
function uiHelpFocusables() { return [...els.helpDlg.querySelectorAll('button, a[href], input, [tabindex]:not([tabindex="-1"])')].filter(e => !e.disabled && e.offsetParent !== null); }
function uiHelp(open) {
  els.helpDlg.hidden = !open;
  uiHelpInert(open);
  if (open) {
    uiFillHelp();
    const m = $('helpMouse'), t = $('helpTouch');
    if (uiTouch) m.before(t); else t.before(m);
    $('helpClose').focus({ preventScroll: true });
    els.helpDlg.firstElementChild.scrollTop = 0;
  } else els.help.focus({ preventScroll: true });
  uiUiChanged();
}
els.help.onclick = () => uiHelp(true);
$('helpClose').onclick = () => uiHelp(false);
els.helpDlg.addEventListener('click', e => { if (e.target === els.helpDlg) uiHelp(false); });

/* ---------- toetsenbord (werkt zodra de pagina de focus heeft; het canvas krijgt die bij de eerste aanraking) ---------- */
function uiEnter(shift) {
  const n = SEL || ROOT;
  if (OPENMODE) { // Enter opent of sluit de opener van de selectie, Shift+Enter sluit de binnenste open opener
    if (shift) uiOpenClose(n); else { const pl = uiPanelPlan(n); if (pl) uiOpenTo(pl.n, pl.open); }
    return;
  }
  if (shift) { if (n.asm && uiOpen(n)) doCollapse(n); else if (!n.asm) uiCollapseAt(n); return; }
  if (n.asm && !uiOpen(n)) { doExplode(n); return; }
  const a = uiClosedAbove(n);
  if (a) { doExplode(a); return; }
  if (n.asm) doCollapse(n); else { uiPush(); uiLift(n); uiAfterAction(); }
}
if (!uiTouch) els.search.placeholder += ' (toets /)';
window.addEventListener('keydown', e => {
  const t = e.target;
  if (!els.helpDlg.hidden) {
    if (e.key === 'Escape') { e.preventDefault(); uiHelp(false); return; }
    if (e.key === 'Tab') { // focusval: Tab en Shift+Tab lopen rond binnen het venster
      const f = uiHelpFocusables(); if (!f.length) return;
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && (i < 0 || i >= f.length - 1)) { e.preventDefault(); f[0].focus(); }
    }
    return;
  }
  if (uiMenuCat && uiMenuKey(e)) return;
  const typing = t && ((t.tagName === 'INPUT' && !/^(range|checkbox|radio|button)$/.test(t.type)) || t.tagName === 'TEXTAREA' || t.isContentEditable);
  if (typing) { if (e.key === 'Escape') t.blur(); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const onCtl = !!(t && t.closest && t.closest('button, a, input, select, summary'));
  // U6: Esc sluit eerst het mobiele paneel (de lade), daarna pas de rest
  if (e.key === 'Escape' && uiSheetBottom() && els.sheet.dataset.state === 'open') { e.preventDefault(); setSheet('peek'); return; }
  if (e.key === 'Escape') { uiStopPlay(); uiStopTour(); hideHint(); uiBackground(); return; }
  if (e.key === 'Enter') { if (onCtl) return; e.preventDefault(); uiStopPlay(); uiStopTour(); hideHint(); uiEnter(e.shiftKey); return; }
  if (e.key === 'Backspace') { e.preventDefault(); uiStopPlay(); uiStopTour(); uiUndo(); return; }
  if (e.key === '?') { e.preventDefault(); uiHelp(true); return; }
  if (e.key === 'o' || e.key === 'O') { e.preventDefault(); hideHint(); uiSetOpenMode(!OPENMODE); return; }
  // U17: / springt naar het zoekveld van de onderdelenlijst (op de telefoon gaat het paneel daarvoor open)
  if (e.key === '/') { e.preventDefault(); hideHint(); showTab('tree'); if (uiSheetBottom()) setSheet('open'); els.search.focus(); els.search.select(); return; }
  // pijltjes (niet op een bedieningselement): door de boom lopen. Omhoog = bovenliggende groep, omlaag = eerste deel,
  // links/rechts = vorige/volgende op hetzelfde niveau (audit U29). Selecteren en in beeld houden, niets uitklappen.
  if (!onCtl && /^Arrow(Up|Down|Left|Right)$/.test(e.key)) {
    const n = SEL || ROOT, sib = n.parent ? n.parent.kids : [n];
    let m = null;
    if (e.key === 'ArrowUp') m = n.parent && (!ISO.length || uiInScope(n.parent)) ? n.parent : null;
    else if (e.key === 'ArrowDown') m = n.asm ? n.kids.find(k => k.ev) : null;
    else { const i = sib.indexOf(n), d = e.key === 'ArrowRight' ? 1 : -1; for (let j = 1; j < sib.length && !m; j++) { const k = sib[(i + d * j + sib.length * j) % sib.length]; if (k.ev) m = k; } }
    if (m && m !== n) { e.preventDefault(); uiStopPlay(); uiStopTour(); hideHint(); uiPush(); select(m); uiSoftFrame([m]); uiAfterAction(); }
    return;
  }
  if (/^[0-9]$/.test(e.key)) {
    const p = PRESETS.find(q => q.key === e.key);
    if (p && appPresetOk(p)) { e.preventDefault(); uiStopPlay(); uiStopTour(); uiRunPreset(p.id); }
  }
});

/* ---------- labels: genummerde callouts met leiderlijn ---------- */
const labelPool = [], uiLinePool = [], uiDotPool = [];
const uiSvgNs = 'http://www.w3.org/2000/svg';
let uiRectCache = [], uiNPlaced = 0, uiVx0 = 0, uiVy0 = 0, uiVx1 = 0, uiVy1 = 0;
const uiCands = [], uiSpots = [];
const uiAnchor = V3(0, 0, 0), uiGc = V3(0, 0, 0);
function uiLabelGroup() {
  if (!LABELS) return null;
  if (uiLabelForce && CTX) return CTX;
  if (SEL && SEL.asm && uiOpen(SEL) && SEL.amt > 0.6) return SEL;
  if (CTX && uiOpen(CTX) && CTX.amt > 0.6) return CTX;
  return null;
}
// Labelanker op de gelabelde knoop zelf. Het midden van het kader (n.lc) ligt bij een groep vaak op een ander deel of
// in de lucht, zeker als de groep zelf is uitgeklapt (Stuurpomp: Pomphuis en Stroomregelklep). Daarom ankert elk
// label op een representatief mesh: bij een onderdeel het mesh zelf, bij een groep een groot, niet-ingesloten mesh zo
// dicht mogelijk bij het midden van de groep. Het punt ligt in de eigen coördinaten van dat mesh, zodat het anker
// meebeweegt als de groep uitklapt: het midden van het mesh als dat binnenin ligt, anders (ring, holle bus) het midden
// van de driehoek die het dichtst bij dat midden ligt. Eén keer per knoop berekend (lui), per geometrie gedeeld; geen
// raycasts per frame.
let uiGeoAnchor = new WeakMap();
function uiGeoPoint(geo) {
  let p = uiGeoAnchor.get(geo);
  if (p) return p;
  if (!geo.boundingBox) geo.computeBoundingBox();
  const c = geo.boundingBox.getCenter(V3(0, 0, 0)), pos = geo.attributes.position, idx = geo.index;
  const nt = idx ? idx.count / 3 : pos.count / 3, C = [c.x, c.y, c.z], cross = [0, 0, 0], q = [[], [], []];
  let bd = Infinity; p = c.clone();
  for (let t = 0; t < nt; t++) {
    for (let j = 0; j < 3; j++) { const v = idx ? idx.getX(3 * t + j) : 3 * t + j; q[j][0] = pos.getX(v); q[j][1] = pos.getY(v); q[j][2] = pos.getZ(v); }
    const x = (q[0][0] + q[1][0] + q[2][0]) / 3, y = (q[0][1] + q[1][1] + q[2][1]) / 3, z = (q[0][2] + q[1][2] + q[2][2]) / 3;
    const dd = (x - c.x) * (x - c.x) + (y - c.y) * (y - c.y) + (z - c.z) * (z - c.z);
    if (dd < bd) { bd = dd; p.set(x, y, z); }
    // stralen vanuit het midden langs +x, +y en +z: hoe vaak snijden ze het oppervlak (oneven = midden ligt binnenin)
    for (let ax = 0; ax < 3; ax++) {
      const u = (ax + 1) % 3, w = (ax + 2) % 3, pu = C[u], pw = C[w];
      const d = (q[1][u] - q[0][u]) * (q[2][w] - q[0][w]) - (q[2][u] - q[0][u]) * (q[1][w] - q[0][w]);
      if (Math.abs(d) < 1e-14) continue;
      const l1 = ((q[1][u] - pu) * (q[2][w] - pw) - (q[2][u] - pu) * (q[1][w] - pw)) / d;
      const l2 = ((q[2][u] - pu) * (q[0][w] - pw) - (q[0][u] - pu) * (q[2][w] - pw)) / d;
      const l3 = 1 - l1 - l2;
      if (l1 < 0 || l2 < 0 || l3 < 0) continue;
      if (l1 * q[0][ax] + l2 * q[1][ax] + l3 * q[2][ax] > C[ax]) cross[ax]++;
    }
  }
  // dicht, bol deel: het midden zelf (valt in elk aanzicht binnen het silhouet); ring, buis of open schaal: het
  // dichtstbijzijnde stukje oppervlak
  if (cross[0] % 2 && cross[1] % 2 && cross[2] % 2) p.copy(c);
  uiGeoAnchor.set(geo, p);
  return p;
}
const uiBox = new THREE.Box3(), uiBs = V3(0, 0, 0);
// maat voor hoe groot een mesh in beeld komt: grootste vlak van zijn kader plus een toeslag voor dikte, zodat een
// huis het wint van een dunne ring of een lange bout
function uiMeshSize(m) {
  uiBox.setFromObject(m).getSize(uiBs);
  const d = [uiBs.x, uiBs.y, uiBs.z].sort((x, y) => y - x);
  return d[0] * d[1] + 4 * d[1] * d[2];
}
// Rangschikt de meshes van een knoop en geeft de zes beste terug; het (dure) ankerpunt per mesh volgt los van elkaar
// (uiGeoPoint), zodat het werk over frames te verdelen is.
function uiRankAnchors(k) {
  if (!k.asm) return [{ m: k.obj, node: k }];
  if (!k.meshes.length) return [];
  // ingesloten meshes (binnen k) zijn alleen te zien als hun groep open is; die komen pas na de rest
  const isIn = m => { for (let q = m.userData.node; q && q !== k; q = q.parent) if (q.inner) return true; return false; };
  const info = k.meshes.map(m => ({ m, inner: isIn(m), size: uiMeshSize(m), d: m.userData.node.wc.distanceTo(k.wc) }));
  const outer = info.filter(x => !x.inner), big = Math.max(...(outer.length ? outer : info).map(x => x.size));
  const rank = x => (x.size >= 0.5 * big ? 0 : 2) + (x.inner ? 1 : 0);
  info.sort((x, y) => rank(x) - rank(y) || x.d - y.d);
  return info.slice(0, 6).map(x => ({ m: x.m, node: x.m.userData.node }));
}
function uiMakeAnchors(k) {
  const a = uiRankAnchors(k);
  for (const x of a) x.p = uiGeoPoint(x.m.geometry);
  return a;
}
// De ankers van een groep worden niet in één frame gebouwd (bij Carrosserie 17 ms, bij de hoofdgroepen ~19 ms in het
// midden van het uitklappen): knopen komen in een rij en uiAnchorStep bouwt ze binnen een tijdsbudget per frame, per
// stap één rangschikking of één geometrie. Tot een knoop klaar is, ankert zijn label op het midden van het kader.
// Zodra een groep begint uit te klappen, gaat zijn rij met labelkandidaten (grootste eerst) vooruit de rij in.
const uiAnchorQ = new Set();
let uiAnchorJob = null, uiPfGroup = null, uiPfMax = 0;
function uiAnchorStep(budget) {
  const t0 = performance.now();
  let done = false;
  while (performance.now() - t0 < budget) {
    if (!uiAnchorJob) {
      let k = null;
      for (const q of uiAnchorQ) { uiAnchorQ.delete(q); if (!q._la) { k = q; break; } }
      if (!k) break;
      uiAnchorJob = { k, list: uiRankAnchors(k), i: 0 };
    } else {
      const j = uiAnchorJob;
      if (j.i < j.list.length) { const x = j.list[j.i++]; x.p = uiGeoPoint(x.m.geometry); }
      if (j.i >= j.list.length) { j.k._la = j.list; uiAnchorJob = null; done = true; }
    }
  }
  return done;
}
function uiAnchorFlush() { // voor tests en voor finishAll: alles in de rij direct bouwen
  for (let it = 0; it < 1000 && (uiAnchorQ.size || uiAnchorJob); it++) uiAnchorStep(1e9);
}
// per frame: vooruit inplannen en binnen het budget bouwen; true als er ankers klaar zijn gekomen (labels opnieuw leggen)
function uiAnchorFrame(active) {
  uiAnchorPrefetch();
  return (uiAnchorQ.size || uiAnchorJob) ? uiAnchorStep(active ? 2 : 8) : false;
}
function uiAnchorPrefetch() {
  const g = LABELS ? (SEL && SEL.asm && uiOpen(SEL) ? SEL : (CTX && uiOpen(CTX) ? CTX : null)) : null;
  const max = W < 600 ? 10 : 24;
  if (g === uiPfGroup && max === uiPfMax) return;
  uiPfGroup = g; uiPfMax = max;
  if (!g) return;
  let n = 0;
  for (const k of g.bySize) { if (n++ >= max) break; if (!k._la) uiAnchorQ.add(k); }
}
function uiLabelAnchor(k, out) {
  const a = k._la;
  if (!a) { uiAnchorQ.add(k); return out.copy(k.lc).applyMatrix4(k.obj.matrixWorld); }
  for (const x of a) if (x.node.ev) return out.copy(x.p).applyMatrix4(x.m.matrixWorld);
  // geen van de zes gekozen meshes is zichtbaar (bijvoorbeeld na isoleren): eerste zichtbare mesh van de knoop, anders
  // het midden van het kader
  let f = k._lf;
  if (!f || !f.node.ev) {
    f = null;
    if (k.asm) for (const m of k.meshes) { const nd = m.userData.node; if (nd.ev) { f = { m, node: nd }; break; } }
    k._lf = f;
  }
  if (f) { if (!f.p) f.p = uiGeoPoint(f.m.geometry); return out.copy(f.p).applyMatrix4(f.m.matrixWorld); }
  return out.copy(k.lc).applyMatrix4(k.obj.matrixWorld);
}
function uiNewLabel() {
  const el = document.createElement('button');
  el.className = 'lbl'; el.hidden = true; el.tabIndex = -1;
  el.innerHTML = '<b></b><span></span>';
  // alleen een klik die op dit label begon (of een klik zonder aanwijzer: toetsenbord, schermlezer); geen nagekomen
  // click van een tik die op het canvas begon en waarna het label onder de vinger is geschoven
  el.addEventListener('pointerdown', () => { el._pd = true; });
  el.addEventListener('click', e => {
    const was = el._pd; el._pd = false; const k = el._k; if (!k || (e.detail > 0 && !was)) return;
    // U8: op een aanraakscherm is er geen title-tip; een afgekapt label toont zijn volledige naam als toast
    if (uiTouch && el.lastChild.scrollWidth > el.lastChild.clientWidth + 1) uiToast(k.name);
    uiStopPlay(); uiStopTour(); hideHint(); uiAct(k);
  });
  els.labels.appendChild(el);
  const ln = document.createElementNS(uiSvgNs, 'line'); ln.style.display = 'none'; els.leaders.appendChild(ln);
  const dot = document.createElementNS(uiSvgNs, 'circle'); dot.setAttribute('r', '3'); dot.style.display = 'none'; els.leaders.appendChild(dot);
  labelPool.push(el); uiLinePool.push(ln); uiDotPool.push(dot);
  return el;
}
function uiHideLabel(i) {
  const el = labelPool[i];
  if (!el.hidden) { el.hidden = true; el.style.transform = 'translate(-9999px,-9999px)'; el._x = el._y = null; }
  el._k = null;
  if (uiLinePool[i].style.display !== 'none') { uiLinePool[i].style.display = 'none'; uiDotPool[i].style.display = 'none'; }
}
function uiMeasureUi() {
  const out = [];
  const add = (id, el) => { if (!el || el.hidden) return; const r = el.getBoundingClientRect(); if (r.width > 0 && r.height > 0) out.push({ id, x: r.left, y: r.top, w: r.width, h: r.height }); };
  add('panel', els.sheet);
  add('modes', $('modes')); add('explode', $('xctl')); add('presets', els.presets);
  add('openSeg', $('openSeg')); add('openCtl', $('openCtl')); add('openList', $('openList')); add('isoBadge', els.isoBadge);
  add('title', els.topbar.querySelector('.title')); add('topActions', els.topbar.querySelector('.top-actions'));
  add('notice', els.notice); if (!els.toast.classList.contains('gone')) add('toast', els.toast);
  if (!els.hint.hidden && !els.hint.classList.contains('gone')) add('hint', els.hint);
  if (!els.menu.hidden) add('menu', els.menu);
  if (!els.tourBar.hidden) add('tour', els.tourBar);
  if (!els.helpDlg.hidden) add('help', els.helpDlg.firstElementChild);
  return out;
}
function uiRects() { return uiMeasureUi(); }
const uiDirs = [0, 0.52, -0.52, 1.05, -1.05, 1.57, -1.57, 2.36, -2.36, 3.14];
const uiRadii = [30, 52, 78, 110, 150];
function updateLabels() {
  if (uiUiDirty) { uiRectCache = uiMeasureUi(); uiUiDirty = false; }
  const g = uiLabelGroup();
  const max = W < 600 ? UI_LABEL_MAX_NARROW : UI_LABEL_MAX;
  uiCands.length = 0;
  if (SEL && !SEL.asm && SEL.ev && LABELS) uiCands.push(SEL);
  const lp = uiLabelForce && ACTIVE_PRESET ? appPresetById.get(ACTIVE_PRESET) : null;
  const only = lp && lp.labelOnly && g && g.name === lp.labels ? lp.labelOnly : null;
  let eligible = 0; // U2: alle kinderen die een label zouden kunnen krijgen, ook voorbij het maximum
  if (g) for (const k of g.bySize) { if (k !== SEL && k.ev && (!only || only.includes(k.name))) { eligible++; if (uiCands.length < max) uiCands.push(k); } }
  // nieuwe teksten eerst toewijzen, dan in één keer meten
  while (labelPool.length < uiCands.length) uiNewLabel();
  for (let i = 0; i < uiCands.length; i++) {
    const k = uiCands[i], el = labelPool[i];
    if (el._t !== k) { el.firstChild.textContent = String(k.idx + 1); el.lastChild.textContent = k.name; el.title = k.name; el._t = k; el.setAttribute('aria-label', `${k.idx + 1}. ${k.name}`); }
  }
  for (let i = 0; i < uiCands.length; i++) {
    const k = uiCands[i];
    if (k._lw == null) { const el = labelPool[i]; const wasHidden = el.hidden; el.hidden = false; k._lw = el.offsetWidth; k._lh = el.offsetHeight; if (wasHidden) el.hidden = true; }
  }
  const v = uiFreeView(), M = 4;
  uiVx0 = v.x0 + M; uiVy0 = v.y0 + M; uiVx1 = v.x1 - M; uiVy1 = v.y1 - M;
  uiNPlaced = 0;
  let gx = 0, gy = 0;
  if (g) { uiGc.copy(g.lc).applyMatrix4(g.obj.matrixWorld).project(camera); gx = (uiGc.x * 0.5 + 0.5) * W; gy = (-uiGc.y * 0.5 + 0.5) * H; }
  let shown = 0;
  for (let i = 0; i < uiCands.length; i++) {
    const k = uiCands[i], el = labelPool[i];
    uiLabelAnchor(k, uiAnchor).project(camera);
    const ax = (uiAnchor.x * 0.5 + 0.5) * W, ay = (-uiAnchor.y * 0.5 + 0.5) * H;
    const w = k._lw || 100, h = k._lh || 22;
    let found = false, dx = 0, dy = 0;
    if (uiAnchor.z <= 1 && ax >= uiVx0 && ax <= uiVx1 && ay >= uiVy0 && ay <= uiVy1) {
      // eerst de vorige plek (rustig beeld tijdens animaties), dan ringen rond het anker, van de groep af gericht
      if (k._lo && uiFits(ax + k._lo[0] - w / 2, ay + k._lo[1] - h / 2, w, h)) { found = true; dx = k._lo[0]; dy = k._lo[1]; }
      const base = g && Math.abs(ax - gx) + Math.abs(ay - gy) > 6 ? Math.atan2(ay - gy, ax - gx) : -HALF;
      for (let ri = 0; !found && ri < uiRadii.length; ri++) {
        const R = uiRadii[ri];
        for (let di = 0; di < uiDirs.length; di++) {
          const a = base + uiDirs[di], ca = Math.cos(a), sa = Math.sin(a);
          dx = ca * (R + w / 2 * Math.abs(ca)); dy = sa * (R * 0.75 + h / 2 * Math.abs(sa));
          if (uiFits(ax + dx - w / 2, ay + dy - h / 2, w, h)) { found = true; if (!k._lo) k._lo = [0, 0]; k._lo[0] = dx; k._lo[1] = dy; break; }
        }
      }
    }
    if (!found) { uiHideLabel(i); continue; }
    const x = ax + dx - w / 2, y = ay + dy - h / 2;
    let sp = uiSpots[uiNPlaced];
    if (!sp) sp = uiSpots[uiNPlaced] = { x: 0, y: 0, w: 0, h: 0, ax: 0, ay: 0, k: null };
    sp.x = x; sp.y = y; sp.w = w; sp.h = h; sp.ax = ax; sp.ay = ay; sp.k = k;
    uiNPlaced++;
    el._k = k;
    const isSel = k === SEL;
    if (el._sel !== isSel) { el._sel = isSel; el.classList.toggle('sel', isSel); uiDotPool[i].classList.toggle('sel', isSel); }
    const rx = Math.round(x), ry = Math.round(y);
    if (el._x !== rx || el._y !== ry || el.hidden) { el._x = rx; el._y = ry; el.style.transform = 'translate(' + rx + 'px,' + ry + 'px)'; }
    if (el.hidden) el.hidden = false;
    // leiderlijn van het ankerpunt naar de dichtstbijzijnde rand van het label
    const x1 = Math.round(ax), y1 = Math.round(ay), x2 = Math.round(clamp(ax, x, x + w)), y2 = Math.round(clamp(ay, y, y + h));
    const ln = uiLinePool[i], dot = uiDotPool[i];
    if (ln._x1 !== x1 || ln._y1 !== y1 || ln._x2 !== x2 || ln._y2 !== y2) {
      ln._x1 = x1; ln._y1 = y1; ln._x2 = x2; ln._y2 = y2;
      ln.setAttribute('x1', x1); ln.setAttribute('y1', y1); ln.setAttribute('x2', x2); ln.setAttribute('y2', y2);
      dot.setAttribute('cx', x1); dot.setAttribute('cy', y1);
    }
    if (ln.style.display) { ln.style.display = ''; dot.style.display = ''; }
    shown++;
  }
  for (let i = uiCands.length; i < labelPool.length; i++) uiHideLabel(i);
  // U2: wat niet getoond is (voorbij het maximum of zonder vrije plek) staat als "+n meer" in een hoek van het vrije beeld
  const selShown = uiCands.length && uiCands[0] === SEL && !SEL.asm ? 1 : 0;
  uiLabelsMore = g ? Math.max(0, eligible - (shown - selShown)) : 0;
  uiPlaceMore(g);
  return shown;
}
let uiLabelsMore = 0, uiMoreEl = null;
function uiPlaceMore(g) {
  if (!uiMoreEl) {
    uiMoreEl = document.createElement('button'); uiMoreEl.className = 'lmore'; uiMoreEl.hidden = true; uiMoreEl.tabIndex = -1;
    uiMoreEl.title = 'Alle onderdelen van deze groep in de lijst';
    uiMoreEl.onclick = () => { showTab('tree'); if (uiSheetBottom()) setSheet('open'); if (uiMoreEl._g) { openRows.add(uiMoreEl._g.id); renderTree(); } };
    els.labels.appendChild(uiMoreEl);
  }
  const el = uiMoreEl;
  if (!uiLabelsMore) { if (!el.hidden) { el.hidden = true; el.style.transform = 'translate(-9999px,-9999px)'; } return; }
  const txt = `+${uiLabelsMore} meer`;
  if (el.textContent !== txt) { el.textContent = txt; el.setAttribute('aria-label', `${uiLabelsMore} onderdelen meer zonder label; open de lijst`); el._w = 0; }
  el._g = g;
  if (el.hidden) el.hidden = false;
  if (!el._w) { el._w = el.offsetWidth; el._h = el.offsetHeight; }
  const w = el._w || 70, h = el._h || 22;
  // hoeken van het vrije beeld, rechtsonder eerst; past geen enkele, dan toch rechtsonder
  const spots = [[uiVx1 - w, uiVy1 - h], [uiVx0, uiVy1 - h], [uiVx1 - w, uiVy0], [uiVx0, uiVy0]];
  let p = spots.find(([x, y]) => uiFits(x, y, w, h)) || spots[0];
  const rx = Math.round(p[0]), ry = Math.round(p[1]);
  if (el._x !== rx || el._y !== ry) { el._x = rx; el._y = ry; el.style.transform = 'translate(' + rx + 'px,' + ry + 'px)'; }
}
// vrije plek voor een label: binnen het vrije beeld, niet over andere labels of hun ankers, niet over de bediening
function uiFits(x, y, w, h) {
  if (x < uiVx0 || y < uiVy0 || x + w > uiVx1 || y + h > uiVy1) return false;
  for (let j = 0; j < uiNPlaced; j++) {
    const q = uiSpots[j];
    if (x < q.x + q.w + 4 && x + w + 4 > q.x && y < q.y + q.h + 4 && y + h + 4 > q.y) return false;
    if (q.ax > x - 3 && q.ax < x + w + 3 && q.ay > y - 3 && q.ay < y + h + 3) return false;
  }
  for (let j = 0; j < uiRectCache.length; j++) {
    const q = uiRectCache[j];
    if (x < q.x + q.w + 2 && x + w + 2 > q.x && y < q.y + q.h + 2 && y + h + 2 > q.y) return false;
  }
  return true;
}
function uiLabelRects() { return uiSpots.slice(0, uiNPlaced).map(p => ({ name: p.k.name, x: p.x, y: p.y, w: p.w, h: p.h })); }

/* ---------- formaat en vrij beeld ---------- */
let uiRefitTimer = 0;
const uiViewPrev = { l: -99, r: -99, t: -99, b: -99 };
let uiViewW = 0, uiViewH = 0;
function layoutView() {
  const wide = !uiSheetBottom(); // bureaublad of telefoon liggend: het paneel staat als kolom rechts
  const title = els.topbar.querySelector('.title').getBoundingClientRect();
  const acts = els.topbar.querySelector('.top-actions').getBoundingClientRect();
  const sheet = els.sheet.getBoundingClientRect();
  let dockTop = H;
  for (const el of [$('modes'), $('xctl'), els.presets, $('openCtl'), $('openList'), els.isoBadge]) { const r = el.getBoundingClientRect(); if (r.height > 0 && r.top < dockTop) dockTop = r.top; }
  if (wide) {
    VIEW.l = 0; VIEW.r = Math.max(0, W - sheet.left + 8);
    VIEW.t = Math.min(H * 0.3, title.bottom + 6);
    VIEW.b = Math.max(0, H - dockTop + 6);
    if (uiSide() && !els.tourBar.hidden) { const tb = els.tourBar.getBoundingClientRect(); if (tb.height > 0) VIEW.t = Math.max(VIEW.t, Math.min(H * 0.45, tb.bottom + 4)); }
  } else {
    VIEW.l = 0; VIEW.r = 0;
    VIEW.t = Math.min(H * 0.3, Math.max(title.bottom, acts.bottom, $('openSeg').getBoundingClientRect().bottom) + 4);
    const bottom = els.sheet.dataset.state === 'open' ? sheet.top : Math.min(dockTop, sheet.top);
    VIEW.b = Math.max(0, H - bottom + 4);
    // Tijdens de rondleiding staat het bijschrift als balk onder de titel: het beeld begint eronder.
    if (!els.tourBar.hidden) { const tb = els.tourBar.getBoundingClientRect(); if (tb.height > 0) VIEW.t = Math.max(VIEW.t, Math.min(H * 0.45, tb.bottom + 4)); }
    // Altijd een bruikbaar vrij beeld: op een kort scherm (telefoon liggend) overlapt het dock dan liever het beeld.
    const minH = Math.min(160, H * 0.4);
    if (H - VIEW.t - VIEW.b < minH) {
      VIEW.b = Math.max(0, H - VIEW.t - minH);
      if (H - VIEW.t - VIEW.b < minH) VIEW.t = Math.max(0, H - VIEW.b - minH);
    }
  }
  // Kleine verschuivingen van de bediening (een focusrand, een paar pixels in het dock) verschuiven het beeld niet:
  // anders springt de scène onder de vinger weg tussen aanwijzen en tikken.
  for (const k of ['l', 'r', 't', 'b']) { if (Math.abs(VIEW[k] - uiViewPrev[k]) < 6 && uiViewW === W && uiViewH === H) VIEW[k] = uiViewPrev[k]; uiViewPrev[k] = VIEW[k]; }
  uiViewW = W; uiViewH = H;
  camera.setViewOffset(W, H, (VIEW.r - VIEW.l) / 2, (VIEW.b - VIEW.t) / 2, W, H);
  camera.updateProjectionMatrix();
  uiPlaceMenu();
  uiUiChanged();
  uiSyncLabels();
}
// Na een wijziging van het vrije beeld opnieuw inpassen, tenzij de gebruiker de camera zelf heeft verplaatst.
function uiRefitNow() {
  clearTimeout(uiRefitTimer); uiRefitTimer = 0;
  if (uiUserCam || !uiLastFit) return;
  const f = uiLastFit;
  if (f.preset) { const c = f.preset.cam || {}; focusNodes(appSubject(f.preset), appPresetDir(f.preset), c.pad || 1.06, { dur: 0.4 }); uiLastFit = f; }
  else focusNodes(f.nodes, f.dir, f.pad, Object.assign({}, f.opt || {}, { dur: 0.4, delay: 0 }));
}
function uiRefitSoon() {
  clearTimeout(uiRefitTimer);
  uiRefitTimer = setTimeout(uiRefitNow, 160);
}
let uiDprCap = Math.min(window.devicePixelRatio || 1, 2), uiDpr = uiDprCap;
function resize() {
  W = Math.max(1, canvas.clientWidth); H = Math.max(1, canvas.clientHeight);
  uiDprCap = Math.min(window.devicePixelRatio || 1, 2);
  uiDpr = uiPickDpr(false); uiBufferSize();
  camera.aspect = W / H;
  camera.updateProjectionMatrix();
  syncSheetHeight();
  layoutView();
}
window.addEventListener('resize', () => { resize(); uiRefitSoon(); });
if (window.ResizeObserver) {
  let lastH = 0;
  new ResizeObserver(() => { syncSheetHeight(); layoutView(); const h = els.sheet.offsetHeight; if (uiSheetBottom() && Math.abs(h - lastH) > 24) uiRefitSoon(); lastH = h; }).observe(els.sheet);
  new ResizeObserver(() => layoutView()).observe(els.dock);
}

/* ---------- thema ---------- */
function refreshTheme() { uiThemeLights(); const old = ground.material.map; ground.material.map = gridTexture(); ground.material.needsUpdate = true; old && old.dispose(); requestRender(); }
if (window.matchMedia) { const mq = matchMedia('(prefers-color-scheme: dark)'); mq.addEventListener ? mq.addEventListener('change', refreshTheme) : mq.addListener(refreshTheme); }
new MutationObserver(refreshTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

/* ---------- beeldkwaliteit: lagere pixelratio tijdens grote animaties, lichte weergave als het hapert ---------- */
let uiLite = false, uiAdapted = false, uiLastFrame = 0, uiPrevActive = false;
const uiFt = [];
function uiMoving() { let c = 0; for (const n of uiAnim) if (n.delay <= 0) c += n.count; if (uiPlayS) c += uiPlayS.w.count; return c; }
function uiPickDpr(active) {
  if (uiLite) return Math.min(1, uiDprCap);
  if (active && uiMoving() > 800) return Math.max(1, uiDprCap * 0.75);
  return uiDprCap;
}
function uiSetDpr(v) { if (Math.abs(v - uiDpr) < 1e-3) return; uiDpr = v; uiBufferSize(); }
// tekenbuffer in één keer op maat (setPixelRatio + setSize wezen hem twee keer opnieuw toe); niets doen als hij al klopt
function uiBufferSize() {
  if (canvas.width === Math.floor(W * uiDpr) && canvas.height === Math.floor(H * uiDpr) && renderer.getPixelRatio() === uiDpr) {
    const s = renderer.getSize(new THREE.Vector2()); if (s.x === W && s.y === H) return;
  }
  renderer.setDrawingBufferSize(W, H, uiDpr);
}
function uiSetLite(on) {
  uiAdapted = true; uiLite = on;
  const cc = on ? 0 : 1;
  MAT.backGlass.clearcoat = cc; MAT.backGlass.needsUpdate = true;
  for (const m of [uiHV.get(MAT.backGlass), uiSL.get(MAT.backGlass)]) if (m) { m.clearcoat = on ? 0 : 0.2; m.needsUpdate = true; }
  els.qualityRow.hidden = false; els.qualityNote.hidden = !on; els.quality.checked = !on;
  uiSetDpr(uiPickDpr(false));
  requestRender();
}
function uiMeasure(now, active) {
  if (uiAdapted || REDUCED) return;
  const dt = now - uiLastFrame;
  if (active && uiPrevActive && uiLastFrame && dt < 250) {
    uiFt.push(dt); if (uiFt.length > 20) uiFt.shift();
    if (uiFt.length === 20 && uiFt.reduce((a, b) => a + b, 0) / 20 > 40) uiSetLite(true);
  } else if (!active) uiFt.length = 0;
  uiLastFrame = now; uiPrevActive = active;
}
function uiNearFar() {
  const d = camera.position.distanceTo(controls.target);
  const near = clamp(d / 250, 0.004, 0.08), far = Math.max(80, d * 30);
  if (Math.abs(near - camera.near) / camera.near > 0.2 || Math.abs(far - camera.far) / camera.far > 0.2) { camera.near = near; camera.far = far; camera.updateProjectionMatrix(); }
}
// Markeer-, aanwijs- en systeemmaterialen vooraf compileren (in kleine stukjes na de eerste weergave),
// zodat de eerste keer aanwijzen of selecteren niet hapert op het compileren van een shader.
function uiWarmMaterials() {
  const todo = [];
  const bases = [...new Set(MESHES.map(m => m.userData.base))];
  for (const b of [...bases, ...Object.values(SYS_MATS)]) todo.push(uiSelMat(b), uiHvMat(b));
  todo.push(...Object.values(SYS_MATS), GHOST, GHOST_HL, uiGhostHv, uiDimMat);
  const geo = new THREE.BoxGeometry(0.001, 0.001, 0.001);
  // kleine oefenscène met dezelfde soorten en aantallen lichten en dezelfde omgeving als de echte scène: dezelfde
  // shaderprogramma's, maar compile() hoeft niet elke keer alle 2.400 meshes van de auto langs
  const ws = new THREE.Scene();
  scene.traverse(o => { if (o.isLight) ws.add(o.clone()); });
  const step = () => {
    const batch = todo.splice(0, 4);
    if (!batch.length) { geo.dispose(); return; }
    ws.environment = scene.environment;
    const g = new THREE.Group();
    for (const mat of batch) { const m = new THREE.Mesh(geo, mat); m.position.set(0, -40, 0); g.add(m); }
    ws.add(g);
    try { renderer.compile(ws, camera); } catch (_) { } finally { ws.remove(g); }
    setTimeout(step, 40);
  };
  setTimeout(step, 600);
}
// R2: bij contextverlies een melding en preventDefault (anders herstelt de browser de context niet); bij herstel de
// omgevingskaart opnieuw maken (een rendertarget heeft geen kopie in het geheugen) en de melding weghalen
let uiContextLost = false;
canvas.addEventListener('webglcontextlost', e => {
  e.preventDefault(); uiContextLost = true;
  uiNotice('De 3D-weergave is onderbroken (de grafische context is verloren). De pagina herstelt dit meestal zelf; zo niet, laad haar dan opnieuw.');
});
canvas.addEventListener('webglcontextrestored', () => {
  uiContextLost = false;
  uiRemakeEnvironment(); // geometrie en gegevenstexturen zet three.js zelf opnieuw op de kaart
  uiNotice(null);
  requestRender();
});

/* ---------- render-lus ---------- */
controls.addEventListener('change', requestRender);
controls.addEventListener('start', () => { camAnim = null; uiUserCam = true; hideHint(); uiStopTour(); });
function uiTick(dt) {
  let active = stepExplode(dt);
  if (uiStepOff(dt)) active = true;
  if (stepOpen(dt)) active = true;
  if (uiStepPlay(dt)) active = true;
  if (stepCam(dt)) active = true;
  if (stepGround(dt)) active = true;
  if (uiStepFade(dt)) active = true; // U4
  if (uiVisDirty) { applyVisibility(); active = true; }
  return active;
}
function uiAfterAnim() {
  renderPanel();
  if (treeVisible()) renderTree();
  uiSyncExplode();
  if (uiHoverPos && !down) uiDoHover();
}
let last = performance.now(), uiWasActive = false, uiBatchDrawT = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.1, Math.max(0, (now - last) / 1000)); last = now;
  const active = uiTick(dt);
  controls.update();
  let drew = false;
  if (active || needs || controls.autoRotate) {
    uiSetDpr(uiPickDpr(active));
    uiNearFar();
    uiGroundSide();
    renderer.render(scene, camera);
    updateLabels();
    needs = false; drew = true;
    uiMeasure(now, active);
  }
  uiDebugFrame(now, dt, drew);
  // labelankers van de groep die opent in kleine porties vooruit bouwen (zie uiAnchorStep)
  if (uiAnchorFrame(active)) needs = true;
  // batches bouwen in de vrije tijd van het frame; opnieuw tekenen als de rij leeg is of hoogstens elke 300 ms
  // (een weergave per batch zou in software-WebGL de opbouw zelf vertragen); bij het opstarten hoogstens elke 1,5 s,
  // zodat de eerste batches niet op een rij volle weergaven van de losse auto hoeven te wachten
  const uiStart = now - uiReadyT < 8000;
  if (uiBatchOn && (uiBatchQ.size || uiBatchJob) && uiBatchStep(active ? 3 : (uiStart ? 25 : 10)) && (!uiBatchQ.size && !uiBatchJob || now - uiBatchDrawT > (uiStart ? 1500 : 300))) { needs = true; uiBatchDrawT = now; }
  if (uiTiming.batches === undefined && !uiBatchQ.size && !uiBatchJob) uiTiming.batches = Math.round(now);
  if (uiWasActive && !active) { needs = true; uiAfterAnim(); }
  uiWasActive = active;
}

/* ---------- debug-overlay (?debug=1): tekensnelheid, tekenopdrachten, pixelratio, lichte weergave en versie, zodat een
   melding van een echt apparaat meetbaar is (docs/telefoontest.md) ---------- */
const uiVersion = (document.querySelector('meta[name="s26u-version"]') || {}).content || '';
const uiDebug = (() => { try { return new URLSearchParams(location.search).get('debug') === '1'; } catch (_) { return false; } })();
const uiDbg = uiDebug ? { el: document.createElement('div'), t: 0, n: 0, acc: 0 } : null;
if (uiDbg) { uiDbg.el.id = 'debug'; uiDbg.el.setAttribute('aria-hidden', 'true'); document.getElementById('app').appendChild(uiDbg.el); }
function uiDebugFrame(now, dt, drew) {
  if (!uiDbg) return;
  if (drew) uiDbg.n++;
  uiDbg.acc += dt;
  if (now - uiDbg.t < 500) return;
  const i = renderer.info.render, fps = uiDbg.acc > 0 ? uiDbg.n / uiDbg.acc : 0;
  uiDbg.el.textContent = (uiDbg.n ? fps.toFixed(0) + ' fps' : 'rust') + ' · ' + i.calls + ' tekenopdrachten · ' + Math.round(i.triangles / 1000) + 'k driehoeken · dpr ' + renderer.getPixelRatio().toFixed(2) + (uiLite ? ' · lichte weergave' : '') + ' · versie ' + uiVersion;
  uiDbg.t = now; uiDbg.n = 0; uiDbg.acc = 0;
}

/* ---------- deelbare stand in de URL: ?preset=id, of ?open=naam,naam (modus Openen; een naam die vaker voorkomt als pad zonder
   wortel). De URL volgt de stand met replaceState, zodat de adresbalk altijd een werkende link is. ---------- */
let uiUrlLast = null;
function uiUrlSync() {
  let u; try { u = new URL(location.href); } catch (_) { return; }
  if (!/^https?:$/.test(u.protocol)) return;
  const q = u.searchParams; q.delete('preset'); q.delete('open');
  if (ACTIVE_PRESET && appPresetById.has(ACTIVE_PRESET) && ACTIVE_PRESET !== 'assembled') q.set('preset', ACTIVE_PRESET);
  else if (OPENMODE) {
    const open = OPENERS.filter(n => n.ot > 0).map(n => uiNameCount.get(n.name) === 1 ? n.name : uiPathOf(n).replace(/^[^/]+\//, ''));
    if (open.length) q.set('open', open.join(','));
  }
  const s = q.toString(), next = u.pathname + (s ? '?' + s : '') + u.hash;
  if (next === uiUrlLast) return;
  uiUrlLast = next;
  try { history.replaceState(history.state, '', next); } catch (_) { }
}
function uiUrlApply() {
  let q; try { q = new URLSearchParams(location.search); } catch (_) { return; }
  const pid = q.get('preset'), open = q.get('open');
  if (pid) {
    const p = appPresetById.get(pid);
    if (p && !p.tour && appPresetOk(p)) { appApplyPreset(p, { noHistory: true }); finishAll(); return; }
  }
  if (open) {
    const refs = open.split(',').map(x => x.trim()).filter(Boolean);
    const p = { id: 'url', cat: 'Openen', label: 'Gedeelde stand', note: 'De stand uit de gedeelde link.', opens: refs };
    if (refs.length && appPresetOk(p)) { appApplyPreset(p, { noHistory: true }); finishAll(); }
  }
}

/* ---------- start ---------- */
let uiReady = false, uiReadyT = 0;
uiTiming.startUp = Math.round(performance.now());
applyVisibility();
if (uiSide()) els.sheet.dataset.state = 'open';
resize();
uiPnBuild();
select(ROOT);
uiBuildCats();
uiSyncUndo();
updateGround();
{ const f = uiFitPoints(uiCollect([ROOT], true), DIRS.iso, 1.04); if (f) { camera.position.copy(f.pos); controls.target.copy(f.target); } uiLastFit = { preset: appPresetById.get('assembled') }; }
controls.update();
uiTiming.render0 = Math.round(performance.now());
LOADING.textContent = 'Eerste weergave…';
renderer.render(scene, camera);
LOADING.classList.add('gone');
uiTiming.firstFrame = Math.round(performance.now());
uiInitHint();
uiUrlApply();
requestAnimationFrame(t => { last = t; uiReady = true; uiReadyT = performance.now(); uiTiming.interactive = Math.round(uiReadyT); loop(t); });
uiWarmMaterials();
{ const errs = appCheckPresets(); if (errs.length) console.warn('presets: ' + errs.join('; ')); }
// labelbreedtes opnieuw meten zodra de lettertypen er zijn
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { for (const n of ALL) n._lw = null; uiUiChanged(); layoutView(); });

function finishAll() {
  if (uiRefitTimer) uiRefitNow();
  for (const n of uiAnim) { n.delay = 0; n.k = 1; n.amt = n.target; n.u = n.amt; placeKids(n); }
  uiAnim.clear();
  for (const n of uiOffAnim) { n.odelay = 0; n.ok = 1; n.off.copy(n.off1); if (n.off.lengthSq() === 0) n.hasOff = false; uiPlace(n); }
  uiOffAnim.clear();
  for (const n of uiOpenAnim) { n.opk = 1; n.ou = n.ot; uiOpenApply(n); }
  if (uiOpenAnim.size) { uiOpenAnim.clear(); uiStrutSync(); }
  if (uiPlayS) { const s = uiPlayS; uiPlayS = null; uiApplyX(s.w, s.x1, true); updateGround(); }
  if (camAnim) { camera.position.copy(camAnim.p1); controls.target.copy(camAnim.t1); camAnim = null; }
  uiFadeEnd(); // U4: ook de fade bij isoleren is dan klaar
  applyVisibility();
  ground.position.y = groundTarget; blob.position.y = groundTarget + 0.002;
  controls.update();
  ROOT.obj.updateMatrixWorld(true); camera.updateMatrixWorld();
  uiAnchorPrefetch(); uiAnchorFlush();
  uiAfterAnim(); uiSyncCats(); uiSyncLabels();
  requestRender();
}
// Frametijd zonder finishAll(): klapt de groep uit en draait de echte animatiestap N keer
// (uitklappen, verschuivingen, wereldmatrices en labelindeling, zonder renderer.render).
function uiProfileFrames(name, frames = 120, cold = false) {
  const g = typeof name === 'string' ? byName(name) : name;
  if (!g) return null;
  const snap = uiSnap();
  collapseTree(g); finishAll();
  const oldCtx = CTX, oldForce = uiLabelForce;
  if (cold) { uiAnchorQ.clear(); uiAnchorJob = null; uiPfGroup = null; uiGeoAnchor = new WeakMap(); for (const n of ALL) { n._la = null; n._lf = null; } }
  explodeAllUnder(g); CTX = g; uiLabelForce = false;
  const times = []; let aMax = 0;
  for (let i = 0; i < frames; i++) {
    const t0 = performance.now();
    uiTick(1 / 60);
    ROOT.obj.updateMatrixWorld();
    const t1 = performance.now();
    uiAnchorFrame(true);
    aMax = Math.max(aMax, performance.now() - t1);
    updateLabels();
    times.push(performance.now() - t0);
  }
  uiRestore(snap, true); CTX = oldCtx; uiLabelForce = oldForce; finishAll();
  const s = times.slice().sort((a, b) => a - b), q = f => s[Math.min(s.length - 1, Math.floor(f * s.length))];
  return { frames, p50: +q(0.5).toFixed(3), p95: +q(0.95).toFixed(3), max: +s[s.length - 1].toFixed(3), mean: +(times.reduce((a, b) => a + b, 0) / frames).toFixed(3), anchorMax: +aMax.toFixed(3) };
}
function uiState() {
  const w = uiWorking(), L = uiLevels(w).length;
  return {
    open: ASMS.filter(n => n.target > 0.5).map(n => n.name), selected: (SEL || ROOT).name, iso: ISO.map(n => n.name), xray: XRAY,
    explode: { group: w.name, value: L ? +(uiExplodeX(w) / L).toFixed(4) : 0, levels: L }, history: uiHist.length,
    lifted: uiLifted ? uiLifted.name : null, preset: ACTIVE_PRESET, dim: DIM ? DIM.name : null, mode: MODE, openMode: OPENMODE, openers: OPENERS.filter(n => n.ot > 0).map(n => n.name), tour: !!appTour, playing: !!uiPlayS, sys: SYSCOL,
  };
}
function uiFrameOf(names) {
  const nodes = (Array.isArray(names) ? names : [names]).map(n => (typeof n === 'string' ? byName(n) : n)).filter(Boolean);
  const v = uiFreeView();
  const b = nodes.length ? uiProject(uiCollect(nodes, false)) : null;
  const view = { x: v.x0, y: v.y0, w: v.x1 - v.x0, h: v.y1 - v.y0 };
  if (!b) return { box: null, view, inside: false, cover: 0 };
  const box = { x: b.x0, y: b.y0, w: b.x1 - b.x0, h: b.y1 - b.y0 };
  const ix = Math.max(0, Math.min(b.x1, v.x1) - Math.max(b.x0, v.x0)), iy = Math.max(0, Math.min(b.y1, v.y1) - Math.max(b.y0, v.y0));
  const inside = b.x0 >= v.x0 - 1 && b.y0 >= v.y0 - 1 && b.x1 <= v.x1 + 1 && b.y1 <= v.y1 + 1;
  return { box, view, inside, cover: +(ix * iy / Math.max(1, view.w * view.h)).toFixed(4) };
}
// Testkoppeling. Aanroepen die de stand veranderen tellen als interactie: de hint verdwijnt direct
// en de presetmarkering vervalt (een preset die je daarna kiest, zet hem weer).
const uiApi = (f, changes) => (...a) => { hideHint(true); const r = f(...a); if (changes) { clearPreset(); uiAfterAction(); } return r; };
window.__s26u = {
  version: uiVersion || null,  // versiestempel uit build.py (VERSION plus inhoudshash)
  finishAll, ROOT, ALL, MESHES, PRESETS, byName,
  select: uiApi(select), tapNode: uiApi(tapNode), focusNodes: uiApi(focusNodes),
  setTarget: uiApi(setTarget, true), explodeAllUnder: uiApi(explodeAllUnder, true), collapseAll: uiApi(collapseAll, true), isolate: uiApi(isolate, true),
  // klaar: gebouwd, eerste keer getekend en bedienbaar; op de batches van de beginstand wordt hoogstens 2 s gewacht
  // (tests die gebundelde aantallen meten roepen eerst batchFlush() aan)
  get ready() {
    const ok = uiReady && (!uiBatchOn || (!uiBatchQ.size && !uiBatchJob) || performance.now() - uiReadyT > 2000);
    if (ok && uiTiming.ready === undefined) uiTiming.ready = Math.round(performance.now());
    return ok;
  },
  timing: () => Object.assign({ batchesDone: !uiBatchQ.size && !uiBatchJob }, uiTiming),
  byPath: uiByPath,
  preset: id => { hideHint(true); return uiRunPreset(id); },
  presetList: () => PRESETS.filter(appPresetOk).map(p => ({ id: p.id, cat: p.cat, label: p.label, key: p.key || null, subject: p.tour ? [] : appSubject(p).map(n => n.name), tour: !!p.tour })),
  checkPresets: appCheckPresets,
  state: uiState,
  pickAt: (x, y) => { const n = pick(x, y); return n ? n.name : null; },
  pickNodeAt: (x, y, loose) => pick(x, y, loose),
  hoverTarget: uiHoverTarget,
  hoverNode: (x, y) => uiActTarget(pick(x, y)),
  sel: () => SEL,
  liftedNode: () => uiLifted,
  nodeById: id => uiById.get(id),
  undo: () => uiUndo(),
  setExplode: uiSetExplodeValue,
  play: uiPlay,
  labelRects: uiLabelRects,
  uiRects,
  frameOf: uiFrameOf,
  freeView: () => { const v = uiFreeView(); return { x: v.x0, y: v.y0, w: v.x1 - v.x0, h: v.y1 - v.y0 }; },
  profileFrames: uiProfileFrames,
  setMode: uiSetMode,
  dimInfo: () => ({ on: uiDimOn, focus: DIM ? DIM.name : null, dimmed: uiDimSet ? MESHES.filter(m => !uiDimSet.has(m)).length : 0 }),
  setDimOn: on => { uiDimOn = !!on; $('tDim').checked = uiDimOn; if (!uiDimOn) uiSetDim(null); applyMats(); uiAfterAction(); return uiDimOn; },
  dive: n => uiDive(typeof n === 'string' ? byName(n) : n),
  collapseAt: n => uiCollapseAt(typeof n === 'string' ? byName(n) : n),
  stopTour: uiStopTour,
  get lite() { return uiLite; },
  batching: on => { if (on !== undefined) { uiSetBatching(on); $('tBatch').checked = uiBatchOn; requestRender(); } return uiBatchOn; },
  batchFlush: () => { uiBatchFlush(); requestRender(); return uiBatchStats(); },
  batchStats: uiBatchStats,
  batchedGroups: () => [...uiBatched].map(g => g.name),
  // tekentijd (software-rendering, alleen om standen te vergelijken): gemiddelde ms per render, met gl.finish aan beide kanten
  renderMs: (k = 5) => { const gl = renderer.getContext(); gl.finish(); const t = performance.now(); for (let i = 0; i < k; i++) renderer.render(scene, camera); gl.finish(); return +((performance.now() - t) / k).toFixed(2); },
  drawCalls: () => { renderer.info.reset(); renderer.render(scene, camera); return renderer.info.render.calls; },
  // openmodus (kern): leiders met hun stand; setOpen(naam, 0..1, direct); openAll(0..1, direct)
  openers: () => OPENERS.map(n => ({ name: n.name, label: n.opn.label || n.name, type: n.opn.type, open: +n.ou.toFixed(4), target: n.ot, followers: n.opn.followers.map(f => f.name) })),
  setOpenMode: on => { hideHint(true); uiSetOpenMode(on); return OPENMODE; },
  openPlan: x => { const n = typeof x === 'string' ? byName(x) : x; const pl = n && uiOpenPlan(n); return pl ? { opener: pl.n.name, open: pl.open } : null; },
  pnRebuild: uiPnBuild, pnCheck: uiPnCheck, pnOf: x => { const n = typeof x === 'string' ? (uiByPath(x) || byName(x)) : x; const r = n && uiPnRec(n); return r ? { kind: r.kind, unit: r.id, rule: r.rule || null } : null; },
  setOpen: (name, v, instant) => { const r = uiSetOpen(name, v, instant); uiSyncOpenUi(); renderPanel(); requestRender(); return r; },
  openAll: (v, instant) => { for (const n of OPENERS) uiSetOpen(n, v, instant); uiSyncOpenUi(); renderPanel(); requestRender(); return OPENERS.length; },
  // golf 5c-1: toetsbare toestand van de nieuwe functies
  get lastError() { return window.__s26uLastError || null; },           // R1b: laatste fout uit de globale handler
  get contextLost() { return uiContextLost; },                           // R2
  lastFit: () => !uiLastFit ? null : uiLastFit.preset ? { preset: uiLastFit.preset.id } : { nodes: uiLastFit.nodes.map(n => n.name), dir: uiLastFit.dir ? uiLastFit.dir.toArray() : null, pad: uiLastFit.pad }, // R3
  tourState: () => appTour ? { step: appTour.i, steps: appTourSteps.length, paused: !!appTour.paused, auto: !!appTour.auto, preset: appTourSteps[appTour.i] } : null, // R4
  tour: { pause: () => uiTourPause(true), resume: () => uiTourPause(false), prev: () => uiTourStep(-1), next: () => uiTourStep(1) },
  labelsMore: () => uiLabelsMore,                                       // U2
  get hintStage() { return uiHintStage; }, hintNext: uiHintNext,        // U8
  get fading() { return !!uiFade; },                                    // U4
  isolated: () => ISO.map(n => n.name),                                 // U4
  theme: () => ({ choice: uiThemeChoice(), dark: getComputedStyle(document.documentElement).getPropertyValue('color-scheme').trim() === 'dark' }), // U5
  setTheme: uiSetTheme,
  norm: uiNorm, searchTerms: uiSearchTerms,                             // U10
  saveImage: uiSaveImage,                                               // U9
  toast: uiToast,                                                       // U8
};

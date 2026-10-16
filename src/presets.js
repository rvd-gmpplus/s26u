/* ===================== presets: gegevens en één toepassingsmotor ===================== */
// Elke preset is alleen gegevens. Velden:
//   id, cat (categorie), label, key (sneltoets), note (wat je ziet, één regel),
//   iso: [ankers] alleen deze tonen, open: [groepen] precies deze uitklappen, deep: [groepen] met hun hele deelboom,
//   pull: { naam: [dx,dy,dz] } hele groep verschuiven (in het frame van de ouder), xray, sys (kleuren per systeem),
//   spread (standaard 1), cam: { dir: [x,y,z], pad }, select: naam, labels: naam (van welke groep de kinderen een label krijgen),
//   labelOnly: [namen] alleen deze kinderen van de labelgroep krijgen een label,
//   frame: [namen] wat in beeld moet (standaard iso, anders het hele toestel),
//   opens: [openers] of 'all': de modus Openen met precies deze openers open (pad of unieke naam; een volger telt als zijn
//   leider). Zonder frame is het kader de open.look.nodes van de eerste opener, met zijn look.dir als richting. Alle andere
//   presets zetten de modus terug op Uitklappen en sluiten de openers.
//   soon: true wacht op een opener van een andere eigenaar: oplossen de namen nog niet, dan verschijnt de preset niet in de
//   menu's en geeft checkPresets() geen fout; checkPresets(true) toetst ook deze presets.
// Alleen ankernamen uit contract §8 / tools/anchors.json. Een preset waarvan een naam niet oplost, verschijnt niet in de menu's.
const appPhone = 'Samsung Galaxy S26 Ultra';
const appCats = ['Overzicht', 'Buitenkant', 'Binnenwerk', "Camera's", 'Reparatie', 'Openen'];
// Camerarichtingen: de telefoon ligt met het scherm op de vloer; +y kijkt op de achterkant, -y op het scherm.
const PRESETS = [
  // Overzicht
  { id: 'assembled', cat: 'Overzicht', label: 'Gemonteerd', key: '0', note: 'Het complete toestel in elkaar, in ¾-aanzicht.', cam: { dir: [0.8, 1.15, 0.9], pad: 1.04 } },
  { id: 'main', cat: 'Overzicht', label: 'Hoofdgroepen', key: '1', note: 'De acht hoofdgroepen uit elkaar, van achterglas tot scherm.', open: [appPhone], labels: appPhone, cam: { dir: [1, 0.75, 0.9], pad: 1.04 } },
  { id: 'xray', cat: 'Overzicht', label: 'Röntgen', key: '8', note: 'Achterglas, frame en scherm doorzichtig: het binnenwerk in het gemonteerde toestel.', xray: true, cam: { dir: [0.8, 1.15, 0.9], pad: 1.03 } },
  { id: 'everything', cat: 'Overzicht', label: 'Alles uit elkaar', key: '9', note: 'Elke groep uitgeklapt tot op het kleinste onderdeel, gekleurd per hoofdgroep.', deep: [appPhone], sys: true, labels: appPhone, cam: { dir: [1, 0.8, 0.9], pad: 1.0 } },
  { id: 'tour', cat: 'Overzicht', label: 'Rondleiding', note: 'Speelt de belangrijkste presets na elkaar af, van buiten naar binnen en de batterijwissel.', tour: true },
  // Buitenkant
  { id: 'back', cat: 'Buitenkant', label: 'Achterkant', key: '2', note: 'Wit achterglas met het camera-eiland, de lijmrand en de laadspoel met NFC, uit elkaar.', iso: ['Achterkant'], open: ['Achterkant'], labels: 'Achterkant', cam: { dir: [0.8, 1.1, 0.9], pad: 1.04 } },
  { id: 'island', cat: 'Buitenkant', label: 'Camera-eiland', note: 'Het verhoogde eiland met drie grote lensringen; ernaast de periscoop, de flitser en de laser-AF.', iso: ['Camera-eiland'], deep: ['Camera-eiland'], labels: 'Camera-eiland', cam: { dir: [0.5, 1, 0.7], pad: 1.08 } },
  { id: 'wireless', cat: 'Buitenkant', label: 'Draadloos laden en NFC', note: 'Laadspoel, ferrietplaat, NFC-antenne en grafietfolie onder het achterglas.', iso: ['Draadloos laden en NFC'], open: ['Draadloos laden en NFC'], labels: 'Draadloos laden en NFC', cam: { dir: [0.5, 1, 0.8], pad: 1.06 } },
  { id: 'frame', cat: 'Buitenkant', label: 'Frame en knoppen', note: 'Aluminium framering met antennesplitsingen, middenplaat, S Pen-silo en zijknoppen.', iso: ['Behuizing'], open: ['Behuizing', 'Middenframe'], labels: 'Behuizing', cam: { dir: [0.9, 1, 0.9], pad: 1.04 } },
  { id: 'screen', cat: 'Buitenkant', label: 'Scherm', key: '6', note: '6,9 inch QHD+ Dynamic AMOLED 2X: coverglas, paneelpakket, digitizer, vingerafdruksensor en displayflex.', iso: ['Scherm'], open: ['Scherm', 'Displaymodule'], labels: 'Displaymodule', cam: { dir: [0.7, -1, 0.7], pad: 1.04 } },
  // Binnenwerk
  { id: 'board', cat: 'Binnenwerk', label: 'Moederbord', key: '3', note: 'Sandwich van hoofdprint, interposer en RF-print, met afschermkappen en de bovenafdekplaat.', iso: ['Moederbord'], open: ['Moederbord'], labels: 'Moederbord', cam: { dir: [0.9, 1.1, 0.7], pad: 1.06 } },
  { id: 'soc', cat: 'Binnenwerk', label: 'Chip en geheugen', note: 'Snapdragon 8 Elite Gen 5 for Galaxy met 16 GB werkgeheugen erop, en 1 TB opslag.', iso: ['Hoofdprint'], open: ['Hoofdprint', 'SoC met geheugen'], labels: 'SoC met geheugen', select: 'SoC met geheugen', frame: ['Hoofdprint'], cam: { dir: [0.6, 1, 0.5], pad: 1.06 } },
  { id: 'power', cat: 'Binnenwerk', label: 'Batterij', key: '4', note: '5000 mAh: cel, kunststof omhulling met lijm, treklip en beveiligingsprint, uit elkaar.', iso: ['Batterij'], deep: ['Batterij'], labels: 'Batterij', cam: { dir: [0.8, 1.1, 0.9], pad: 1.05 } },
  { id: 'cooling', cat: 'Binnenwerk', label: 'Koeling', note: 'Herontworpen vapor chamber met de koelstapel onder de processor.', iso: ['Vapor chamber', 'Koelstapel processor'], deep: ['Vapor chamber', 'Koelstapel processor'], labels: 'Vapor chamber', cam: { dir: [0.7, 1.1, 0.6], pad: 1.05 } },
  { id: 'periph', cat: 'Binnenwerk', label: 'Onderin en aan de randen', note: 'USB-C-subbord, SIM-lade, luidsprekers, trilmotor en de hoofdflex.', iso: ['Randapparatuur'], open: ['Randapparatuur'], labels: 'Randapparatuur', cam: { dir: [0.6, 1.1, 1], pad: 1.05 } },
  { id: 'usbc', cat: 'Binnenwerk', label: 'USB-C-subbord', note: 'Subbord met USB-C-poort, SIM-kaartlezer en microfoon, uit elkaar.', iso: ['USB-C-subbord'], deep: ['USB-C-subbord'], labels: 'USB-C-subbord', cam: { dir: [0.5, 0.9, 1], pad: 1.06 } },
  { id: 'pen', cat: 'Binnenwerk', label: 'S Pen', key: '7', note: 'De pen uit elkaar: punt, behuizing, knop, digitizerspoel, resonantiekring en klikmechanisme.', iso: ['S Pen'], deep: ['S Pen'], labels: 'S Pen', cam: { dir: [1, 0.6, 0.3], pad: 1.05 } },
  // Camera's
  { id: 'cameras', cat: "Camera's", label: "Alle camera's", key: '5', note: '200 MP hoofdcamera, 50 MP ultragroothoek, 10 MP 3×, 50 MP periscoop 5×, laser-AF, flitser en de 12 MP selfiecamera.', iso: ["Camera's"], open: ["Camera's", 'Camerakolom'], labels: "Camera's", cam: { dir: [0.8, 1, 0.6], pad: 1.06 } },
  { id: 'mainCam', cat: "Camera's", label: 'Hoofdcamera 200 MP', note: 'Lensbuis, OIS- en AF-actuator, ir-filter en beeldsensor van de hoofdcamera (f/1,4), uit elkaar.', iso: ['Hoofdcamera 200 MP'], deep: ['Hoofdcamera 200 MP'], labels: 'Hoofdcamera 200 MP', cam: { dir: [0.8, 0.8, 0.6], pad: 1.08 } },
  { id: 'periscope', cat: "Camera's", label: 'Periscoop 5×', note: 'Het licht gaat via een prisma 90 graden om naar een lensgroep en sensor die plat liggen (f/2,9).', iso: ['Periscoopcamera 50 MP (5×)'], deep: ['Periscoopcamera 50 MP (5×)'], labels: 'Periscoopcamera 50 MP (5×)', cam: { dir: [1, 0.7, 0.4], pad: 1.08 } },
  { id: 'selfie', cat: "Camera's", label: 'Selfiecamera', note: '12 MP selfiecamera (f/2,2) onder het moederbord, kijkt door het gat in het scherm.', iso: ['Selfiecamera 12 MP'], deep: ['Selfiecamera 12 MP'], labels: 'Selfiecamera 12 MP', cam: { dir: [0.7, -0.8, 0.6], pad: 1.1 } },
  // Reparatie (volgorde van de iFixit-teardown)
  { id: 'rep1', cat: 'Reparatie', label: '1. Achterglas eraf', note: 'Het achterglas wordt verwarmd en losgewrikt; daaronder liggen laadspoel, moederbordafdekplaat en batterij.', opens: ['Achterkant'], frame: [appPhone], cam: { dir: [0.35, 1.2, 0.75], pad: 1.04 } },
  { id: 'rep2', cat: 'Reparatie', label: '2. Luidspreker eruit', note: 'Onderafdekplaat en luidspreker onderin gaan eruit; daarna zijn de batterijkabels vrij.', opens: ['Luidspreker onder'], frame: ['Behuizing', 'Luidspreker onder'], cam: { dir: [0.3, 1.2, 0.9], pad: 1.06 } },
  { id: 'rep3', cat: 'Reparatie', label: '3. Batterij eruit', note: 'De batterij komt met de treklip uit de kunststof omhulling met lijm (volgens iFixit eenvoudig).', opens: ['Luidspreker onder', 'Batterij'], frame: ['Behuizing', 'Batterij'], cam: { dir: [0.45, 1.2, 0.8], pad: 1.06 } },
  { id: 'rep4', cat: 'Reparatie', label: 'Scherm eraf', note: 'Het scherm komt pas los als vrijwel alles eruit is: de connector zit aan de achterkant (iFixit).', opens: ['Scherm'], cam: { dir: [0.7, -0.9, 0.8], pad: 1.05 } },
  // Openen
  { id: 'openSim', cat: 'Openen', label: 'SIM-lade', note: 'De SIM-lade met nano-SIM schuift uit de onderrand.', opens: ['SIM-lade'] },
  { id: 'openPen', cat: 'Openen', label: 'S Pen', note: 'De S Pen schuift uit de silo in de onderrand.', opens: ['S Pen'] },
  { id: 'openAll', cat: 'Openen', label: 'Alles open', note: 'Alle openers tegelijk open.', opens: 'all', frame: [appPhone], cam: { dir: [1, 0.9, 1], pad: 1.04 } },
];
const appTourSteps = ['assembled', 'main', 'back', 'cameras', 'board', 'cooling', 'rep1', 'rep2', 'rep3', 'openPen', 'everything', 'assembled'];
const appPresetById = new Map(PRESETS.map(p => [p.id, p]));

function appPresetNames(p) {
  return [...(p.iso || []), ...(p.open || []), ...(p.deep || []), ...Object.keys(p.pull || {}), ...(p.select ? [p.select] : []), ...(p.labels ? [p.labels] : []), ...(p.frame || [])];
}
// verwijzing naar een opener (pad of unieke naam) zonder consolefout; geeft de leider van de opener, anders null
function appOpenRef(ref) {
  const n = !ref ? null : ref.includes('/') ? uiByPath(ref) : (uiNameCount.get(ref) === 1 ? uiNames.get(ref) : null);
  return n && n.opn ? (n.opn.lead || n) : null;
}
function appPresetErrors(p) {
  const err = [];
  if (p.opens && p.opens !== 'all') for (const ref of p.opens) if (!appOpenRef(ref)) err.push(`preset "${p.label}": opener "${ref}" bestaat niet of is geen opener`);
  for (const name of new Set(appPresetNames(p))) {
    const c = uiNameCount.get(name) || 0;
    if (c === 0) err.push(`preset "${p.label}": naam "${name}" bestaat niet`);
    else if (c > 1) err.push(`preset "${p.label}": naam "${name}" komt ${c}x voor`);
  }
  if (err.length) return err;
  const iso = (p.iso || []).map(byName);
  const scope = iso.length ? iso : [ROOT];
  for (const name of [...(p.open || []), ...(p.deep || []), ...(p.select ? [p.select] : []), ...(p.labels ? [p.labels] : [])]) {
    const n = byName(name);
    if (!scope.some(r => isUnder(n, r))) err.push(`preset "${p.label}": "${name}" ligt niet onder ${iso.length ? (p.iso || []).join(' of ') : 'het toestel'}`);
  }
  // labelOnly: namen van kinderen van de labelgroep (niet uniek in de boom); een typefout verbergt anders stil labels
  if (p.labelOnly && p.labels) {
    const kids = byName(p.labels).kids.map(k => k.name);
    for (const name of p.labelOnly) if (!kids.includes(name)) err.push(`preset "${p.label}": labelOnly "${name}" is geen kind van "${p.labels}"`);
  }
  return err;
}
function appCheckPresets(strict) {
  const err = [], ids = new Set(), keys = new Set();
  for (const p of PRESETS) {
    if (ids.has(p.id)) err.push(`preset-id "${p.id}" komt twee keer voor`); ids.add(p.id);
    if (p.key) { if (keys.has(p.key)) err.push(`sneltoets ${p.key} komt twee keer voor`); keys.add(p.key); }
    if (!appCats.includes(p.cat)) err.push(`preset "${p.label}": onbekende categorie ${p.cat}`);
    if (!p.soon || strict || !appPresetErrors(p).length) err.push(...appPresetErrors(p));
  }
  for (const id of appTourSteps) if (!appPresetById.has(id)) err.push(`rondleiding: preset "${id}" bestaat niet`);
  return err;
}
const appPresetOk = p => p.tour || appPresetErrors(p).length === 0;
function appSubject(p) {
  if (p.opens && p.opens !== 'all' && !p.frame) { // het kader van de eerste opener (open.look.nodes), anders de opener zelf
    const l = appOpenRef(p.opens[0]), lk = l && l.opn.look, out = [];
    for (const r of lk && lk.nodes ? lk.nodes : [l]) { const m = typeof r === 'string' ? (r.includes('/') ? uiByPath(r) : uiNames.get(r)) : r; if (m && !out.includes(m)) out.push(m); }
    if (out.length) return out;
  }
  const names = p.frame || (p.iso && p.iso.length ? p.iso : [appPhone]);
  return names.map(byName).filter(Boolean);
}
// camerarichting van een preset: cam.dir, anders de look.dir van zijn eerste opener, anders het ¾-aanzicht
function appPresetDir(p) {
  if (p.cam && p.cam.dir) return V3(...p.cam.dir);
  const l = p.opens && p.opens !== 'all' ? appOpenRef(p.opens[0]) : null, d = l && l.opn.look && l.opn.look.dir;
  return d ? V3(...d) : DIRS.iso;
}
// openers die een preset open wil hebben (leiders)
function appWantOpen(p) {
  const out = new Set();
  if (p.opens === 'all') OPENERS.forEach(n => out.add(n));
  else for (const r of p.opens || []) { const l = appOpenRef(r); if (l) out.add(l); }
  return out;
}

/* ---------- toepassen in fasen: (1) dicht wat dicht moet (diepste eerst), (2) camera naar de eindkadrering
   terwijl (3) open gaat wat open moet (ondiepste eerst). Alles samen hoogstens 2,5 s. ---------- */
function appApplyPreset(p, opt = {}) {
  if (!p || p.tour || !appPresetOk(p)) return false;
  uiStopPlay();
  if (!opt.tour) uiStopTour();
  if (!opt.noHistory) uiPush();
  uiSetDim(null); // U19: een preset begint zonder gedimde rest
  // modus en openers: alleen een preset met opens zet Openen aan; elke andere zet Uitklappen terug en sluit de openers
  OPENMODE = opt.openMode != null ? opt.openMode : !!p.opens;
  const wantOpen = appWantOpen(p);
  for (const n of OPENERS) if (!wantOpen.has(n)) uiSetOpen(n, 0);   // eerst sluiten (needs sluit mee), dan openen
  for (const n of wantOpen) uiSetOpen(n, 1);
  const want = new Set();
  for (const name of p.open || []) want.add(byName(name));
  for (const name of p.deep || []) subtree(byName(name)).forEach(a => { if (a.asm) want.add(a); });
  // isolatie en weergave (U4: wat door de isolatie uit beeld gaat, fadet uit; zie uiFadeFrom in app1.js)
  const wasVisible = uiVisibleMeshes();
  ISO = (p.iso || []).map(byName);
  XRAY = !!p.xray; SYSCOL = !!p.sys;
  if (SPREAD !== (p.spread || 1)) uiSetSpread(p.spread || 1, false);
  uiDrop();
  // in de eindstand verborgen groepen (buiten de isolatie en niet op het pad erheen) springen direct dicht
  const onPath = new Set(); for (const r of ISO) for (let a = r; a; a = a.parent) onPath.add(a);
  const shown = a => !ISO.length || onPath.has(a) || uiInScope(a);
  const closing = [], opening = [];
  for (const a of ASMS) {
    const t = want.has(a) ? 1 : 0;
    if (a.target === t && !uiAnim.has(a)) continue;
    if (!shown(a)) { uiSetNow(a, t); continue; }
    (t ? opening : closing).push(a);
  }
  const span = list => list.length ? [Math.min(...list.map(a => a.depth)), Math.max(...list.map(a => a.depth))] : [0, 0];
  const [c0, c1] = span(closing), [o0, o1] = span(opening);
  const cStag = closing.length ? Math.min(0.06, 0.3 / Math.max(1, c1 - c0)) : 0;
  const cDur = 0.45, closeT = closing.length ? cDur + cStag * (c1 - c0) : 0;
  const oDur = 0.7, oStag = opening.length ? Math.min(0.22, Math.max(0.04, (2.35 - closeT - oDur) / Math.max(1, o1 - o0))) : 0;
  closing.forEach(a => setTarget(a, 0, cStag * (c1 - a.depth), cDur));
  opening.forEach(a => setTarget(a, 1, closeT + oStag * (a.depth - o0), oDur));
  // optillen
  const pulls = new Map(Object.entries(p.pull || {}).map(([k, v]) => [byName(k), v]));
  for (const n of ALL) {
    const v = pulls.get(n);
    if (v) { n.pull.set(v[0], v[1], v[2]); uiOffTo(n, 1.0, closeT); }
    else if (n.pull.lengthSq() > 0) { n.pull.set(0, 0, 0); uiOffTo(n, 0.6, 0); }
  }
  applyVisibility(); uiFadeFrom(wasVisible); applyMats();
  uiSyncIso(); // U4: de badge staat in het dock en verandert het vrije beeld; eerst bijwerken, dan pas kadreren
  // selectie, labels en camera
  CTX = p.labels ? byName(p.labels) : (p.select ? byName(p.select) : ((p.open || p.deep || []).length ? byName((p.open || p.deep)[0]) : null));
  uiLabelForce = !!p.labels;
  ACTIVE_PRESET = p.id;
  const sel = p.select ? byName(p.select) : (ISO.length === 1 ? ISO[0] : ROOT);
  select(sel, { keepPreset: true });
  const openSpan = opening.length ? oDur + oStag * (o1 - o0) : 0;
  const camDelay = closing.length ? closeT * 0.6 : 0;
  const camDur = clamp(Math.max(0.9, openSpan + closeT - camDelay), 0.9, 2.5 - camDelay);
  const cam = p.cam || {};
  focusNodes(appSubject(p), appPresetDir(p), cam.pad || 1.06, { dur: camDur, delay: camDelay });
  uiLastFit = { preset: p }; // R3: een formaatwissel kadreert opnieuw op het onderwerp van deze preset
  if (REDUCED) finishAll();
  uiAfterAction();
  requestRender();
  return true;
}

/* ---------- rondleiding ---------- */
// R4: de rondleiding kent pauze en hervat (knop, of vanzelf als het tabblad verborgen is), vorige en volgende.
// appTour: { i: huidige stap, timer, due: tijdstip van de volgende stap, left: resttijd bij pauze, paused, auto }
const APP_TOUR_STEP_MS = 5000, APP_TOUR_STEP_REDUCED_MS = 4500;
let appTour = null;
function uiStartTour() {
  uiStopPlay();
  uiPush();
  appTour = { i: -1, timer: 0, due: 0, left: 0, paused: false, auto: false };
  uiTourStep(1);
  uiSyncTour();
}
// dir = 1 volgende stap, -1 vorige; een stap waarvan de namen niet (meer) oplossen, wordt in die richting overgeslagen
// (de waarschuwing staat al bij het starten in de console). Voorbij het einde stopt de rondleiding; vóór het begin blijft hij staan.
function uiTourStep(dir) {
  if (!appTour) return;
  dir = dir === -1 ? -1 : 1;
  clearTimeout(appTour.timer);
  let i = appTour.i + dir, p = null;
  for (; i >= 0 && i < appTourSteps.length; i += dir) { const q = appPresetById.get(appTourSteps[i]); if (q && appPresetOk(q)) { p = q; break; } }
  if (!p) { if (dir > 0) uiStopTour(); else uiTourArm(); return; }
  appTour.i = i;
  // eerst het bijschrift: op een telefoon houdt het vrije beeld er rekening mee, zodat de camera het toestel eronder inpast
  uiTourCaption(p, i, appTourSteps.length);
  appApplyPreset(p, { tour: true, noHistory: true });
  uiTourArm();
  uiSyncTour();
}
function uiTourArm() {
  if (!appTour || appTour.paused) return;
  const ms = REDUCED ? APP_TOUR_STEP_REDUCED_MS : APP_TOUR_STEP_MS;
  appTour.due = performance.now() + ms;
  appTour.timer = setTimeout(uiTourStep, ms);
}
function uiTourPause(on) {
  if (!appTour || appTour.paused === !!on) return;
  appTour.paused = !!on;
  if (on) { clearTimeout(appTour.timer); appTour.left = Math.max(800, appTour.due - performance.now()); }
  else { appTour.due = performance.now() + appTour.left; appTour.timer = setTimeout(uiTourStep, appTour.left); }
  uiSyncTour();
}
function uiStopTour() {
  if (!appTour) return;
  clearTimeout(appTour.timer);
  appTour = null;
  uiTourCaption(null);
  uiSyncTour();
}

'use strict';
/* ===================== basis: renderer, scène, materialen, geometrie-hulpen ===================== */
const LOADING = document.getElementById('loading');
// tijdlijn van het opstarten (ms sinds het begin van de navigatie), uit te lezen via __s26u.timing
const uiTiming = { script: Math.round(performance.now()) };
if (!window.THREE || !THREE.OrbitControls || !THREE.BufferGeometryUtils || !THREE.RoomEnvironment || !THREE.RoundedBoxGeometry) {
  LOADING.textContent = 'De 3D-bibliotheek kon niet worden geladen. Controleer de verbinding en laad de pagina opnieuw.';
  throw new Error('three.js ontbreekt');
}
THREE.ColorManagement.legacyMode = false;
const PI = Math.PI, HALF = PI / 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
/* ---------- schaal ---------- */
// Eén wereldeenheid is 40 mm. De app-constanten (uitklapminimum, optillen, camera, vloer, toleranties in de tests) komen
// uit laguna3 en zijn afgesteld op een model van ongeveer 4,7 eenheden; de telefoon (163,6 mm) wordt zo 4,09 eenheden lang
// en die constanten blijven passend. Maten staan in de code altijd in millimeters via mm(); probe.py en de tests rekenen
// met MM terug naar millimeters. Zie docs/ontwerp-en-architectuur.md, "Schaal".
const MM = 1 / 40;
const mm = v => v * MM;
const mmv = (...a) => a.map(mm);
/* ---------- gedeeld contract tussen domeinen: buitenomtrek en S Pen-as (orkestrator, golf 7) ---------- */
// De buitenomtrek van het frame (afgeronde rechthoek, bevestigd) en de as van de S Pen in de hoek linksonder (x +, gezien op het
// scherm) hebben meer dan één eigenaar: de Behuizing boort er de opening en de silo, de S Pen legt er de pen en de dop op. Staan
// ze in één domeinbestand, dan hangt het andere domein daarvan af; daarom staan ze hier. Zie docs/indeling.md, "Gedeeld contract".
const OUT_HW = 39.05, OUT_HL = 81.8, OUT_R = 8.5;   // halve breedte (x), halve lengte (z) en hoekstraal van de buitenomtrek (mm)
const PEN_AXIS = { x: 32.0, y: 4.45 };              // as van de S Pen en van de silo (mm), evenwijdig aan z
// z van het buitenoppervlak van de onderrand bij een gegeven x (mm); in de hoekboog (x > OUT_HW - OUT_R) volgt het de boog
function outerZ(x) { const a = OUT_HW - OUT_R, b = OUT_HL - OUT_R; return x <= a ? OUT_HL : b + Math.sqrt(OUT_R * OUT_R - (x - a) * (x - a)); }
const REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

const canvas = document.getElementById('stage');
// zonder WebGL (of met een geblokkeerde GPU) blijft de laadmelding anders eeuwig op "Model opbouwen" staan
const renderer = (() => {
  try { return new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch (e) {
    LOADING.textContent = 'Deze browser kan geen 3D tekenen (WebGL is niet beschikbaar of uitgeschakeld). Probeer een andere browser of zet hardwareversnelling aan.';
    throw e;
  }
})();
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.98;
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 1, 0.02, 400);
camera.position.set(3.6, 5.2, 4.1);
const controls = new THREE.OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.09;
controls.target.set(0, 0.1, 0);
controls.minDistance = 0.12;
controls.maxDistance = 60;
controls.maxPolarAngle = PI * 0.97;
controls.rotateSpeed = 0.8;
controls.zoomSpeed = 0.9;
controls.autoRotateSpeed = 0.7;

// Omgevingskaart (PMREM) voor de glans. Na een hersteld WebGL-contextverlies (R2) maakt uiRemakeEnvironment hem opnieuw:
// het resultaat is een rendertarget zonder kopie in het geheugen en komt anders zwart terug.
let pmrem = new THREE.PMREMGenerator(renderer);
function uiMakeEnvironment() {
  const old = scene.environment;
  scene.environment = pmrem.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
  if (old) old.dispose();
}
function uiRemakeEnvironment() {
  pmrem.dispose();
  pmrem = new THREE.PMREMGenerator(renderer);
  uiMakeEnvironment();
}
uiMakeEnvironment();
const uiHemi = new THREE.HemisphereLight(0xffffff, 0x3c434b, 0.35);
scene.add(uiHemi);
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(4, 9, 6);
scene.add(sun);
const rim = new THREE.DirectionalLight(0xdfe8ff, 0.35);
rim.position.set(-6, 3, -5);
scene.add(rim);
// donkere modus: meer omgevings- en randlicht, zodat zwarte en donkergrijze onderdelen loskomen van de achtergrond
function uiThemeLights() {
  const dark = getComputedStyle(document.documentElement).getPropertyValue('color-scheme').trim() === 'dark';
  uiHemi.intensity = dark ? 0.75 : 0.35; rim.intensity = dark ? 0.75 : 0.35;
  uiHemi.groundColor.setHex(dark ? 0x5a636d : 0x3c434b);
}
uiThemeLights();

/* ---------- materialen ---------- */
const MAT = {};
function std(name, color, metal, rough, extra) {
  const m = new THREE.MeshStandardMaterial(Object.assign({ color, metalness: metal, roughness: rough, side: THREE.DoubleSide }, extra || {}));
  m.name = name; MAT[name] = m; return m;
}
function phys(name, opts) {
  const m = new THREE.MeshPhysicalMaterial(Object.assign({ side: THREE.DoubleSide }, opts));
  m.name = name; MAT[name] = m; return m;
}
// Basismaterialen voor alle domeinen. Een domein maakt eigen materialen met zijn voorvoegsel (zie CLAUDE.md).
// TOESTELKLEUR: het toestel van de gebruiker is White: wit achterglas en camera-eiland, zilveren aluminium frame. Eén plek.
const TOESTELKLEUR = { glas: 0xf1f1ee, frame: 0xcfd2d6 };
phys('backGlass', { color: TOESTELKLEUR.glas, metalness: 0, roughness: 0.42, clearcoat: 1, clearcoatRoughness: 0.3, envMapIntensity: 1.05 });
phys('coverGlass', { color: 0x0b1117, metalness: 0, roughness: 0.03, transparent: true, opacity: 0.32, depthWrite: false, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.1 });
phys('glass', { color: 0x0b1117, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.6, depthWrite: false, envMapIntensity: 0.85 });
phys('lensGlass', { color: 0x07080b, metalness: 0.2, roughness: 0.02, clearcoat: 1, clearcoatRoughness: 0.02 });
std('oled', 0x07090c, 0.1, 0.22);
std('frameAlu', TOESTELKLEUR.frame, 0.85, 0.32, { envMapIntensity: 1.15 });
std('frameCast', 0x9ea3a9, 0.7, 0.55);
std('ringMetal', 0xd8dadd, 0.95, 0.18, { envMapIntensity: 1.2 });
std('steel', 0xa0a6ad, 0.95, 0.28);
std('darkSteel', 0x3c4147, 0.85, 0.45);
std('copper', 0xb36d42, 0.9, 0.35);
std('gold', 0xd4a94e, 0.95, 0.3);
std('graphite', 0x2b2d30, 0.3, 0.7);
std('pcb', 0x1f2a24, 0.1, 0.6);
std('chip', 0x16181b, 0.2, 0.45);
std('shield', 0xb7bcc2, 0.9, 0.34);
std('flex', 0xc9842a, 0.1, 0.5);
std('battery', 0x2a2c30, 0.15, 0.6);
std('plastic', 0x1e2024, 0, 0.72);
std('plasticGrey', 0x4a4f57, 0, 0.62);
std('rubber', 0x141516, 0, 0.88);
std('foam', 0x3a3d42, 0, 0.95);
std('adhesive', 0xe8e4d8, 0, 0.8, { transparent: true, opacity: 0.7 });
std('ceramic', 0xf1efe9, 0, 0.35);

const HL = new Map();
function hlMat(base) {
  let m = HL.get(base);
  if (!m) {
    m = base.clone();
    m.emissive = new THREE.Color(0xf2c230);
    m.emissiveIntensity = 0.42;
    if (m.transparent) m.opacity = Math.max(m.opacity, 0.55);
    HL.set(base, m);
  }
  return m;
}
const GHOST = new THREE.MeshStandardMaterial({ color: 0xc4ccd5, metalness: 0, roughness: 0.4, transparent: true, opacity: 0.09, depthWrite: false, side: THREE.DoubleSide });
const GHOST_HL = new THREE.MeshStandardMaterial({ color: 0xf2c230, emissive: 0xf2c230, emissiveIntensity: 0.25, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide });

/* ---------- geometrie-hulpen ---------- */
const GC = new Map();
// Testmodus (window.__S26U_CACHECHECK): bouwt bij hergebruik van een sleutel opnieuw en meldt een botsing
// als dezelfde sleutel voor andere geometrie wordt gebruikt (bijvoorbeeld twee bestanden met sleutel 'cap').
function cacheSame(a, b) {
  const pa = a.attributes.position, pb = b.attributes.position;
  if (!pa || !pb || pa.count !== pb.count) return false;
  a.computeBoundingBox(); b.computeBoundingBox();
  return a.boundingBox.min.distanceTo(b.boundingBox.min) < 1e-6 && a.boundingBox.max.distanceTo(b.boundingBox.max) < 1e-6;
}
function cache(key, fn) {
  let g = GC.get(key);
  if (!g) { g = fn(); GC.set(key, g); }
  else if (window.__S26U_CACHECHECK) { const t = fn(); if (!cacheSame(g, t)) console.error(`cache-sleutel "${key}" wordt voor verschillende geometrie gebruikt`); t.dispose(); }
  return g;
}
function xf(g, p, r, s) {
  const c = g.clone();
  const m = new THREE.Matrix4().compose(V3(...(p || [0, 0, 0])), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(r || [0, 0, 0]))), V3(...(s || [1, 1, 1])));
  c.applyMatrix4(m);
  return c;
}
function cleanG(g) {
  const n = g.index ? g.toNonIndexed() : g.clone();
  for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal') n.deleteAttribute(k);
  if (!n.attributes.normal) n.computeVertexNormals();
  n.morphAttributes = {}; n.clearGroups();
  return n;
}
function merge(list) {
  const m = THREE.BufferGeometryUtils.mergeBufferGeometries(list.filter(Boolean).map(cleanG), false);
  if (!m) throw new Error('merge mislukt');
  return m;
}
// as-oriëntatie: geometrie gebouwd langs Y (cilinder/lathe) of Z (extrude/torus)
function yTo(g, ax) { if (ax === 'x') g.rotateZ(-HALF); else if (ax === 'z') g.rotateX(HALF); else if (ax === '-x') g.rotateZ(HALF); return g; }
function zTo(g, ax) { if (ax === 'x') g.rotateY(HALF); else if (ax === 'y') g.rotateX(-HALF); return g; }

const G = {
  box: (w, h, d) => cache(`b${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d)),
  rbox: (w, h, d, r) => cache(`rb${w}|${h}|${d}|${r}`, () => new THREE.RoundedBoxGeometry(w, h, d, 2, Math.max(0.0005, Math.min(r, Math.min(w, h, d) / 2 - 0.0002)))),
  cyl: (ax, rt, rb, h, seg = 24, open = false) => cache(`c${ax}${rt}|${rb}|${h}|${seg}|${open}`, () => yTo(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), ax)),
  half: (ax, r, h, start, seg = 16) => cache(`h${ax}${r}|${h}|${start}|${seg}`, () => yTo(new THREE.CylinderGeometry(r, r, h, seg, 1, true, start, PI), ax)),
  torus: (ax, R, r, seg = 40, rad = 8, arc = PI * 2) => cache(`t${ax}${R}|${r}|${seg}|${rad}|${arc}`, () => zTo(new THREE.TorusGeometry(R, r, rad, seg, arc), ax)),
  sphere: (r, seg = 16) => cache(`s${r}|${seg}`, () => new THREE.SphereGeometry(r, seg, Math.max(6, seg * 0.6 | 0))),
  lathe: (ax, pts, seg = 32, key) => {
    const build = () => yTo(new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg), ax);
    return key ? cache('l' + ax + key + seg, build) : build();
  },
};
function hexBolt(len, d, ax = 'y') { // kop bij oorsprong, steel richting +as
  return cache(`bolt${len}|${d}|${ax}`, () => {
    const head = new THREE.CylinderGeometry(d * 0.9, d * 0.9, d * 0.65, 6); head.translate(0, -d * 0.325, 0);
    const shank = new THREE.CylinderGeometry(d / 2, d / 2, len, 10); shank.translate(0, len / 2, 0);
    const washer = new THREE.CylinderGeometry(d * 1.05, d * 1.05, d * 0.12, 16); washer.translate(0, d * 0.06, 0);
    return yTo(merge([head, shank, washer]), ax);
  });
}
function spring(R, wire, h, turns, ax = 'y') {
  return cache(`sp${R}|${wire}|${h}|${turns}|${ax}`, () => {
    const pts = []; const N = Math.max(24, Math.ceil(turns * 14));
    for (let i = 0; i <= N; i++) { const t = i / N, a = t * turns * PI * 2; pts.push(V3(R * Math.cos(a), t * h - h / 2, R * Math.sin(a))); }
    return yTo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), N, wire, 5, false), ax);
  });
}
function tube(points, r, seg = 64, rad = 10, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => Array.isArray(p) ? V3(...p) : p), closed, 'centripetal');
  return new THREE.TubeGeometry(curve, seg, r, rad, closed);
}
function shapeOf(pts) { const s = new THREE.Shape(); pts.forEach((p, i) => i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])); s.closePath(); return s; }
function circlePath(cx, cy, r) { const h = new THREE.Path(); h.absarc(cx, cy, r, 0, PI * 2, true); return h; }
function rrectPts(w, h, r, n = 4) {
  const pts = [], hw = w / 2, hh = h / 2;
  const cs = [[hw - r, hh - r, 0], [-hw + r, hh - r, HALF], [-hw + r, -hh + r, PI], [hw - r, -hh + r, PI * 1.5]];
  for (const [cx, cy, a0] of cs) for (let i = 0; i <= n; i++) { const a = a0 + i / n * HALF; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return pts;
}
function extrude(shape, depth, curveSeg = 12) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: curveSeg });
  g.translate(0, 0, -depth / 2);
  return g;
}
// rechthoek u0..u1 x v0..v1 (hoekpunten tegen de klok in) met weggesneden onderhoeken: elke [kant, u, v] in cut haalt
// het stuk onder v en voorbij u aan die kant (kant +1 of -1) weg
function notchRect(u0, u1, v0, v1, cut = []) {
  const R = cut.find(c => c[0] > 0 && c[1] < u1), L = cut.find(c => c[0] < 0 && c[1] > u0), p = [];
  p.push(L ? [L[1], v0] : [u0, v0]);
  if (R) p.push([R[1], v0], [R[1], R[2]], [u1, R[2]]); else p.push([u1, v0]);
  p.push([u1, v1], [u0, v1]);
  if (L) p.push([u0, L[2]], [L[1], L[2]]);
  return p;
}
// kussen of plaat uit één stuk met rondom afgeronde randen: rechthoekige omtrek poly (tegen de klok in, in het vlak u-v,
// buitenmaat), dikte t langs de derde as (gecentreerd), randstraal b; holle hoeken van de omtrek krijgen straal ri.
// Geen naden zoals bij losse blokken; de normalen zijn glad met een knik boven 30 graden.
function roundPlate(poly, t, b, ri = 0.025, seg = 4) {
  b = Math.min(b, t / 2 - 0.0008);
  const n = poly.length, unit = (a, c) => { const dx = c[0] - a[0], dy = c[1] - a[1], l = Math.hypot(dx, dy); return [dx / l, dy / l]; };
  // omtrek b naar binnen: de afronding van ExtrudeGeometry zet hem weer b naar buiten
  const ins = poly.map((P, i) => { const e1 = unit(poly[(i + n - 1) % n], P), e2 = unit(P, poly[(i + 1) % n]); return [P[0] - b * (e1[1] + e2[1]), P[1] + b * (e1[0] + e2[0])]; });
  const pts = [];
  ins.forEach((P, i) => {
    const d1 = unit(P, ins[(i + n - 1) % n]), d2 = unit(P, ins[(i + 1) % n]), convex = d1[0] * d2[1] - d1[1] * d2[0] < 0, r = convex ? 0.004 : ri + b;
    const cx = P[0] + (d1[0] + d2[0]) * r, cy = P[1] + (d1[1] + d2[1]) * r, a1 = Math.atan2(-d2[1], -d2[0]);
    let da = Math.atan2(-d1[1], -d1[0]) - a1; while (da > PI) da -= 2 * PI; while (da < -PI) da += 2 * PI;
    for (let k = 0; k <= 3; k++) pts.push(new THREE.Vector2(cx + r * Math.cos(a1 + da * k / 3), cy + r * Math.sin(a1 + da * k / 3)));
  });
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: t - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: seg, curveSegments: 1 });
  g.translate(0, 0, -(t - 2 * b) / 2);
  // hoekpunten op positie samenvoegen (geïndexeerd), daarna gladde normalen met een knik boven 30 graden
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  return cleanG(THREE.BufferGeometryUtils.toCreasedNormals(THREE.BufferGeometryUtils.mergeVertices(g, 1e-5), 0.52));
}
// vorm in (x,z)-vlak, dikte langs y (bovenaanzicht)
function plan(shape, depth) { const g = extrude(shape, depth); g.rotateX(HALF); return g; }
// vorm in (z,y)-vlak, dikte langs x (zijaanzicht)
function side(shape, depth) { const g = extrude(shape, depth); g.rotateY(-HALF); return g; }
// vorm in (x,y)-vlak, dikte langs z (vooraanzicht)
function front(shape, depth) { return extrude(shape, depth); }
function annulus(rIn, rOut, t, ax = 'x', seg = 40) {
  return cache(`an${rIn}|${rOut}|${t}|${ax}|${seg}`, () => yTo(new THREE.LatheGeometry([[rIn, -t / 2], [rOut, -t / 2], [rOut, t / 2], [rIn, t / 2], [rIn, -t / 2]].map(p => new THREE.Vector2(...p)), seg), ax));
}
function hull(P) {
  P = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of P) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  up.pop(); lo.pop();
  return lo.concat(up);
}
function quatFromTo(a, b) { return new THREE.Quaternion().setFromUnitVectors(a.clone().normalize(), b.clone().normalize()); }
// staaf/buis tussen twee punten (as Y gebouwd)
function rodBetween(a, b, r, seg = 12) {
  const A = V3(...a), B = V3(...b), d = B.clone().sub(A), L = d.length();
  const g = new THREE.CylinderGeometry(r, r, L, seg);
  g.applyQuaternion(quatFromTo(V3(0, 1, 0), d));
  const m = A.clone().add(B).multiplyScalar(0.5);
  g.translate(m.x, m.y, m.z);
  return g;
}

/* ---------- vormhelpers in millimeters (voor alle domeinen) ---------- */
// Afgeronde plaat in bovenaanzicht: breedte w langs x, lengte l langs z, dikte t langs y (gecentreerd), hoekstraal r,
// randstraal b. Alles in mm; de geometrie is in wereldeenheden en gecachet.
function mmSlab(w, l, t, r, b = 0.2) {
  r = Math.max(0.05, Math.min(r, w / 2 - 0.01, l / 2 - 0.01));
  return cache(`mmSlab${w}|${l}|${t}|${r}|${b}`, () => { const g = roundPlate(rrectPts(mm(w), mm(l), mm(r), 6), mm(t), mm(Math.min(b, t / 2 - 0.03))); g.rotateX(HALF); return g; });
}
// Platte doos in mm (breedte x, dikte y, lengte z)
function mmBox(w, t, l) { return G.box(mm(w), mm(t), mm(l)); }
// Cilinder in mm langs as ax ('x', 'y' of 'z'), straal r, lengte h
function mmCyl(ax, r, h, seg = 24) { return G.cyl(ax, mm(r), mm(r), mm(h), seg); }
// Capsule (stadionvorm) in bovenaanzicht: breedte w (x), lengte l (z), dikte t (y), gecentreerd
function mmCapsule(w, l, t) { return mmSlab(w, l, t, Math.min(w, l) / 2 - 0.01, Math.min(0.3, t / 3)); }
// Ring (annulus) in mm met as y: binnenstraal ri, buitenstraal ro, hoogte h
function mmRing(ri, ro, h, seg = 40) { return annulus(mm(ri), mm(ro), mm(h), 'y', seg); }

/* ---------- onderdelenboom ---------- */
const NODES = [];
let NID = 0;
function mkNode(obj, name, o) {
  const n = {
    id: NID++, name, d: o.d || '', spec: o.spec || null, obj, kids: [], parent: null, asm: false,
    ex: o.ex ? V3(...o.ex) : null, exs: o.exs != null ? o.exs : 1, mode: o.mode || null, axis: o.axis ? V3(...o.axis) : null, step: o.step || 0,
    u: 0, amt: 0, target: 0, delay: 0, base: null, exv: V3(0, 0, 0), sys: null, depth: 0, count: 0, lc: null, rad: 0, tag: o.tag || null,
    inner: !!o.inner,  // ingesloten: onzichtbaar zolang de bovenliggende groep dicht is (de app verbergt het dan)
    opn: o.open || null,    // openmodus: scharnier of schuif (zie docs/ontwerp-en-architectuur.md, "Openmodus")
    strut: o.strut || null, // telescoop (gasveer) die de app tussen twee punten richt
    stay: !!o.stay,         // blijft op zijn plek als de opener erboven draait (vaste zijde van een scharnier)
    hideWhen: o.hideWhen || null // openmodus: onzichtbaar zolang een van deze openers open is (uitgenomen, zoals de SIM-kaart)
  };
  obj.userData.node = n;
  if (o.p) obj.position.set(...o.p);
  if (o.r) obj.rotation.set(...o.r);
  if (o.q) obj.quaternion.copy(o.q);
  if (o.s) obj.scale.set(...o.s);
  NODES.push(n);
  return n;
}
function A(name, o = {}, kids = []) {
  const n = mkNode(new THREE.Group(), name, o);
  n.asm = true;
  [kids].flat(Infinity).forEach(k => k && addKid(n, k));
  return n;
}
function P(name, geo, m, o = {}) {
  const mesh = new THREE.Mesh(geo, m);
  mesh.userData.base = m;
  return mkNode(mesh, name, o);
}
function addKid(p, c) { p.kids.push(c); c.parent = p; p.obj.add(c.obj); }
// Zijde van een symmetrisch paar, gezien op het scherm met de bovenrand van je af: +x is dan links (de telefoon ligt met het
// scherm naar beneden, bovenrand naar -z; vanaf de achterkant gezien is +x rechts).
const sideName = s => (s > 0 ? 'links' : 'rechts');

/* ===================== het hele toestel ===================== */
// Orkestrator: zet de acht hoofdgroepen in hun volgorde en geeft ze hun uitklaprichting. Elke hoofdgroep komt uit een
// domeinbestand (zie docs/indeling.md). Zolang een domein er nog niet is, staat er een plaatshouder in zijn zone, zodat elk
// domein in zijn eigen worktree met de volledige testset kan werken.
// Assen: x breedte (+x links op het scherm), y dikte (scherm op de vloer, achterkant boven), z lengte (bovenrand naar -z).

// buitenmaat in mm, bevestigd (persbericht van Samsung, zie docs/specificaties-en-bronnen.md); hoekstraal gemeten op de render
const PH_L = 163.6, PH_W = 78.1, PH_T = 7.9, PH_R = 8.5;

// plaatshouder: een groep met twee eenvoudige delen in de zone van het domein (x0..x1, y0..y1, z0..z1 in mm)
function phPlaceholder(name, zone, mat) {
  const [x0, x1, y0, y1, z0, z1] = zone, w = x1 - x0, t = y1 - y0, l = z1 - z0;
  const d = `Plaatshouder voor ${name}: het domein is nog niet gebouwd (zie docs/masterplan.md).`;
  return A(name, { d }, [
    P(name + ' (deel 1)', mmBox(w, t / 2, l), mat, { d, p: mmv((x0 + x1) / 2, y0 + t / 4, (z0 + z1) / 2), ex: [0, 0.15, 0] }),
    P(name + ' (deel 2)', mmBox(w, t / 2, l), mat, { d, p: mmv((x0 + x1) / 2, y0 + 3 * t / 4, (z0 + z1) / 2), ex: [0, 0.3, 0] }),
  ]);
}
const PH_GROUPS = [
  // [hoofdgroep, bouwfunctie, plaatshouderzone, materiaal, uitklapvector]
  ['Achterkant', 'reBuild', [-39, 39, 7.2, 7.9, -81.5, 81.5], () => MAT.backGlass, [0, 2.9, 0]],
  ["Camera's", 'caBuild', [-34, -14, 2.0, 7.2, -77, -21], () => MAT.lensGlass, [-1.9, 2.3, -1.2]],
  ['Moederbord', 'boBuild', [-12, 36, 2.9, 6.4, -79, -27], () => MAT.pcb, [1.6, 1.9, -1.1]],
  ['Energie en koeling', 'pwBuild', [-34, 26, 2.8, 7.0, -16, 62], () => MAT.battery, [0, 1.35, 0.4]],
  ['Randapparatuur', 'peBuild', [-34, 24, 2.9, 6.9, 64, 79], () => MAT.plastic, [-1.7, 1.0, 1.6]],
  ['S Pen', 'peBuildPen', [29.6, 34.0, 2.25, 6.65, -24, 81.4], () => MAT.plasticGrey, [2.3, 0.4, 0.9]],
  ['Behuizing', 'frBuild', [-39, 39, 1.7, 2.4, -81.5, 81.5], () => MAT.frameAlu, [0, 0.55, 0]],
  ['Scherm', 'diBuild', [-39, 39, 0, 1.7, -81.5, 81.5], () => MAT.oled, [0, -0.4, 0]],
];

// Openers (golf 4): schuiven in het frame van de ouder, in wereldeenheden via mm(). De orkestrator zet ze hier na de bouw,
// zodat de domeinbestanden alleen geometrie bevatten. min is 0,85 maal de slag (regel: minstens 0,8). De volgorde van
// demonteren volgt de iFixit-teardown: achterglas eraf, onderafdekplaat en luidspreker eruit, dan de batterij. `needs`
// gaat één niveau diep (openen opent eerst het achterglas); de presets en de rondleiding tonen de volledige volgorde.
function phSlide(label, move, look, extra = {}) {
  const v = move.map(mm), len = Math.hypot(...v);
  return Object.assign({ type: 'slide', move: v, min: 0.85 * len, label, look }, extra);
}
const PH_OPENERS = {
  // het achterglas klapt als een boek open over de +x-rand en komt omgekeerd naast het toestel te liggen
  'Achterkant': { type: 'hinge', pivot: mmv(39.05, 7.9, 0), axis: [0, 0, 1], angle: -165 * PI / 180, min: 0.85 * 165 * PI / 180, label: 'Achterglas eraf', look: { dir: [0.35, 1.2, 0.75], nodes: ['Achterkant', 'Moederbord', 'Batterij'] } },
  // na het achterglas: de onderafdekplaat en de luidspreker eruit (de luidspreker schuift de plaat mee), dan de batterij
  'Luidspreker onder': phSlide('Luidspreker onder eruit', [0, 18, 0], { dir: [-0.5, 1.1, 1], nodes: ['Luidspreker onder', 'Onderafdekplaat', 'Batterij'] }, { needs: 'Achterkant' }),
  // volger: zijn ondergrens is informatie, geen eis (de leider heeft er een)
  'Onderafdekplaat': Object.assign(phSlide('Onderafdekplaat eruit', [0, 26, 10], null, { follow: 'Luidspreker onder' }), { min: undefined }),
  'Batterij': phSlide('Batterij eruit', [0, 22, 0], { dir: [0.9, 1.0, 0.8], nodes: ['Batterij', 'Vapor chamber'] }, { needs: 'Achterkant' }),
  'SIM-lade': phSlide('SIM-lade', [0, 0, 15], { dir: [0.5, 0.45, 1], nodes: ['SIM-lade', 'USB-C-poort'] }),
  'S Pen': phSlide('S Pen', [0, 0, 70], { dir: [1, 0.55, 0.6], nodes: ['S Pen'] }),
  'Scherm': phSlide('Scherm eraf', [0, -16, 0], { dir: [0.7, -0.9, 0.8], nodes: ['Scherm', 'Middenplaat'] }),
};

function buildPhone() {
  const kids = PH_GROUPS.map(([name, fn, zone, mat, ex]) => {
    const f = typeof window[fn] === 'function' ? window[fn] : null;
    const g = f ? f() : phPlaceholder(name, zone, mat());
    if (g.name !== name) throw new Error(`${fn}() levert "${g.name}" in plaats van "${name}"`);
    g.ex = V3(...ex);
    return g;
  });
  const byN = new Map(); (function walk(n) { if (!byN.has(n.name)) byN.set(n.name, n); n.kids.forEach(walk); })({ name: '', kids });
  for (const [name, o] of Object.entries(PH_OPENERS)) { const n = byN.get(name); if (n) n.opn = o; }
  return A('Samsung Galaxy S26 Ultra', {
    d: 'Samsung Galaxy S26 Ultra in White (wit achterglas, zilveren frame), 1 TB met 16 GB RAM. Schematisch model: de buitenmaat, het camera-eiland en de specificaties zijn nagekeken, de binnenindeling volgt teardowns en is op veel plaatsen geschat (zie de beschrijving per onderdeel). Klik op een onderdeel om het uit te klappen, dubbelklik om er direct naartoe te gaan, rechtsklik of houd vast om weer in te klappen.',
    spec: [['L × B × D', '163,6 × 78,1 × 7,9 mm'], ['Gewicht', '214 g'], ['Kleur', 'White'], ['Scherm', '6,9 inch QHD+ Dynamic AMOLED 2X, 1–120 Hz'], ['Chip', 'Snapdragon 8 Elite Gen 5 for Galaxy'], ['Geheugen', '16 GB RAM, 1 TB opslag'], ['Batterij', '5000 mAh (typisch), 4855 mAh (nominaal)'], ['Laden', 'tot 75% in ongeveer 30 min met een 60W-adapter'], ['Camera\'s achter', '200 MP f/1,4 · 50 MP ultragroothoek f/1,9 · 50 MP 5× f/2,9 · 10 MP 3× f/2,4'], ['Selfiecamera', '12 MP f/2,2']],
  }, kids);
}

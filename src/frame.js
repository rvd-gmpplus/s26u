/* ===================== Behuizing (frBuild) ===================== */
// Domeinbestand; zie docs/indeling.md voor de zones en voorvoegsels. Zolang de bouwfunctie ontbreekt, zet phone.js een plaatshouder neer.
// Inhoud: middenframe (zijrand als één ring met openingen en antennesplitsingen), middenplaat, S Pen-silo en zijknoppen.
// Alle maten in mm (docs/indeling.md); de ring wordt als eigen geometrie langs de omtrek opgebouwd, zodat het silhouet
// exact de afgeronde rechthoek van 78,1 × 163,6 mm met hoekstraal 8,5 mm volgt.

const FR_HW = 39.05, FR_HL = 81.8, FR_T = 7.9, FR_R = 8.5, FR_WALL = 2.0;
const FR_BAND = [1.8, 7.05];      // y-band van de vlakke flank waarin alle openingen liggen
const FR_SPLIT = 0.8;             // breedte van een antennesplitsing (mm)

std('frSplit', 0xd9dbde, 0, 0.55);           // kunststof van de antennesplitsingen, in de kleur van het frame
std('frMesh', 0x2b2d31, 0.45, 0.78);         // stofgaas achter luidspreker- en microfoongaatjes
std('frSilo', 0x55595f, 0, 0.6);             // kunststof van de S Pen-silo

/* ---------- omtrek en profiel van de ring ---------- */
// Omtrek van de buitenkant als stukken (rechte en hoekbogen), met booglengte s vanaf (x +39,05, z 0) rondom.
function frPath() {
  const a = FR_HW - FR_R, b = FR_HL - FR_R, segs = [];
  const L = (x0, z0, x1, z1, nx, nz) => segs.push({ c: false, x0, z0, x1, z1, nx, nz, len: Math.hypot(x1 - x0, z1 - z0) });
  const C = (cx, cz, a0, a1) => segs.push({ c: true, cx, cz, a0, a1, len: FR_R * Math.abs(a1 - a0) });
  L(FR_HW, 0, FR_HW, b, 1, 0);            // 0: linkerflank (+x), onderste helft
  C(a, b, 0, HALF);                       // 1: hoek onder links
  L(a, FR_HL, -a, FR_HL, 0, 1);           // 2: onderrand
  C(-a, b, HALF, PI);                     // 3: hoek onder rechts
  L(-FR_HW, b, -FR_HW, -b, -1, 0);        // 4: rechterflank (-x)
  C(-a, -b, PI, 1.5 * PI);                // 5: hoek boven rechts
  L(-a, -FR_HL, a, -FR_HL, 0, -1);        // 6: bovenrand
  C(a, -b, 1.5 * PI, 2 * PI);             // 7: hoek boven links
  L(FR_HW, -b, FR_HW, 0, 1, 0);           // 8: linkerflank, bovenste helft
  let s = 0; for (const g of segs) { g.s0 = s; s += g.len; g.s1 = s; }
  return { segs, len: s, a, b };
}
// punt op de omtrek: [x, z, nx, nz, tx, tz] (normaal naar buiten, raaklijn in de richting van s)
function frAt(path, s) {
  s = ((s % path.len) + path.len) % path.len;
  for (const g of path.segs) if (s <= g.s1 + 1e-9) {
    const u = (s - g.s0) / g.len;
    if (g.c) { const an = g.a0 + u * (g.a1 - g.a0), c = Math.cos(an), sn = Math.sin(an); return [g.cx + FR_R * c, g.cz + FR_R * sn, c, sn, -sn, c]; }
    return [g.x0 + u * (g.x1 - g.x0), g.z0 + u * (g.z1 - g.z0), g.nx, g.nz, (g.x1 - g.x0) / g.len, (g.z1 - g.z0) / g.len];
  }
  return frAt(path, 0);
}
// booglengte bij een plek op een rand: 'onder' en 'boven' met x, 'rechts' (-x) en 'links' (+x) met z
function frSOf(path, edge, v) {
  const S = path.segs, a = path.a, b = path.b;
  if (edge === 'onder') {
    if (v > a) return S[1].s0 + FR_R * Math.acos((v - a) / FR_R);
    if (v < -a) return S[3].s0 + FR_R * (Math.acos((v + a) / FR_R) - HALF);
    return S[2].s0 + (a - v);
  }
  if (edge === 'boven') return S[6].s0 + (v + a);
  if (edge === 'rechts') return S[4].s0 + (b - v);
  return v >= 0 ? v : S[8].s0 + (v + b);
}
// Dwarsdoorsnede van de rand als gesloten lus (t, y): t is de afstand vanaf de buitenkant naar binnen. Vlakke flank,
// afgeronde boven- en onderkant. Aan de schermzijde (contract met het Scherm): bij y 0 tot 0,85 een lip van 0,3 mm waarachter
// het coverglas ligt, bij y 0,85 tot 1,7 een sponning voor paneel en digitizer (binnenkant op x ±37,5 en z ±79,7, dus
// t 1,55 op de flanken en 2,1 op boven- en onderrand, in de hoeken overgaand), vanaf y 1,7 de volle wanddikte van 2,0 mm.
// Een punt met derde waarde 1 krijgt als t de sponningdiepte op die plek. Rand 0 en rand iIn zijn de vlakke middenbanden.
function frProfile() {
  const p = [[0, FR_BAND[0]], [0, FR_BAND[1]]], rb = FR_T - FR_BAND[1];
  for (let i = 1; i <= 6; i++) { const an = PI - i / 6 * HALF; p.push([rb + rb * Math.cos(an), FR_BAND[1] + rb * Math.sin(an)]); }
  p.push([FR_WALL - 0.2, FR_T], [FR_WALL, FR_T - 0.2]);
  const iIn = p.length;
  p.push([FR_WALL, FR_BAND[1]], [FR_WALL, FR_BAND[0]], [FR_WALL, 1.7], [1.55, 1.7, 1], [1.55, 0.85, 1], [0.3, 0.85], [0.3, 0]);
  for (let i = 1; i <= 6; i++) { const an = i / 6 * HALF; p.push([0.3 - 0.3 * Math.sin(an), 0.9 - 0.9 * Math.cos(an)]); }
  let A2 = 0; for (let i = 0; i < p.length; i++) { const q = p[i], r = p[(i + 1) % p.length]; A2 += q[0] * r[1] - r[0] * q[1]; }
  return { p, skip: new Set([0, iIn]), ccw: A2 > 0 };
}
// sponningdiepte bij een normaal (nx, nz): 1,55 op de flanken, 2,1 op boven- en onderrand
function frPocket(nx, nz) { return 1.55 * nx * nx + 2.1 * nz * nz; }

/* ---------- driehoeken verzamelen met een gewenste normaalrichting ---------- */
function frMesh() {
  const pos = [];
  return {
    tri(a, b, c, n) {
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
      if (cx * cx + cy * cy + cz * cz < 1e-14) return;
      if (cx * n[0] + cy * n[1] + cz * n[2] < 0) pos.push(...a, ...c, ...b); else pos.push(...a, ...b, ...c);
    },
    quad(a, b, c, d, n) { this.tri(a, b, c, n); this.tri(a, c, d, n); },
    geo() {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos.map(mm), 3));
      return cleanG(THREE.BufferGeometryUtils.toCreasedNormals(THREE.BufferGeometryUtils.mergeVertices(g, 1e-6), 0.6));
    },
  };
}
// gesloten omtrek in (s, y): afgeronde rechthoek of cirkel rond (sc, yc)
function frHoleRect(sc, yc, w, h, r, n = 4) { return rrectPts(w, h, Math.min(r, w / 2 - 0.01, h / 2 - 0.01), n).map(([u, v]) => [sc + u, yc + v]); }
function frHoleCirc(sc, yc, r, n) { const p = []; for (let i = 0; i < n; i++) { const an = i / n * 2 * PI; p.push([sc + r * Math.cos(an), yc + r * Math.sin(an)]); } return p; }

// Openingen in de rand en de plaatsen van de antennesplitsingen (allemaal geschat, zie docs/indeling.md)
function frOpenings(path) {
  const S = (e, v) => frSOf(path, e, v), H = [];
  const add = (name, pts, c) => H.push({ name, pts, c });
  // onderrand: USB-C, microfoon, SIM-lade, S Pen, luidsprekergaatjes
  add('USB-C', frHoleRect(S('onder', 0), 3.9, 9.0, 3.2, 1.6, 6), [S('onder', 0), 3.9]);
  add('microfoon onder', frHoleCirc(S('onder', -6.5), 3.95, 0.35, 10), [S('onder', -6.5), 3.95]);
  add('SIM-lade', frHoleRect(S('onder', 15), 3.8, 14, 1.2, 0.5, 3), [S('onder', 15), 3.8]);
  add('S Pen', frHoleCirc(S('onder', 31.8), 4.45, 2.5, 28), [S('onder', 31.8), 4.45]);
  for (let k = 0; k < 8; k++) { const x = -10 - 2.8 * k, s = S('onder', x); add('luidspreker', frHoleCirc(s, 3.95, 0.65, 12), [s, 3.95]); }
  // bovenrand: microfoon (niet op x 0, daar zit de straal van de silhouettest niet in de weg)
  add('microfoon boven', frHoleCirc(S('boven', 12), 3.95, 0.35, 10), [S('boven', 12), 3.95]);
  // rechterflank (-x): openingen voor de volumeknop en de aan/uit-knop, 0,2 mm speling rondom
  const sv = (S('rechts', -48) + S('rechts', -26)) / 2, sp = (S('rechts', -16) + S('rechts', -4)) / 2;
  add('volumeknop', frHoleRect(sv, 3.95, 22.4, 2.8, 0.45, 3), [sv, 3.95]);
  add('aan/uit-knop', frHoleRect(sp, 3.95, 12.4, 2.8, 0.45, 3), [sp, 3.95]);
  const splits = [
    ['Antennesplitsing boven links', S('boven', 24)],
    ['Antennesplitsing boven rechts', S('boven', -24)],
    ['Antennesplitsing linkerflank boven', S('links', -52)],
    ['Antennesplitsing linkerflank onder', S('links', 48)],
    ['Antennesplitsing rechterflank boven', S('rechts', -60)],
    ['Antennesplitsing rechterflank onder', S('rechts', 44)],
    ['Antennesplitsing onder links', S('onder', 26)],
    ['Antennesplitsing hoek onder rechts', path.segs[3].s0 + path.segs[3].len / 2],
  ];
  return { holes: H, splits };
}

// De ring: een veegvorm van het profiel langs de omtrek. In vensters rond de openingen wordt de vlakke middenband als
// vlak met gaten (in s, y) getrianguleerd en met boringen door de wand verbonden. Op de antennesplitsingen is de ring
// onderbroken; daar komen losse kunststof stukjes met hetzelfde profiel.
function frRingGeos() {
  const path = frPath(), prof = frProfile(), P = prof.p, NP = P.length, { holes, splits } = frOpenings(path);
  const W = (s, t, y, pk) => { const f = frAt(path, s); if (pk) t = frPocket(f[2], f[3]); return [f[0] - t * f[2], y, f[1] - t * f[3]]; };
  // vensters: per opening het bereik in s plus 0,6 mm marge; overlappende vensters samenvoegen
  let wins = holes.map(h => { const ss = h.pts.map(p => p[0]); return { s0: Math.min(...ss) - 0.6, s1: Math.max(...ss) + 0.6, holes: [h] }; }).sort((p, q) => p.s0 - q.s0);
  const merged = [];
  for (const w of wins) { const l = merged[merged.length - 1]; if (l && w.s0 <= l.s1) { l.s1 = Math.max(l.s1, w.s1); l.holes.push(...w.holes); } else merged.push(w); }
  wins = merged;
  const sp = splits.map(([name, s]) => ({ name, s0: s - FR_SPLIT / 2, s1: s + FR_SPLIT / 2 }));
  for (const w of wins) for (const q of sp) if (w.s0 < q.s1 && q.s0 < w.s1) throw new Error(`antennesplitsing ${q.name} valt in een opening`);
  // stations langs de omtrek
  const st = [0, path.len];
  for (const g of path.segs) { st.push(g.s0); if (g.c) for (let i = 1; i < 20; i++) st.push(g.s0 + i / 20 * g.len); }
  for (const w of wins) { const n = Math.ceil((w.s1 - w.s0) / 0.5); for (let i = 0; i <= n; i++) st.push(w.s0 + i / n * (w.s1 - w.s0)); }
  for (const q of sp) st.push(q.s0, q.s1);
  st.sort((p, q) => p - q);
  const S = st.filter((v, i) => i === 0 || v - st[i - 1] > 1e-6);
  const ring = frMesh(), ins = sp.map(() => frMesh());
  // normaal van profielrand k bij s, in 3D
  const pn = (k, s) => {
    const a = P[k], b = P[(k + 1) % NP], dt = b[0] - a[0], dy = b[1] - a[1], sg = prof.ccw ? 1 : -1, nt = dy * sg, ny = -dt * sg, f = frAt(path, s);
    return [-nt * f[2], ny, -nt * f[3]];
  };
  for (let i = 0; i + 1 < S.length; i++) {
    const a = S[i], b = S[i + 1], m = (a + b) / 2;
    const k = sp.findIndex(q => m > q.s0 && m < q.s1), M = k >= 0 ? ins[k] : ring;
    const inWin = wins.some(w => m > w.s0 && m < w.s1);
    for (let e = 0; e < NP; e++) {
      if (inWin && prof.skip.has(e)) continue;
      const p = P[e], q = P[(e + 1) % NP];
      M.quad(W(a, p[0], p[1], p[2]), W(b, p[0], p[1], p[2]), W(b, q[0], q[1], q[2]), W(a, q[0], q[1], q[2]), pn(e, m));
    }
  }
  // kopvlakken op de antennesplitsingen
  const cap = (M, s, dir) => {
    const f = frAt(path, s), n = [f[4] * dir, 0, f[5] * dir], tp = frPocket(f[2], f[3]);
    const tris = THREE.ShapeUtils.triangulateShape(P.map(p => new THREE.Vector2(p[2] ? tp : p[0], p[1])), []);
    for (const [i, j, l] of tris) M.tri(W(s, P[i][0], P[i][1], P[i][2]), W(s, P[j][0], P[j][1], P[j][2]), W(s, P[l][0], P[l][1], P[l][2]), n);
  };
  sp.forEach((q, k) => { cap(ring, q.s0, 1); cap(ring, q.s1, -1); cap(ins[k], q.s0, -1); cap(ins[k], q.s1, 1); });
  // vensters: buitenvlak en binnenvlak met gaten, plus boringen
  for (const w of wins) {
    const ss = S.filter(v => v >= w.s0 - 1e-6 && v <= w.s1 + 1e-6);
    const contour = ss.map(v => [v, FR_BAND[0]]).concat(ss.slice().reverse().map(v => [v, FR_BAND[1]]));
    const hp = w.holes.map(h => h.pts);
    const all = contour.concat(...hp);
    const tris = THREE.ShapeUtils.triangulateShape(contour.map(p => new THREE.Vector2(...p)), hp.map(h => h.map(p => new THREE.Vector2(...p))));
    for (const [i, j, l] of tris) {
      const sc = (all[i][0] + all[j][0] + all[l][0]) / 3, f = frAt(path, sc);
      for (const t of [0, FR_WALL]) {
        const n = t ? [-f[2], 0, -f[3]] : [f[2], 0, f[3]];
        ring.tri(W(all[i][0], t, all[i][1]), W(all[j][0], t, all[j][1]), W(all[l][0], t, all[l][1]), n);
      }
    }
    for (const h of w.holes) {
      const pts = h.pts, [cs, cy] = h.c;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i], q = pts[(i + 1) % pts.length], ms = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, f = frAt(path, ms);
        const n = [f[4] * (cs - ms), cy - my, f[5] * (cs - ms)];
        ring.quad(W(p[0], 0, p[1]), W(q[0], 0, q[1]), W(q[0], FR_WALL, q[1]), W(p[0], FR_WALL, p[1]), n);
      }
    }
  }
  return {
    ring: ring.geo(),
    inserts: sp.map((q, k) => { const f = frAt(path, (q.s0 + q.s1) / 2); return { name: q.name, geo: ins[k].geo(), n: [f[2], f[3]] }; }),
  };
}

/* ---------- middenplaat ---------- */
function frArc(cx, cz, r, a0, a1, n) { const p = []; for (let i = 0; i <= n; i++) { const an = a0 + i / n * (a1 - a0); p.push([cx + r * Math.cos(an), cz + r * Math.sin(an)]); } return p; }
// Plaat in de binnenruimte (x ±37, z ±79,8, hoekstraal 6,5), met een open sleuf langs de S Pen-silo (x 28,9 tot 34,7,
// vanaf z -26,2 tot de onderrand), gaten om de drie grote camera's en de selfiecamera en een sleuf voor de displayflex.
function frPlateGeo() {
  return cache('frPlate', () => {
    const X = 37, Z = 79.8, r = 6.5, cx = X - r, cz = Z - r, sx0 = 28.9, sx1 = 34.7, sz = -26.2;
    const te = Math.acos((sx1 - cx) / r);
    const pts = [[X, -cz], [X, cz], ...frArc(cx, cz, r, 0, te, 8), [sx1, sz], [sx0, sz], [sx0, Z], ...frArc(-cx, cz, r, HALF, PI, 10),
      ...frArc(-cx, -cz, r, PI, 1.5 * PI, 10), ...frArc(cx, -cz, r, 1.5 * PI, 2 * PI, 10)];
    const shape = shapeOf(pts.map(([x, z]) => [mm(x), mm(z)]));
    for (const z of [-67.1, -48.9, -30.7]) shape.holes.push(circlePath(mm(-24.15), mm(z), mm(7)));
    shape.holes.push(circlePath(0, mm(-76), mm(3)));
    const flex = new THREE.Path(); rrectPts(mm(12), mm(2), mm(0.9), 4).forEach(([u, v], i) => i ? flex.lineTo(u, mm(63.5) + v) : flex.moveTo(u, mm(63.5) + v));
    flex.closePath(); shape.holes.push(flex);
    const g = plan(shape, mm(0.7), 16); g.translate(0, mm(2.05), 0);
    return g;
  });
}

/* ---------- S Pen-silo en uitwerper ---------- */
function frSiloGeo() {
  return cache('frSiloTube', () => {
    const z0 = -26, z1 = 80.5, L = z1 - z0;
    const tubeG = xf(annulus(mm(2.4), mm(2.7), mm(L), 'z', 28), mmv(31.8, 4.45, (z0 + z1) / 2));
    const capG = xf(G.cyl('z', mm(2.7), mm(2.7), mm(0.3), 28), mmv(31.8, 4.45, z0 + 0.15));
    return merge([tubeG, capG]);
  });
}

/* ---------- zijknoppen ---------- */
// knopkap: vlakke staaf met afgeronde randen, in de opening van de flank; steekt 0,25 mm uit (x -39,30) en loopt tot
// x -37,1, met nokjes naar de drukschakelaars
function frButtonGeo(key, z0, z1, nubs) {
  return cache('frBtn' + key, () => {
    const l = z1 - z0, zc = (z0 + z1) / 2, h = 2.4, t = 2.2;
    const cap = roundPlate([[-mm(l) / 2, -mm(h) / 2], [mm(l) / 2, -mm(h) / 2], [mm(l) / 2, mm(h) / 2], [-mm(l) / 2, mm(h) / 2]], mm(t), mm(0.35), 0.025, 3);
    cap.rotateY(-HALF); cap.translate(mm(-39.3 + t / 2), mm(3.95), mm(zc));
    const parts = [cap];
    for (const z of nubs) parts.push(xf(G.cyl('x', mm(0.5), mm(0.5), mm(0.3), 10), mmv(-36.95, 3.95, z)));
    return merge(parts);
  });
}

function frBuild() {
  const { ring, inserts } = frRingGeos();
  const est = 'Vorm en maat zijn geschat.';
  // antennesplitsingen
  const splitKids = inserts.map(q => P(q.name, q.geo, MAT.frSplit, {
    d: `Kunststof inzetstukje van 0,8 mm breed dat de metalen rand onderbreekt, zodat de stukken rand als antenne werken. Plaats en aantal zijn geschat.`,
    ex: [q.n[0] * 0.3, 0.05, q.n[1] * 0.3],
  }));
  // afdichtingen en stofgaas achter de openingen in de onderrand en bovenrand
  const usbSeal = (() => {
    const s = shapeOf(rrectPts(mm(10.6), mm(4.8), mm(2.39), 5));
    const hole = new THREE.Path(); rrectPts(mm(9.2), mm(3.4), mm(1.69), 5).forEach(([u, v], i) => i ? hole.lineTo(u, v) : hole.moveTo(u, v)); hole.closePath();
    s.holes.push(hole);
    return cache('frUsbSeal', () => { const g = front(s, mm(0.25)); g.translate(0, mm(3.9), mm(79.675)); return g; });
  })();
  const seals = A('Afdichtingen', { d: 'Pakking en stofgaas aan de binnenkant van de rand, achter de openingen. Vorm en maat zijn geschat.', ex: [0, 0.35, 0] }, [
    P('Waterdichting USB-C', usbSeal, MAT.rubber, { d: 'Rubberen pakkingring rond de USB-C-opening aan de binnenkant van de onderrand; de USB-C-poort drukt ertegen. ' + est, ex: [0, 0, -0.25] }),
    P('Stofgaas luidspreker', cache('frSpkMesh', () => xf(mmBox(21, 2.6, 0.12), mmv(-19.8, 3.95, 79.74))), MAT.frMesh, { d: 'Fijn gaas achter de luidsprekergaatjes in de onderrand, tegen stof en water. ' + est, ex: [0, 0, -0.3] }),
    P('Stofgaas microfoon onder', cache('frMicMeshO', () => xf(G.cyl('z', mm(0.9), mm(0.9), mm(0.12), 14), mmv(-6.5, 3.95, 79.74))), MAT.frMesh, { d: 'Gaasje achter het microfoongaatje in de onderrand. ' + est, ex: [0, 0, -0.25] }),
    P('Stofgaas microfoon boven', cache('frMicMeshB', () => xf(G.cyl('z', mm(0.9), mm(0.9), mm(0.12), 14), mmv(12, 3.95, -79.74))), MAT.frMesh, { d: 'Gaasje achter het microfoongaatje in de bovenrand. ' + est, ex: [0, 0, 0.25] }),
  ]);
  const middenframe = A('Middenframe', { d: 'De zijrand van het toestel: één aluminium ring over de volle dikte met de openingen voor poorten, gaatjes en knoppen, onderbroken door kunststof antennesplitsingen.', ex: [0, 0.12, 0] }, [
    P('Framering', ring, MAT.frameAlu, {
      d: 'Zijrand uit één stuk aluminium (zilver bij White), 2,0 mm dik met vlakke flanken en afgeronde boven- en onderkant. Aan de schermzijde een lip van 0,3 mm voor het coverglas en een sponning waarin paneel en digitizer liggen. In de onderrand de USB-C-opening, de luidsprekergaatjes, een microfoongaatje, de sleuf van de SIM-lade en de S Pen-opening; in de bovenrand een microfoongaatje; in de rechterflank de openingen voor de knoppen. De buitenmaat is bevestigd, het profiel en de plaats van de openingen zijn geschat.',
      spec: [['L × B × D', '163,6 × 78,1 × 7,9 mm']],
      ex: [0, 0.04, 0],
    }),
    A('Antennesplitsingen', { d: 'Acht kunststof inzetstukjes in de rand die de rand in antennesegmenten verdelen. Plaats en aantal zijn geschat.', ex: [0, 0.2, 0] }, splitKids),
    seals,
  ]);
  const plaat = P('Middenplaat', frPlateGeo(), MAT.frameCast, {
    d: 'Gegoten plaat tussen het schermpakket en de binnenruimte; draagt moederbord, batterij en vapor chamber en verstijft het toestel. Met gaten rond de drie grote camera\'s en de selfiecamera, een sleuf voor de displayflex en een open sleuf langs de S Pen-silo. ' + est,
    ex: [0, -0.32, 0],
  });
  // S Pen-silo met uitwerper aan het binnenste eind (z -26 tot -24, de pen begint op z -24)
  const silo = A('S Pen-silo', { d: 'Buis in het frame waarin de S Pen zit, open aan de onderrand en met een uitwerper aan het binnenste eind. ' + est, ex: [0.55, 0.35, 0] }, [
    P('Silobuis', frSiloGeo(), MAT.frSilo, { d: 'Kunststof buis van 5,4 mm buiten en 4,8 mm binnen, van z -26 tot in de onderrand, aan het binnenste eind dicht. ' + est, ex: [0.08, 0, 0] }),
    A('S Pen-uitwerper', { d: 'Klik-uitwerper: druk de pen in en hij klikt vast, druk nog eens en de veer duwt hem een stukje naar buiten. Werking en vorm zijn geschat.', ex: [0, 0, -0.55] }, [
      P('Uitwerperveer', spring(mm(1.4), mm(0.12), mm(0.8), 3, 'z'), MAT.steel, { d: 'Drukveer die de pen naar buiten duwt. ' + est, p: mmv(31.8, 4.45, -25.3), ex: [0, 0, -0.12] }),
      P('Klikring', cache('frClick', () => merge([xf(annulus(mm(1.3), mm(2.2), mm(0.4), 'z', 20), mmv(31.8, 4.45, -24.7)), xf(mmBox(0.5, 0.5, 0.6), mmv(31.8, 6.3, -24.7))])), MAT.plastic, { d: 'Ring met hartvormige kliknok die de pen vasthoudt of loslaat. ' + est, ex: [0, 0, -0.24] }),
      P('Duwkop', cache('frPush', () => xf(annulus(mm(0.8), mm(2.1), mm(0.4), 'z', 20), mmv(31.8, 4.45, -24.3))), MAT.steel, { d: 'Kopje waar de punt van de S Pen tegen drukt. ' + est, ex: [0, 0, -0.36] }),
    ]),
  ]);
  // zijknoppen aan de -x-flank (rechts als je op het scherm kijkt)
  const knoppen = A('Zijknoppen', { d: `Knoppen in de ${sideName(-1)}flank (gezien op het scherm) met de knoppenflex erachter. ` + est, ex: [-0.35, 0.15, 0] }, [
    P('Volumeknop', frButtonGeo('Vol', -48, -26, [-43, -31]), MAT.frameAlu, { d: 'Wipknop voor harder en zachter, metaal in de kleur van het frame; steekt 0,25 mm uit de flank. Plaats en maat zijn geschat.', ex: [-0.3, 0, 0] }),
    P('Aan/uit-knop', frButtonGeo('Pwr', -16, -4, [-10]), MAT.frameAlu, { d: 'Zijtoets (aan/uit), metaal in de kleur van het frame; steekt 0,25 mm uit de flank. Plaats en maat zijn geschat.', ex: [-0.3, 0, 0] }),
    A('Knoppenflex', { d: 'Smalle flexprint achter de knoppen met drie drukschakelaars, op een stalen verstijving; loopt naar de hoofdflex. ' + est, ex: [0.3, 0, 0] }, [
      P('Drukschakelaars', cache('frDomes', () => merge([-43, -31, -10].map(z => xf(G.cyl('x', mm(0.9), mm(0.7), mm(0.25), 14), mmv(-36.72, 3.95, z))))), MAT.steel, { d: 'Metalen klikkoepeltjes die de knopdruk omzetten in een contact. ' + est, ex: [-0.06, 0, 0] }),
      P('Flexstrook', cache('frBtnFlex', () => xf(mmBox(0.12, 2.6, 48), mmv(-36.54, 3.95, -26))), MAT.flex, { d: 'Polyimide flexprint met de sporen van de knoppen. ' + est, ex: [0.06, 0, 0] }),
      P('Verstijvingsplaat', cache('frBtnStiff', () => merge([xf(mmBox(0.25, 2.4, 23), mmv(-36.35, 3.95, -37)), xf(mmBox(0.25, 2.4, 13), mmv(-36.35, 3.95, -10))])), MAT.steel, { d: 'Stalen plaatjes achter de flex waartegen de schakelaars worden ingedrukt. ' + est, ex: [0.14, 0, 0] }),
    ]),
  ]);
  return A('Behuizing', { d: 'Behuizing: de aluminium zijrand met middenplaat, de S Pen-silo en de zijknoppen. Het frame is het geraamte waarop scherm, achterglas en alle binnendelen vastzitten.' }, [middenframe, plaat, silo, knoppen]);
}

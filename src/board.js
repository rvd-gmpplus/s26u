/* ===================== Moederbord (boBuild) ===================== */
// Domeinbestand; zie docs/indeling.md voor de zones en voorvoegsels. Zolang de bouwfunctie ontbreekt, zet phone.js een plaatshouder neer.
//
// Opbouw (sandwich zoals bij de Galaxy Ultra-toestellen; laagdiktes en indeling zijn schattingen):
//   y 2,83 tot 2,9  warmtegeleidend kussen onder de SoC, naar de vapor chamber (die is van Energie en koeling)
//   y 2,9 tot 3,6   hoofdprint met SoC, geheugen, opslag, PMIC en audio in de holte van de interposer
//   y 3,6 tot 5,2   interposer (rand) tussen de twee printen
//   y 5,2 tot 5,9   RF-print, met de radiochips en kapjes aan de bovenkant (tot y 6,4)
//   y 6,4 tot 7,0   bovenafdekplaat van kunststof met antennesporen en schroeven
// Het bord wijkt voor de camerakolom, de periscoop, de selfiecamera, de oorspeaker en de S Pen-silo (x tot +28,6).
// Alle maten in mm in het modelframe; omgerekend met mm() en mmv().

std('boCover', 0x24262a, 0, 0.62);
std('boAntenna', 0xc79a52, 0.85, 0.32);
std('boInterposer', 0x263329, 0.1, 0.55);
std('boSubstrate', 0x3b4a3a, 0.15, 0.5);
std('boPaste', 0xa9adb1, 0.25, 0.85);
std('boCap', 0x9a8460, 0.2, 0.5);
std('boConn', 0xd4d0c4, 0.05, 0.55);

// y-lagen (mm)
const BO_Y = { pad0: 2.83, main0: 2.9, main1: 3.6, rf0: 5.2, rf1: 5.9, top: 6.4, cov1: 6.98, cov2: 7.0 };

// omtrek hoofdprint (x, z in mm, tegen de klok in gezien van boven): links het stuk onder de camerakolom tot x -13,5,
// boven de inkeping voor periscoop en laser-AF (x tot -0,5), de selfiecamera (tot x +4, z -70,5) en de oorspeaker
// (x +3,5 tot +18,5, z -74,5); rechts tot x +28,6 vóór de S Pen-silo
const BO_MAIN = [[-13.5, -19], [28.6, -19], [28.6, -79], [18.5, -79], [18.5, -74.5], [4, -74.5], [4, -70.5], [-0.5, -70.5], [-0.5, -39.5], [-13.5, -39.5]];
// bovenafdekplaat: dezelfde omtrek, maar over de selfiecamera en de oorspeaker heen (die blijven onder y 4,9)
const BO_COVER = [[-13.5, -19], [28.6, -19], [28.6, -79], [-0.5, -79], [-0.5, -39.5], [-13.5, -39.5]];
// RF-print en buitenrand van de interposer; binnenrand van de interposer (holte)
const BO_RF = [0.5, 28.1, -70, -25];
const BO_CAV = [2.1, 26.5, -68.4, -26.6];
// schroeven van de bovenafdekplaat (x, z): vier door de interposerrand, één links, één rechtsboven
const BO_SCREWS = [[1.3, -47.5], [27.3, -47.5], [14.3, -25.8], [14.3, -69.2], [-12, -21.3], [23, -76]];
const BO_RF_SCREWS = BO_SCREWS.slice(0, 4);

// hoeken van een veelhoek afronden (straal r in mm, n tussenpunten); werkt voor bolle en holle hoeken
function boFillet(pts, r, n = 3) {
  const out = [], N = pts.length;
  for (let i = 0; i < N; i++) {
    const p = pts[i], a = pts[(i + N - 1) % N], b = pts[(i + 1) % N];
    const la = Math.hypot(a[0] - p[0], a[1] - p[1]), lb = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const rr = Math.min(r, la / 2.2, lb / 2.2);
    const s = [p[0] + (a[0] - p[0]) / la * rr, p[1] + (a[1] - p[1]) / la * rr], e = [p[0] + (b[0] - p[0]) / lb * rr, p[1] + (b[1] - p[1]) / lb * rr];
    for (let k = 0; k <= n; k++) {
      const t = k / n, u = 1 - t;
      out.push([u * u * s[0] + 2 * u * t * p[0] + t * t * e[0], u * u * s[1] + 2 * u * t * p[1] + t * t * e[1]]);
    }
  }
  return out;
}
const boRect = (x0, x1, z0, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];

// plaat in bovenaanzicht uit een omtrek in mm met gaten ([x, z, r] of een omtrek), van y0 tot y1
function boPlanGeo(key, pts, holes, y0, y1) {
  return cache('bo' + key, () => {
    const s = shapeOf(pts.map(p => [mm(p[0]), mm(p[1])]));
    for (const h of holes || []) {
      if (typeof h[0] === 'number') s.holes.push(circlePath(mm(h[0]), mm(h[1]), mm(h[2])));
      else { const pa = new THREE.Path(); h.forEach((q, i) => i ? pa.lineTo(mm(q[0]), mm(q[1])) : pa.moveTo(mm(q[0]), mm(q[1]))); pa.closePath(); s.holes.push(pa); }
    }
    const g = plan(s, mm(y1 - y0));
    g.translate(0, mm((y0 + y1) / 2), 0);
    return g;
  });
}

// chip: afgerond blokje (b × l in bovenaanzicht, hoogte h), onderkant op de oorsprong
function boChipGeo(w, l, h, r = 0.15) {
  return cache(`boChip${w}|${l}|${h}|${r}`, () => { const g = G.rbox(mm(w), mm(h), mm(l), mm(r)).clone(); g.translate(0, mm(h / 2), 0); return g; });
}
// afschermkap: dunne plaat met vier wanden, open aan de onderkant; onderkant op de oorsprong
function boCanGeo(w, l, h) {
  return cache(`boCan${w}|${l}|${h}`, () => {
    const t = 0.1, lip = 0.12;
    return merge([
      xf(mmBox(w, t, l), mmv(0, h - t / 2, 0)),
      xf(mmBox(t, h - t, l), mmv(-w / 2 + t / 2, (h - t) / 2, 0)), xf(mmBox(t, h - t, l), mmv(w / 2 - t / 2, (h - t) / 2, 0)),
      xf(mmBox(w - 2 * t, h - t, t), mmv(0, (h - t) / 2, -l / 2 + t / 2)), xf(mmBox(w - 2 * t, h - t, t), mmv(0, (h - t) / 2, l / 2 - t / 2)),
      // verstevigingsrand langs de bovenkant (een kraag zoals bij getrokken kapjes)
      xf(mmBox(w - 2 * t, t, lip), mmv(0, h - t * 1.5, -l / 2 + t + lip / 2)), xf(mmBox(w - 2 * t, t, lip), mmv(0, h - t * 1.5, l / 2 - t - lip / 2)),
    ]);
  });
}
// bord-op-bordconnector (receptakel): metalen kader met een middenrib en twee rijen contacten; onderkant op de oorsprong
function boConnGeo(w, l, h, pins) {
  return cache(`boConn${w}|${l}|${h}|${pins}`, () => {
    const t = 0.18, parts = [
      xf(mmBox(w, 0.12, l), mmv(0, 0.06, 0)),
      xf(mmBox(w, h, t), mmv(0, h / 2, -l / 2 + t / 2)), xf(mmBox(w, h, t), mmv(0, h / 2, l / 2 - t / 2)),
      xf(mmBox(t, h, l - 2 * t), mmv(-w / 2 + t / 2, h / 2, 0)), xf(mmBox(t, h, l - 2 * t), mmv(w / 2 - t / 2, h / 2, 0)),
      xf(mmBox(w - 1.2, h * 0.75, l * 0.22), mmv(0, h * 0.375, 0)),
    ];
    const pitch = (w - 1.4) / (pins - 1);
    for (let i = 0; i < pins; i++) {
      const x = -w / 2 + 0.7 + i * pitch;
      for (const sz of [-1, 1]) parts.push(xf(mmBox(pitch * 0.45, h * 0.6, 0.22), mmv(x, h * 0.3, sz * (l * 0.11 + 0.2))));
    }
    return merge(parts);
  });
}
// coaxiale antenneconnector: vierkante voet met een ronde kraag; onderkant op de oorsprong
function boCoaxGeo() {
  return cache('boCoax', () => merge([
    xf(mmBox(2.0, 0.15, 2.0), mmv(0, 0.075, 0)),
    xf(mmRing(0.5, 0.72, 0.33, 14), mmv(0, 0.15 + 0.165, 0)),
    xf(mmCyl('y', 0.18, 0.3, 8), mmv(0, 0.3, 0)),
  ]));
}
// schroef met platte kop (kop naar +y): kop van y 6,6 tot 7,0, steel tot y 3,0; oorsprong midden onder de kop
function boScrewGeo() {
  return cache('boScrew', () => merge([
    xf(mmCyl('y', 1.0, 0.4, 16), mmv(0, 0.2, 0)),
    xf(mmBox(1.1, 0.08, 0.22), mmv(0, 0.37, 0)), xf(mmBox(0.22, 0.08, 1.1), mmv(0, 0.37, 0)),
    xf(mmCyl('y', 0.55, 3.6, 10), mmv(0, -1.8, 0)),
  ]));
}

// punt in veelhoek (mm)
function boInPoly(x, z, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c;
  }
  return c;
}
// Passieve componenten (condensatoren, weerstanden, spoeltjes) verspreid over vrije plekken: een raster met toeval
// (vaste zaadwaarde, dus elke keer dezelfde plaatsing). Geeft { cap, res } (geometrie per materiaal) in wereldeenheden.
// poly: omtrek, keep: lijst [x0, x1, z0, z1] die vrij moet blijven, ring: [buiten, binnen] die vrij moet blijven.
function boPassives(key, poly, keep, ring, y, seed, step = 0.95, prob = 0.6) {
  const res = GC.get('boPas' + key + 'r');
  if (res) return { cap: GC.get('boPas' + key + 'c'), res };
  let s = seed >>> 0;
  const rnd = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
  const SIZES = [[0.6, 0.3, 0.3], [0.6, 0.3, 0.3], [1.0, 0.5, 0.35], [1.0, 0.5, 0.5], [1.6, 0.8, 0.5]];
  const inR = (x, z, r, m) => x > r[0] - m && x < r[1] + m && z > r[2] - m && z < r[3] + m;
  const free = (x, z, hw, hl) => {
    for (const [cx, cz] of [[x - hw, z - hl], [x + hw, z - hl], [x + hw, z + hl], [x - hw, z + hl]]) {
      if (!boInPoly(cx, cz, poly)) return false;
      for (const k of keep) if (inR(cx, cz, k, 0.25)) return false;
      if (ring && inR(cx, cz, ring[0], 0.3) && !inR(cx, cz, ring[1], -0.3)) return false;
    }
    // afstand tot de rand van de omtrek
    for (const [dx, dz] of [[0.4, 0], [-0.4, 0], [0, 0.4], [0, -0.4]]) if (!boInPoly(x + dx + Math.sign(dx) * hw, z + dz + Math.sign(dz) * hl, poly)) return false;
    return true;
  };
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (const [x, z] of poly) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  const caps = [], ress = [];
  for (let z = z0 + 0.6; z < z1 - 0.3; z += step) for (let x = x0 + 0.6; x < x1 - 0.3; x += step) {
    if (rnd() > prob) continue;
    const sz = SIZES[(rnd() * SIZES.length) | 0], rot = rnd() < 0.5;
    const w = rot ? sz[1] : sz[0], l = rot ? sz[0] : sz[1], h = sz[2];
    const px = x + (rnd() - 0.5) * (step - w) * 0.6, pz = z + (rnd() - 0.5) * (step - l) * 0.6;
    if (!free(px, pz, w / 2, l / 2)) continue;
    const isCap = rnd() < 0.62;
    (isCap ? caps : ress).push(xf(mmBox(w, h, l), mmv(px, y + h / 2, pz)));
  }
  const cap = merge(caps), rs = merge(ress);
  GC.set('boPas' + key + 'c', cap); GC.set('boPas' + key + 'r', rs);
  return { cap, res: rs };
}

// soldeervlakken op de interposerrand: twee rijen langs het midden van de rand, niet bij de schroeven; van y0 tot de RF-print
function boPadGeo(y0) {
  return cache('boPads', () => {
    const h = BO_Y.rf0 - y0, parts = [], pitch = 0.55;
    const cx0 = (BO_RF[0] + BO_CAV[0]) / 2, cx1 = (BO_RF[1] + BO_CAV[1]) / 2, cz1 = (BO_RF[3] + BO_CAV[3]) / 2, cz0 = (BO_RF[2] + BO_CAV[2]) / 2;
    const nearScrew = (x, z) => BO_SCREWS.some(([a, b]) => Math.hypot(a - x, b - z) < 1.2);
    const row = (ax, az, bx, bz) => {
      const L = Math.hypot(bx - ax, bz - az), n = Math.floor((L - 2.4) / pitch), ux = (bx - ax) / L, uz = (bz - az) / L;
      for (let i = 0; i <= n; i++) for (const o of [-0.4, 0.4]) {
        const t = 1.2 + i * pitch, x = ax + ux * t - uz * o, z = az + uz * t + ux * o;
        if (!nearScrew(x, z)) parts.push(xf(mmBox(0.32, h, 0.32), mmv(x, y0 + h / 2, z)));
      }
    };
    row(cx0, cz0, cx1, cz0); row(cx1, cz0, cx1, cz1); row(cx1, cz1, cx0, cz1); row(cx0, cz1, cx0, cz0);
    return merge(parts);
  });
}

// antennesporen op de afdekplaat: stroken (breedte w) langs een gebroken lijn, op y 6,98 tot 7,0
function boTraceGeo() {
  return cache('boTraces', () => {
    const lines = [
      [0.8, [[-12.8, -24.5], [-12.8, -38.6], [-6, -38.6]]],
      [0.5, [[-11, -36], [-3, -36], [-3, -34], [-11, -34], [-11, -32], [-3, -32], [-3, -30], [-11, -30]]],
      [0.9, [[0.8, -60], [0.8, -78.0], [16.5, -78.0], [16.5, -76.6], [19.5, -76.6], [19.5, -78.0], [27.8, -78.0], [27.8, -50.2]]],
      [0.9, [[27.8, -44.8], [27.8, -20.0], [17, -20.0]]],
      [0.7, [[3.5, -20.0], [-9, -20.0]]],
      [0.6, [[2.4, -74.5], [2.4, -60]]],
    ];
    const t = BO_Y.cov2 - BO_Y.cov1, yc = (BO_Y.cov1 + BO_Y.cov2) / 2, parts = [];
    for (const [w, pts] of lines) for (let i = 1; i < pts.length; i++) {
      const [ax, az] = pts[i - 1], [bx, bz] = pts[i], L = Math.hypot(bx - ax, bz - az) + w;
      parts.push(xf(mmBox(L, t, w), mmv((ax + bx) / 2, yc, (az + bz) / 2), [0, -Math.atan2(bz - az, bx - ax), 0]));
    }
    return merge(parts);
  });
}

function boBuild() {
  const Y = BO_Y;
  const est = ' Vorm, maat en plaats zijn geschat.';
  // ---------- hoofdprint ----------
  const mainHoles = BO_SCREWS.map(([x, z]) => [x, z, 0.65]);
  const mainPcb = P('Printplaat hoofdprint', boPlanGeo('Main', boFillet(BO_MAIN, 0.8), mainHoles, Y.main0, Y.main1), MAT.pcb, {
    d: 'Onderste print van de sandwich (meerlaags, ongeveer 0,7 mm dik). Hij wijkt met inkepingen voor de camerakolom, de periscoop met laser-AF, de selfiecamera en de oorspeaker, en eindigt vóór de S Pen-silo.' + est,
    ex: [0, -0.06, 0],
  });
  const chip = (name, d, w, l, h, x, z, y, ex, extra) => P(name, boChipGeo(w, l, h), MAT.chip, Object.assign({ d, p: mmv(x, y, z), ex }, extra || {}));
  const can = (name, d, w, l, h, x, z, y, ex) => P(name, boCanGeo(w, l, h), MAT.shield, { d, p: mmv(x, y, z), ex });
  const conn = (name, d, w, l, pins, x, z, rot, ex) => P(name, boConnGeo(w, l, 0.75, pins), MAT.steel, { d, p: mmv(x, Y.main1, z), r: rot ? [0, HALF, 0] : undefined, ex });

  const soc = A('SoC met geheugen', {
    d: 'De processor met het werkgeheugen erbovenop gestapeld (package-on-package), onder een eigen afschermkap, midden in de holte van de interposer. De warmte gaat via de print en een warmtegeleidend kussen naar de vapor chamber.' + est,
    ex: [0, 0.12, 0],
  }, [
    P('SoC Snapdragon 8 Elite Gen 5 for Galaxy', merge([xf(mmBox(13, 0.25, 13), mmv(0, 0.125, 0)), xf(boChipGeo(11, 11, 0.3, 0.2), mmv(0, 0.25, 0))]), MAT.chip, {
      d: 'De systeemchip (processor, grafische kern en neurale eenheid) op een eigen substraat, ongeveer bij x +14, z -52 op de hoofdprint. De chip zelf is bevestigd; behuizing en maat zijn geschat.',
      spec: [['Chip', 'Snapdragon 8 Elite Gen 5 for Galaxy']],
      p: mmv(14, Y.main1, -52), ex: [0, 0.05, 0],
    }),
    chip('LPDDR5X-werkgeheugen 16 GB', 'Het werkgeheugen, gestapeld op de SoC. De 16 GB is bevestigd voor deze uitvoering met 1 TB; het type LPDDR5X en de stapeling zijn een schatting.' + est,
      12, 12, 0.6, 14, -52, Y.main1 + 0.55, [0, 0.2, 0], { spec: [['Werkgeheugen', '16 GB']] }),
    P('Koelpasta op de SoC', boChipGeo(10, 10, 0.08, 0.03), MAT.boPaste, {
      d: 'Een laag koelpasta tussen het geheugen en de deksel van de afschermkap. Samsung noemt warmtegeleidend materiaal rond de processor; deze laag, haar dikte en plaats zijn een schatting.',
      p: mmv(14, Y.main1 + 1.15, -52), ex: [0, 0.34, 0],
    }),
    can('Afschermkap SoC', 'Metalen kapje over de SoC tegen storing van en naar de radio\'s; de deksel raakt de koelpasta.' + est, 15.6, 15.6, 1.35, 14, -52, Y.main1, [0, 0.5, 0]),
  ]);

  const storage = A('Opslag en energiebeheer', {
    d: 'Opslagchip, energiebeheerchip en spoelen onder één afschermkap, tussen de SoC en de batterijkant van het bord.' + est,
    ex: [0, 0.1, 0.05],
  }, [
    chip('UFS 4-opslag 1 TB', 'De flashopslag van 1 TB (de capaciteit is bevestigd voor deze uitvoering). UFS 4 volgens de specificaties op iFixit (één bron, dus niet in de specificaties). Behuizing ongeveer 11,5 × 13 mm, zoals gebruikelijk voor UFS.' + est,
      13, 11.5, 1.0, 10.5, -35.5, Y.main1, [0, 0.16, 0], { spec: [['Opslag', '1 TB']] }),
    chip('PMIC', 'De energiebeheerchip: maakt uit de batterijspanning de voedingsspanningen voor de SoC, het geheugen en de rest van het bord.' + est, 6.5, 6.5, 0.6, 21.5, -37, Y.main1, [0, 0.14, 0]),
    P('Spoelen PMIC', merge([[19.4, -31.2], [21.6, -31.2], [23.8, -31.2]].map(([x, z]) => xf(boChipGeo(1.9, 1.6, 0.85, 0.12), mmv(x, Y.main1, z)))), MAT.boInterposer, {
      d: 'Vermogensspoelen van de schakelende voedingen van de PMIC.' + est, ex: [0, 0.12, 0],
    }),
    can('Afschermkap opslag en PMIC', 'Metalen kapje over de opslag, de PMIC en de spoelen.' + est, 22.2, 13.5, 1.15, 14.5, -35.55, Y.main1, [0, 0.42, 0]),
  ]);

  const audio = A('Audio en laden', {
    d: 'Audiocodec, versterkers voor de luidsprekers en de laadchip onder een gezamenlijke afschermkap, aan de bovenkant van de holte.' + est,
    ex: [0, 0.1, -0.06],
  }, [
    chip('Audiocodec', 'Zet de signalen van de microfoons en naar de luidsprekers om tussen analoog en digitaal.' + est, 4.5, 4.5, 0.55, 7.5, -64.5, Y.main1, [0, 0.14, 0]),
    P('Audioversterkers', merge([xf(boChipGeo(2.6, 2.6, 0.5), mmv(12.5, Y.main1, -62.8)), xf(boChipGeo(2.6, 2.6, 0.5), mmv(12.5, Y.main1, -66.2))]), MAT.chip, {
      d: 'Twee versterkers voor de luidspreker onderin en de oorspeaker (stereo).' + est, ex: [0, 0.14, 0],
    }),
    chip('Laadchip', 'Regelt het laden van de batterij via USB-C en de laadspoel.' + est, 4, 4, 0.55, 20.5, -64.5, Y.main1, [0, 0.14, 0]),
    can('Afschermkap audio en laden', 'Metalen kapje over de audiocodec, de versterkers en de laadchip.' + est, 22, 7, 0.95, 14.5, -64.5, Y.main1, [0, 0.4, 0]),
  ]);

  const conns = A('Connectoren hoofdprint', {
    d: 'Bord-op-bordconnectoren waar de flexkabels van de camera\'s, de batterij en het subbord op klikken. Volgens de teardowns zitten de camera\'s van onderen aan het bord vast; daarom liggen hun connectoren vlak naast de camerakolom.' + est,
    ex: [0, 0.18, 0],
  }, [
    conn('Connector ultragroothoekcamera (bord)', 'Connector voor de flexkabel van de ultragroothoekcamera.' + est, 5, 2.6, 16, -9.5, -36.6, false, [-0.08, 0.1, -0.04]),
    conn('Connector hoofdcamera (bord)', 'Connector voor de flexkabel van de hoofdcamera van 200 MP.' + est, 5.4, 2.6, 18, -3.6, -36.6, false, [0.02, 0.1, -0.04]),
    conn('Connector telecamera 3× (bord)', 'Connector voor de flexkabel van de telecamera (3×).' + est, 5, 2.6, 16, -9.5, -31.2, false, [-0.08, 0.1, 0]),
    conn('Connector periscoopcamera (bord)', 'Connector voor de flexkabel van de periscoopcamera (5×) en de laser-AF.' + est, 5, 2.6, 16, -3.6, -31.2, false, [0.02, 0.1, 0]),
    conn('Connector hoofdflex (bord)', 'Connector voor de hoofdflexkabel naar het subbord onderin; daarover lopen ook de signalen van het scherm.' + est, 8.5, 3, 24, -5.2, -24.2, false, [0, 0.1, 0.06]),
    conn('Batterijconnector (bord)', 'Connector voor de flexkabel van de batterij, aan de rand van het bord vlak bij de batterij.' + est, 8, 3.4, 12, 14, -21.6, false, [0, 0.1, 0.1]),
    conn('Connector selfiecamera (bord)', 'Connector voor de flexkabel van de selfiecamera, die onder het bord zit.' + est, 4.6, 2.4, 14, 7.6, -72.6, false, [0, 0.1, -0.08]),
    P('Veercontacten oorspeaker', merge([12.6, 15.4].map(x => merge([xf(mmBox(1.4, 0.15, 1.4), mmv(x, Y.main1 + 0.075, -73.6)), xf(mmBox(0.5, 0.7, 1.0), mmv(x, Y.main1 + 0.5, -73.6), [0.35, 0, 0])]))), MAT.gold, {
      d: 'Twee verende contacten die tegen de aansluitingen van de oorspeaker drukken.' + est, ex: [0, 0.1, -0.08],
    }),
    P('Antenneconnector hoofdprint', boCoaxGeo(), MAT.steel, { d: 'Coaxiale connector voor de antennekabel naar de bovenrand.' + est, p: mmv(26.6, Y.main1, -72.5), ex: [0.04, 0.1, -0.06] }),
  ]);

  const mainKeep = [
    [6.2, 21.8, -59.8, -44.2], [3.4, 25.6, -42.3, -28.8], [3.5, 25.5, -68, -61],
    [-12.1, -6.9, -38, -35.2], [-6.3, -0.9, -38, -35.2], [-12.1, -6.9, -32.6, -29.8], [-6.3, -0.9, -32.6, -29.8],
    [-9.5, -0.9, -25.8, -22.6], [10, 18, -23.4, -19.8], [5.3, 9.9, -73.9, -71.3], [11.8, 16.2, -74.4, -72.8], [25.5, 27.7, -73.6, -71.4],
    ...BO_SCREWS.map(([x, z]) => [x - 1.1, x + 1.1, z - 1.1, z + 1.1]),
  ];
  const mainPas = boPassives('Main', BO_MAIN, mainKeep, [BO_RF, BO_CAV], Y.main1, 20261016, 0.66, 0.8);
  const main = A('Hoofdprint', {
    d: 'De onderste print van de sandwich met de SoC, het geheugen, de opslag, het energiebeheer en de connectoren. De grote chips zitten binnen de rand van de interposer, onder de RF-print.' + est,
    ex: [0, 0.04, 0],
  }, [
    mainPcb, soc, storage, audio, conns,
    P('Condensatoren hoofdprint', mainPas.cap, MAT.boCap, { d: 'Honderden kleine keramische condensatoren voor de ontkoppeling van de voedingen. Aantal en plaats zijn een illustratie, geen kopie van het echte bord.', ex: [0, 0.07, 0] }),
    P('Weerstanden en spoeltjes hoofdprint', mainPas.res, MAT.chip, { d: 'Kleine weerstanden, spoeltjes en filters tussen de grote chips. Aantal en plaats zijn een illustratie, geen kopie van het echte bord.', ex: [0, 0.07, 0] }),
  ]);

  // ---------- interposer ----------
  const rfOut = boFillet(boRect(BO_RF[0], BO_RF[1], BO_RF[2], BO_RF[3]), 1.5);
  const cavIn = boFillet(boRect(BO_CAV[0], BO_CAV[1], BO_CAV[2], BO_CAV[3]), 0.8);
  const ipTop = Y.rf0 - 0.05;
  const interposer = A('Interposer', {
    d: 'Een rand van printmateriaal (ongeveer 1,6 mm breed en hoog) tussen de hoofdprint en de RF-print. Aan boven- en onderkant zitten honderden soldeerverbindingen die de twee printen met elkaar verbinden; binnen de rand ontstaat een holte voor de chips van de hoofdprint.' + est,
    ex: [0, 0.95, 0],
  }, [
    P('Interposerrand', boPlanGeo('Interposer', rfOut, [cavIn, ...BO_RF_SCREWS.map(([x, z]) => [x, z, 0.62])], Y.main1, ipTop), MAT.boInterposer, {
      d: 'De rand zelf: een smalle print met verticale doorverbindingen.' + est, ex: [0, -0.04, 0],
    }),
    P('Soldeervlakken interposer', boPadGeo(ipTop), MAT.gold, {
      d: 'Twee rijen soldeervlakken op de bovenkant van de rand, die met de onderkant van de RF-print worden versoldeerd. Aantal en steek zijn geschat.',
      ex: [0, 0.08, 0],
    }),
  ]);

  // ---------- RF-print ----------
  const rfY = Y.rf1;
  const rfKeep = [[3.6, 12.4, -65.4, -56.6], [14.5, 26.5, -66.5, -53], [4.5, 11.5, -50.5, -43.5], [18, 22, -42, -38], [14.5, 24.5, -32.5, -27.5],
    ...[[3.2, -28], [25.4, -28], [25.4, -42.5], [3.2, -54]].map(([x, z]) => [x - 1.1, x + 1.1, z - 1.1, z + 1.1]),
    ...BO_RF_SCREWS.map(([x, z]) => [x - 1.1, x + 1.1, z - 1.1, z + 1.1])];
  const rfPas = boPassives('RF', rfOut, rfKeep, null, rfY, 7041, 0.72, 0.72);
  const rf = A('RF-print', {
    d: 'De bovenste print van de sandwich, op de interposer. Hierop zitten het modem en de radio-onderdelen (mobiel netwerk, wifi, bluetooth, NFC) met hun afschermkapjes en de connectoren voor de antennekabels.' + est,
    ex: [0, 1.3, 0],
  }, [
    P('Printplaat RF-print', boPlanGeo('RF', rfOut, BO_RF_SCREWS.map(([x, z]) => [x, z, 0.65]), Y.rf0, Y.rf1), MAT.pcb, { d: 'Printplaat van de RF-print, ongeveer 0,7 mm dik.' + est, ex: [0, 0.03, 0] }),
    A('Modem', { d: 'Het modem met de RF-transceiver onder een eigen afschermkap.' + est, ex: [0, 0.06, -0.04] }, [
      chip('Modem en RF-transceiver', 'Zet de digitale gegevens om in radiosignalen voor 5G, 4G en oudere netwerken en terug.' + est, 7, 7, 0.35, 8, -61, rfY, [0, 0.12, 0]),
      can('Afschermkap modem', 'Metalen kapje over het modem.' + est, 8.8, 8.8, 0.48, 8, -61, rfY, [0, 0.3, 0]),
    ]),
    A('Vermogensversterkers', { d: 'De zendversterkers voor de verschillende frequentiebanden, onder één afschermkap.' + est, ex: [0, 0.06, -0.02] }, [
      P('Versterkermodules', merge([[17.5, -62.5, 4, 5], [23, -62.5, 4, 5], [20.3, -56.3, 5.5, 4]].map(([x, z, w, l]) => xf(boChipGeo(w, l, 0.35), mmv(x, rfY, z)))), MAT.chip, {
        d: 'Drie versterkermodules met filters (front-end) voor laag, midden en hoog frequentiebereik.' + est, ex: [0, 0.12, 0],
      }),
      can('Afschermkap versterkers', 'Metalen kapje over de versterkermodules.' + est, 12, 13.5, 0.48, 20.5, -59.75, rfY, [0, 0.3, 0]),
    ]),
    A('Wifi en bluetooth', { d: 'De chip voor wifi en bluetooth onder een eigen afschermkap.' + est, ex: [0, 0.06, 0] }, [
      chip('Wifi- en bluetoothchip', 'Radiochip voor wifi en bluetooth.' + est, 5, 5, 0.35, 8, -47, rfY, [0, 0.12, 0]),
      can('Afschermkap wifi', 'Metalen kapje over de wifi- en bluetoothchip.' + est, 7, 7, 0.48, 8, -47, rfY, [0, 0.3, 0]),
    ]),
    chip('NFC-controller', 'Stuurt de NFC-antenne in de achterkant aan (contactloos betalen).' + est, 3.5, 3.5, 0.35, 20, -40, rfY, [0, 0.1, 0]),
    chip('GNSS-ontvanger', 'Ontvanger voor plaatsbepaling via satellieten.' + est, 3.2, 3.2, 0.35, 16.8, -30, rfY, [0, 0.1, 0.02]),
    P('Antenneconnectoren RF-print', merge([[3.2, -28], [25.4, -28], [25.4, -42.5], [3.2, -54]].map(([x, z]) => xf(boCoaxGeo(), mmv(x, rfY, z)))), MAT.steel, {
      d: 'Vier coaxiale connectoren voor de kabels naar de antennes in het frame en de afdekplaat.' + est, ex: [0, 0.1, 0],
    }),
    P('Condensatoren RF-print', rfPas.cap, MAT.boCap, { d: 'Kleine keramische condensatoren voor ontkoppeling en aanpassing van de radiosignalen. Aantal en plaats zijn een illustratie.', ex: [0, 0.07, 0] }),
    P('Weerstanden en filters RF-print', rfPas.res, MAT.chip, { d: 'Kleine weerstanden, spoeltjes en filters van de radio. Aantal en plaats zijn een illustratie.', ex: [0, 0.07, 0] }),
  ]);

  // ---------- bovenafdekplaat ----------
  const coverHoles = BO_SCREWS.map(([x, z]) => [x, z, 1.05]);
  const cover = A('Bovenafdekplaat', {
    d: 'Kunststof plaat over het moederbord, vastgezet met schroeven. Er lopen antennesporen over en ze drukt het bord en de connectoren op hun plaats.' + est,
    ex: [0, 2.0, 0],
  }, [
    P('Afdekplaat (kunststof)', boPlanGeo('Cover', boFillet(BO_COVER, 1.2), coverHoles, Y.top, Y.cov1), MAT.boCover, {
      d: 'De plaat zelf, ongeveer 0,6 mm dik, van kunststof. Ze ligt over de selfiecamera en de oorspeaker heen en laat de camerakolom, de periscoop en de S Pen-silo vrij.' + est,
      ex: [0, 0.05, 0],
    }),
    P('Antennesporen bovenafdekplaat', boTraceGeo(), MAT.boAntenna, {
      d: 'Metalen sporen op de afdekplaat die als antenne werken (bijvoorbeeld voor wifi en het mobiele netwerk), via veercontacten verbonden met het bord.' + est,
      ex: [0, 0.12, 0],
    }),
    A('Schroeven bovenafdekplaat', { d: 'Zes kleine kruiskopschroeven die de afdekplaat en het bord aan het frame vastzetten.' + est, ex: [0, 0.35, 0] },
      BO_SCREWS.map(([x, z], i) => P(`Schroef bovenafdekplaat ${i + 1}`, boScrewGeo(), MAT.steel, {
        d: 'Kruiskopschroef met de kop naar de achterkant, in een verzonken gat van de afdekplaat.' + est,
        p: mmv(x, Y.cov2 - 0.4, z), ex: [0, 0.25, 0],
      }))),
  ]);

  return A('Moederbord', {
    d: 'Het moederbord bovenin het toestel, als sandwich van twee printen met een interposer ertussen, afgedekt met een kunststof plaat met antennesporen. Het wijkt rondom uit voor de camera\'s, de selfiecamera, de oorspeaker en de S Pen-silo. De opbouw volgt eerdere Galaxy Ultra-toestellen; de indeling en de maten zijn geschat.',
    spec: [['Chip', 'Snapdragon 8 Elite Gen 5 for Galaxy'], ['Geheugen', '16 GB RAM, 1 TB opslag']],
  }, [cover, rf, interposer, main]);
}

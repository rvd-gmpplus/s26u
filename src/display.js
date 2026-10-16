/* ===================== Scherm (diBuild) ===================== */
// Domeinbestand; zie docs/indeling.md voor de zones en voorvoegsels. Zolang de bouwfunctie ontbreekt, zet phone.js een plaatshouder neer.
//
// Het schermpakket ligt op de vloer: y = 0 is de buitenkant van het coverglas, y = 1,7 de achterkant van de koperfolie
// (daarboven begint de middenplaat van de behuizing). Lagen van buiten naar binnen, alle diktes zijn schattingen:
//   coverglas 0 tot 0,7 · optische lijm 0,7 tot 0,75 · polarisator 0,75 tot 0,85 · OLED-paneel 0,85 tot 1,25 ·
//   Wacom-digitizer 1,25 tot 1,5 · grafietfolie 1,5 tot 1,6 · koperfolie 1,6 tot 1,7.
// De displayflex buigt aan de onderrand om onder het paneel, loopt in een uitsparing van digitizer en folie terug en gaat door
// de sleuf in de middenplaat naar de connector (y 2,4 tot 3,0). Maten in mm, via mm() en mmv().

// eigen materialen (voorvoegsel di)
std('diPolarizer', 0x15181d, 0.15, 0.3);
phys('diOca', { color: 0xdfe6ea, metalness: 0, roughness: 0.1, transparent: true, opacity: 0.22, depthWrite: false });
std('diDigitizer', 0x4a3b28, 0.2, 0.55);
std('diTape', 0x101113, 0, 0.85);
std('diPiezo', 0x8f949a, 0.6, 0.4);

// selfiecameragat en uitsparingen (mm, modelframe)
const DI_HOLE = { x: 0, z: -76, d: 3.2 };
const DI_FP = { x0: -4.5, x1: 4.5, z0: 44, z1: 53 };      // vingerafdruksensor (schatting)
const DI_SELFIE = { x0: -3.8, x1: 3.8, z0: -78.3, z1: -70.7 }; // ruimte voor de selfiecamera onder het paneel (zone -3,5..3,5 / -78..-71)
const DI_NOTCH = { x: 6.5, z: 63 };                       // uitsparing in digitizer en folie voor de displayflex

// afgeronde rechthoek in mm als punten (x, z), tegen de klok in; met notch een uitsparing aan de onderrand (+z) van
// x -notch.x tot +notch.x vanaf z = notch.z tot de rand
function diOutline(w, l, r, notch, n = 8) {
  const pts = rrectPts(w, l, r, n), out = [];
  // rrectPts: hoek 0 eindigt op (hw - r, hh), hoek 1 begint op (-hw + r, hh); daartussen ligt de onderrand (+z)
  pts.forEach((p, i) => {
    out.push(p);
    if (notch && i === n) out.push([notch.x, l / 2], [notch.x, notch.z], [-notch.x, notch.z], [-notch.x, l / 2]);
  });
  return out.map(([x, z]) => [mm(x), mm(z)]);
}
function diRectPath(x0, x1, z0, z1, r = 0.4) {
  const pts = rrectPts(x1 - x0, z1 - z0, r, 2).map(([x, z]) => [mm(x + (x0 + x1) / 2), mm(z + (z0 + z1) / 2)]);
  const h = new THREE.Path(); pts.forEach((p, i) => i ? h.lineTo(p[0], p[1]) : h.moveTo(p[0], p[1])); h.closePath();
  return h;
}
// laag in bovenaanzicht: omtrek (wereldpunten), gaten (paden), van y0 tot y1 in mm
function diLayer(key, outline, holes, y0, y1) {
  return cache('di' + key, () => {
    const s = shapeOf(outline);
    holes.forEach(h => s.holes.push(h));
    const g = plan(s, mm(y1 - y0));
    g.translate(0, mm((y0 + y1) / 2), 0);
    return g;
  });
}
// lint met dikte t (mm) langs een middellijn in het (z, y)-vlak (mm), breedte w langs x, gecentreerd op x = 0
function diRibbon(key, line, t, w) {
  return cache('di' + key, () => {
    const up = [], dn = [];
    line.forEach((p, i) => {
      const a = line[Math.max(0, i - 1)], b = line[Math.min(line.length - 1, i + 1)];
      const dz = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dz, dy), nz = -dy / l, ny = dz / l;
      up.push([mm(p[0] + nz * t / 2), mm(p[1] + ny * t / 2)]);
      dn.push([mm(p[0] - nz * t / 2), mm(p[1] - ny * t / 2)]);
    });
    return side(shapeOf(up.concat(dn.reverse())), mm(w));
  });
}
// boog in het (z, y)-vlak: middelpunt (cz, cy), straal r, van hoek a0 naar a1 (radialen, hoek 0 = +z, HALF = +y)
function diArc(cz, cy, r, a0, a1, n) {
  const out = [];
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; out.push([cz + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return out;
}

function diBuild() {
  const est = 'Laagdikte en omtrek zijn geschat.';
  const holeP = d => circlePath(mm(DI_HOLE.x), mm(DI_HOLE.z), mm(d / 2));

  // coverglas: 0,3 mm binnen de buitenmaat, afgeronde randen
  const glass = cache('diGlass', () => { const g = mmSlab(77.5, 163, 0.7, 8.2, 0.28).clone(); g.translate(0, mm(0.35), 0); return g; });

  // lijmrand: zwarte tape tussen de rand van het coverglas en de schermrichel van het frame
  const tape = cache('diTape', () => {
    const s = shapeOf(diOutline(77.2, 162.7, 8.05, null, 8));
    const inner = rrectPts(75.4, 159.8, 7.2, 8).map(([x, z]) => [mm(x), mm(z)]);
    const h = new THREE.Path(); inner.forEach((p, i) => i ? h.lineTo(p[0], p[1]) : h.moveTo(p[0], p[1])); h.closePath();
    s.holes.push(h);
    const g = plan(s, mm(0.15)); g.translate(0, mm(0.775), 0); return g;
  });

  // paneelpakket: zelfde omtrek als het actieve paneel (x ±37,4, z ±79,6)
  const panelO = diOutline(74.8, 159.2, 7.0, null, 16);
  const oca = diLayer('Oca', panelO, [holeP(3.4)], 0.7, 0.72); // dunner getekend: vlakken op minder dan 0,03 mm van de polarisator geven z-fighting
  const pol = diLayer('Pol', panelO, [holeP(3.4)], 0.75, 0.845);
  const oled = diLayer('Oled', panelO, [holeP(DI_HOLE.d)], 0.85, 1.25);
  // digitizer en folie: iets kleiner, met uitsparingen voor selfiecamera, vingerafdruksensor en de displayflex
  const cut = () => [diRectPath(DI_SELFIE.x0, DI_SELFIE.x1, DI_SELFIE.z0, DI_SELFIE.z1, 1.2), diRectPath(DI_FP.x0 - 0.1, DI_FP.x1 + 0.1, DI_FP.z0 - 0.1, DI_FP.z1 + 0.1, 0.4)];
  const digi = diLayer('Digi', diOutline(74.4, 158.8, 6.8, DI_NOTCH, 16), cut(), 1.25, 1.5);
  const graf = diLayer('Graf', diOutline(74.2, 158.6, 6.7, DI_NOTCH, 16), cut(), 1.5, 1.6);
  const kop = diLayer('Kop', diOutline(73.8, 158.2, 6.5, DI_NOTCH, 16), cut(), 1.6, 1.7);

  // vingerafdruksensor (ultrasoon): piëzostapel en eigen flexje in de uitsparing van digitizer en folie
  const fx = (DI_FP.x0 + DI_FP.x1) / 2, fz = (DI_FP.z0 + DI_FP.z1) / 2;
  const fpBody = cache('diFpBody', () => { const g = mmSlab(8.6, 8.6, 0.3, 0.6, 0.05).clone(); g.translate(...mmv(fx, 1.4, fz)); return g; });
  const fpFlex = cache('diFpFlex', () => merge([xf(mmBox(9, 0.12, 9), mmv(fx, 1.62, fz)), xf(mmBox(3, 0.06, 2), mmv(fx, 1.67, fz))]));

  // displayflex: middellijn in (z, y), dikte 0,1, breedte 11 (x -5,5 tot +5,5)
  const line = [[79.3, 1.05]]
    .concat(diArc(79.45, 1.25, 0.2, -HALF, HALF, 8))
    .concat([[79.3, 1.45], [70, 1.45], [64.6, 1.45]])
    .concat(diArc(64.3, 2.05, 0.6, -HALF, -PI, 6))
    .concat([[63.7, 2.4]]);
  // de boog rond de onderrand ligt rond z 79,45: buitenkant op 79,7, binnen de onderrand van het coverglas
  const flex = diRibbon('Flex', line, 0.1, 11);
  const ddi = cache('diDdi', () => merge([xf(mmBox(5, 0.1, 2.4), mmv(0, 1.55, 72.2)), xf(mmBox(9, 0.08, 4), mmv(0, 1.54, 68))]));
  const conBody = cache('diConBody', () => merge([xf(mmBox(11.6, 0.4, 1.8), mmv(0, 2.6, 63.5)), xf(mmBox(10.4, 0.1, 1.2), mmv(0, 2.85, 63.5))]));
  const conPlate = cache('diConPlate', () => xf(mmBox(11.8, 0.08, 1.8), mmv(0, 2.94, 63.5)));

  return A('Scherm', {
    d: 'Schermpakket aan de voorkant: coverglas, het 6,9 inch OLED-paneel met polarisator en optische lijm, de Wacom-digitizer voor de S Pen, koper- en grafietfolie, de ultrasone vingerafdruksensor en de displayflex. Het paneel heeft Privacy Display, waarmee de kijkhoek per app of per stuk scherm te beperken is (persbericht van Samsung). Laagdiktes en de binnenindeling zijn geschat.',
  }, [
    P('Coverglas', glass, MAT.coverGlass, {
      d: 'Vlak coverglas met afgeronde randen, 0,3 mm binnen de buitenmaat. Volgens iFixit is het Corning Gorilla Armor 2 met een antireflectielaag. Dikte (0,7 mm) en hoekstraal zijn geschat.',
      ex: [0, -0.5, 0],
    }),
    P('Lijmrand coverglas', tape, MAT.diTape, {
      d: 'Zwarte lijmtape rondom tussen de rand van het coverglas en de schermrichel van het frame; wordt bij vervanging verwarmd en losgesneden. Breedte en dikte zijn geschat.',
      ex: [0, -0.3, 0],
    }),
    A('Displaymodule', {
      d: 'Het OLED-paneel met alles wat er vast op gelamineerd zit; wordt als één onderdeel vervangen. ' + est,
      ex: [0, 0.05, 0],
    }, [
      P('Optische lijm', oca, MAT.diOca, { d: 'Heldere optische lijm (OCA) die de polarisator op het coverglas plakt. ' + est, ex: [0, -0.3, 0] }),
      P('Polarisator', pol, MAT.diPolarizer, { d: 'Circulaire polarisator op het paneel, tegen reflectie van omgevingslicht; met een gat voor de selfiecamera. ' + est, ex: [0, -0.18, 0] }),
      P('OLED-paneel', oled, MAT.oled, {
        d: 'Dynamic AMOLED 2X-paneel van 6,9 inch met een punch-hole van Ø 3,2 mm voor de selfiecamera (middenboven). Privacy Display zit in het paneel zelf. Omtrek en dikte zijn geschat; de plek van het gat is op de foto gezien.',
        spec: [['Scherm', '6,9 inch QHD+ Dynamic AMOLED 2X'], ['Met afgeronde hoeken', '6,7 inch'], ['Resolutie', '3120 × 1440'], ['Verversing', '1–120 Hz']],
        ex: [0, -0.06, 0],
      }),
      P('Wacom-digitizer', digi, MAT.diDigitizer, { d: 'Elektromagnetische digitizer van Wacom onder het paneel, die de S Pen waarneemt. Met uitsparingen voor de selfiecamera, de vingerafdruksensor en de displayflex. ' + est, ex: [0, 0.08, 0] }),
      P('Grafietfolie', graf, MAT.graphite, { d: 'Grafietfolie met schuimlaag achter de digitizer: spreidt warmte en dempt druk op het paneel. ' + est, ex: [0, 0.2, 0] }),
      P('Koperfolie', kop, MAT.copper, { d: 'Koperfolie aan de achterkant van het schermpakket: afscherming en warmtespreiding. Het is wat je ziet als het scherm van achteren los ligt. ' + est, ex: [0, 0.32, 0] }),
    ]),
    A('Vingerafdruksensor', {
      d: 'Ultrasone vingerafdruksensor onder het scherm (volgens de iFixit-specificaties), in een uitsparing van digitizer en folie. Maat en plek zijn geschat.',
      ex: [0.55, 0.3, 0.1],
    }, [
      P('Ultrasone sensor', fpBody, MAT.diPiezo, { d: 'Piëzo-element dat een ultrasone puls door het glas stuurt en de echo van de vingerafdruk meet. Maat geschat.', ex: [0, -0.05, 0] }),
      P('Sensorflex', fpFlex, MAT.flex, { d: 'Dun flexje met verstevigingsplaatje achter de sensor. Het verloop naar het moederbord is niet getekend; maat geschat.', ex: [0, 0.1, 0] }),
    ]),
    A('Displayflex', {
      d: 'Flexkabel van het paneel: buigt aan de onderrand om onder het paneel, loopt terug en gaat door een sleuf in de middenplaat naar de connector. Volgens iFixit is de schermconnector alleen van achteren bereikbaar, na het achterglas en de afdekplaten. Verloop en maten zijn geschat.',
      ex: [0, 0.45, 0.55],
    }, [
      P('Flexkabel', flex, MAT.flex, { d: 'Polyimide flexkabel, 11 mm breed, met een omslag van 180 graden rond de onderrand van het paneel. Verloop geschat.', ex: [0, 0.04, 0.08] }),
      P('Displaydriver', ddi, MAT.chip, { d: 'Driver-IC van het paneel met verstevigingsplaat op de teruglopende flex. Plek en maat zijn geschat.', ex: [0, 0.14, 0.05] }),
      A('Displayconnector', {
        d: 'Board-to-board-connector aan het eind van de displayflex, boven de sleuf in de middenplaat. Volgens iFixit alleen van achteren bereikbaar. Maat geschat.',
        ex: [0, 0.3, -0.1],
      }, [
        P('Connectorblok', conBody, MAT.plastic, { d: 'Kunststof connectorblok met de contacten. Maat geschat.', ex: [0, 0.06, 0] }),
        P('Verstevigingsplaat connector', conPlate, MAT.steel, { d: 'Stalen verstevigingsplaatje op de connector. Maat geschat.', ex: [0, 0.14, 0] }),
      ]),
    ]),
  ]);
}

/* ===================== Camera's (caBuild) ===================== */
// Domeinbestand; zie docs/indeling.md voor de zones en voorvoegsels. Zolang de bouwfunctie ontbreekt, zet phone.js een plaatshouder neer.
// Alle maten in mm (modelframe): x breedte, y dikte (scherm op y = 0, achterkant boven), z lengte (bovenrand naar -z).
// De camera's achter kijken naar +y door het achterglas; de selfiecamera kijkt naar -y door het gat in het scherm.
// Behalve de specificaties in `spec` zijn alle vormen en maten hier schattingen binnen de zones van docs/indeling.md.

// eigen materialen (voorvoegsel ca)
std('caSensor', 0x2b2546, 0.55, 0.22);
std('caFosfor', 0xe6c24a, 0.05, 0.45);
std('caMagneet', 0x5d6168, 0.85, 0.38);
std('caLensbuis', 0x121316, 0.05, 0.55);
phys('caIrFilter', { color: 0x4f6f9a, metalness: 0, roughness: 0.05, transparent: true, opacity: 0.45, depthWrite: false });

const CA_SCHATTING = 'Vorm en maten zijn geschat.';

// doos tussen twee hoeken in mm, als losse geometrie op zijn plek (voor merge)
function caBx(x0, x1, y0, y1, z0, z1) {
  return xf(mmBox(x1 - x0, y1 - y0, z1 - z0), mmv((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2));
}
// positie van het midden van een doos tussen twee hoeken
function caMid(x0, x1, y0, y1, z0, z1) { return mmv((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); }
// plaat in bovenaanzicht (vorm in mm in het x-z-vlak, met gaten), dikte langs y van y0 tot y1, op zijn plek
function caPlate(key, outer, holes, y0, y1, seg = 12) {
  return cache('caPl' + key, () => {
    const s = shapeOf(outer.map(p => [mm(p[0]), mm(p[1])]));
    for (const h of holes) {
      if (h.r) s.holes.push(circlePath(mm(h.x), mm(h.z), mm(h.r)));
      else { const p = new THREE.Path(); h.pts.forEach((q, i) => i ? p.lineTo(mm(q[0]), mm(q[1])) : p.moveTo(mm(q[0]), mm(q[1]))); p.closePath(); s.holes.push(p); }
    }
    const g = extrude(s, mm(y1 - y0), seg);
    g.rotateX(HALF);
    g.translate(0, mm((y0 + y1) / 2), 0);
    return g;
  });
}
const caRect = (x0, x1, z0, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
// afgeronde rechthoek in mm rond (cx, cz)
const caRRect = (cx, cz, w, l, r) => rrectPts(w, l, r, 3).map(p => [cx + p[0], cz + p[1]]);
// lathe-profiel in mm rond de y-as
function caLathe(key, pts, seg) { return G.lathe('y', pts.map(p => [mm(p[0]), mm(p[1])]), seg, 'ca' + key); }

/* ---------- de drie grote modules in de camerakolom ---------- */
// c: { naam, key, cx, cz, s (zijde van de module), rV (straal sensorvoet), rB (lensbuis onder), rT (lensbuis boven),
//      rG (voorlens), top (bovenkant actuatorkap), sw, sl (beeldsensor), spec, d, ex }
function caColumnModule(c) {
  const { cx, cz, s, key } = c, h = s / 2, yTop = c.top;
  const kapIn = h - 0.25;
  // actuatorkap: vier wanden en een deksel met een rond gat voor de lensbuis
  const kap = cache('caKap' + key, () => merge([
    caBx(cx - h, cx + h, 3.45, yTop - 0.2, cz - h, cz - h + 0.25), caBx(cx - h, cx + h, 3.45, yTop - 0.2, cz + h - 0.25, cz + h),
    caBx(cx - h, cx - h + 0.25, 3.45, yTop - 0.2, cz - h + 0.25, cz + h - 0.25), caBx(cx + h - 0.25, cx + h, 3.45, yTop - 0.2, cz - h + 0.25, cz + h - 0.25),
    caPlate('KapDeksel' + key, caRRect(cx, cz, s, s, 0.6), [{ x: cx, z: cz, r: c.rB + 0.2 }], yTop - 0.2, yTop, 24),
  ]));
  // vier magneten tegen de binnenkant van de kap en vier spoelen op de lensdrager (schatting)
  const ml = s * 0.55, cl = s * 0.45, y0 = 3.9, y1 = yTop - 0.4;
  const mag = cache('caMag' + key, () => merge([
    caBx(cx - ml / 2, cx + ml / 2, y0, y1, cz - kapIn, cz - kapIn + 0.6), caBx(cx - ml / 2, cx + ml / 2, y0, y1, cz + kapIn - 0.6, cz + kapIn),
    caBx(cx - kapIn, cx - kapIn + 0.6, y0, y1, cz - ml / 2, cz + ml / 2), caBx(cx + kapIn - 0.6, cx + kapIn, y0, y1, cz - ml / 2, cz + ml / 2),
  ]));
  const ci = kapIn - 0.9;
  const spoel = cache('caSpoel' + key, () => merge([
    caBx(cx - cl / 2, cx + cl / 2, y0 + 0.2, y1 - 0.2, cz - ci, cz - ci + 0.3), caBx(cx - cl / 2, cx + cl / 2, y0 + 0.2, y1 - 0.2, cz + ci - 0.3, cz + ci),
    caBx(cx - ci, cx - ci + 0.3, y0 + 0.2, y1 - 0.2, cz - cl / 2, cz + cl / 2), caBx(cx + ci - 0.3, cx + ci, y0 + 0.2, y1 - 0.2, cz - cl / 2, cz + cl / 2),
  ]));
  const yS = yTop + 0.05;
  const buis = caLathe('Buis' + key, [[0, 3.75], [c.rB, 3.75], [c.rB, yS], [c.rT, yS], [c.rT, 6.98], [c.rT - 0.25, 7.13], [c.rG + 0.15, 7.13], [c.rG + 0.15, 6.97], [0, 6.97]], 48);
  // houder van de sensor: rechthoekig raam met een venster boven de beeldsensor
  const houder = caPlate('Houder' + key, caRRect(cx, cz, s - 0.4, s - 0.4, 0.5), [{ pts: caRect(cx - c.sw / 2 - 0.5, cx + c.sw / 2 + 0.5, cz - c.sl / 2 - 0.5, cz + c.sl / 2 + 0.5) }], 2.8, 3.45, 4);
  const xe = cx + h; // rand van de module aan de kant van het moederbord (+x)
  const flex = caBx(xe - 1.2, -14.15, 2.55, 2.63, cz - 2.6, cz + 2.6);
  const plugX0 = xe + 0.05;
  return A(c.naam, { d: c.d, spec: c.spec, ex: c.ex }, [
    P('Sensorvoet met verstevigingsplaat', mmCyl('y', c.rV, 0.6, 40), MAT.steel, { d: `Stalen verstevigingsplaat onder de sensorprint; zakt door het gat in de middenplaat (binnen Ø 14 om de lensas). ${CA_SCHATTING}`, p: mmv(cx, 2.15, cz), ex: [0, -0.36, 0] }),
    P('Sensorprint', mmSlab(s, s, 0.35, 0.6, 0.08), MAT.pcb, { d: `Printje waarop de beeldsensor zit, met de flexkabel naar het moederbord. ${CA_SCHATTING}`, p: mmv(cx, 2.625, cz), ex: [0, -0.24, 0] }),
    P('Beeldsensor', mmBox(c.sw, 0.2, c.sl), MAT.caSensor, { d: `Beeldsensor (chip) midden op de sensorprint. Afmeting van het lichtgevoelige vlak geschat.`, p: mmv(cx, 2.9, cz), ex: [0, -0.12, 0] }),
    P('Sensorhouder', houder, MAT.plasticGrey, { d: `Kunststof raam om de beeldsensor; draagt het ir-filter en de actuator. ${CA_SCHATTING}`, ex: [0, -0.02, 0] }),
    P('Ir-filter', mmBox(c.sw + 1.4, 0.13, c.sl + 1.4), MAT.caIrFilter, { d: `Infraroodfilter (dun glas) tussen lens en sensor. ${CA_SCHATTING}`, p: mmv(cx, 3.515, cz), ex: [0, 0.08, 0] }),
    A('OIS- en AF-actuator', { d: `Actuator voor optische beeldstabilisatie en scherpstelling: magneten in de kap en spoelen op de lensdrager (voice coil). Opbouw en maten zijn een schatting.`, ex: [0, 0.22, 0] }, [
      P('Actuatorkap', kap, MAT.shield, { d: `Metalen kap om de actuator met een gat voor de lensbuis. ${CA_SCHATTING}`, ex: [0, 0.22, 0] }),
      P('Magneten', mag, MAT.caMagneet, { d: `Vier permanente magneten tegen de binnenkant van de kap (schatting).`, ex: [0, 0.1, 0] }),
      P('Spoelen', spoel, MAT.copper, { d: `Vier spoelen op de lensdrager die de lens bewegen voor stabilisatie en scherpstelling (schatting).`, ex: [0, 0.04, 0] }),
      P('Lensdrager', mmRing(c.rB, c.rB + 0.45, 1.6, 40), MAT.plasticGrey, { d: `Beweegbare drager om de lensbuis, aan veertjes opgehangen. ${CA_SCHATTING}`, p: mmv(cx, 4.7, cz), ex: [0, -0.04, 0] }),
    ]),
    A('Lensbuis met lenzen', { d: `Zwarte lensbuis met de lenselementen; de top eindigt net onder het achterglas. Het afdekglas en de ring horen bij de Achterkant. ${CA_SCHATTING}`, ex: [0, 0.5, 0] }, [
      P('Lensbuis', buis, MAT.caLensbuis, { d: `Lensbuis met een smaller bovendeel dat door de cameraframebeugel steekt. ${CA_SCHATTING}`, p: mmv(cx, 0, cz), ex: [0, 0.05, 0] }),
      P('Voorlens', mmCyl('y', c.rG, 0.12, 40), MAT.lensGlass, { d: `Bovenste lenselement, zichtbaar door het venster in het camera-eiland. ${CA_SCHATTING}`, p: mmv(cx, 7.04, cz), ex: [0, 0.16, 0] }),
    ]),
    P('Flexkabel', flex, MAT.flex, { d: `Flexkabel van de sensorprint naar de rand van de uitsparing in het moederbord. Verloop geschat.`, ex: [0.14, -0.2, 0] }),
    P('Connector', mmSlab(-14.15 - plugX0, 4.4, 0.5, 0.3, 0.08), MAT.shield, { d: `Bordconnector aan het eind van de flexkabel; klikt op het moederbord naast de uitsparing. ${CA_SCHATTING}`, p: mmv((plugX0 - 14.15) / 2, 2.88, cz), ex: [0.26, -0.2, 0] }),
  ]);
}

function caColumn() {
  const mods = [
    { naam: 'Ultragroothoekcamera 50 MP', key: 'UW', cx: -24.15, cz: -67.1, s: 15, rV: 6.0, rB: 5.4, rT: 4.4, rG: 3.0, top: 5.9, sw: 7.0, sl: 5.3, ex: [0, 0.22, -0.4],
      spec: [['Resolutie', '50 MP'], ['Diafragma', 'f/1,9']],
      d: `Ultragroothoekcamera, bovenaan in de kolom (volgorde in de kolom geschat, zoals bij de S24 en S25 Ultra). Zit net als de andere camera's van onderen aan het moederbord vast. Opbouw en maten zijn geschat.` },
    { naam: 'Hoofdcamera 200 MP', key: 'Main', cx: -24.15, cz: -48.9, s: 16.8, rV: 6.4, rB: 6.3, rT: 5.2, rG: 3.8, top: 6.15, sw: 10.2, sl: 7.7, ex: [0, 0.36, 0],
      spec: [['Resolutie', '200 MP'], ['Diafragma', 'f/1,4']],
      d: `Hoofdcamera met de grootste sensor en de grootste lens, in het midden van de kolom. Zit van onderen aan het moederbord vast (iFixit). Opbouw en maten zijn geschat.` },
    { naam: 'Telecamera 10 MP (3×)', key: 'Tele3', cx: -24.15, cz: -30.7, s: 14, rV: 5.4, rB: 4.9, rT: 4.2, rG: 2.8, top: 6.0, sw: 5.6, sl: 4.2, ex: [0, 0.22, 0.4],
      spec: [['Resolutie', '10 MP'], ['Zoom', '3× optisch'], ['Diafragma', 'f/2,4']],
      d: `Telecamera met drievoudige optische zoom, onderaan in de kolom (volgorde geschat). Klassieke rechtopstaande lens, geen periscoop. Opbouw en maten zijn geschat.` },
  ];
  // gezamenlijke beugel: plaat met drie gaten boven de actuatorkappen en wanden rondom (geschat)
  const x0 = -33.9, x1 = -14.1, z0 = -76.9, z1 = -21.1, yb = 5.1, yp = 6.3;
  const beugel = cache('caBeugel', () => merge([
    caPlate('BeugelPlaat', caRect(x0, x1, z0, z1), mods.map(m => ({ x: m.cx, z: m.cz, r: m.rT + 0.25 })), yp, yp + 0.2, 32),
    caBx(x0, x0 + 0.3, yb, yp, z0, z1), caBx(x1 - 0.3, x1, yb, yp, z0, z1),
    caBx(x0 + 0.3, x1 - 0.3, yb, yp, z0, z0 + 0.3), caBx(x0 + 0.3, x1 - 0.3, yb, yp, z1 - 0.3, z1),
  ]));
  return A('Camerakolom', { d: `De drie grote camera's in de uitsparing van moederbord en vapor chamber onder het camera-eiland, met hun gezamenlijke beugel. Volgens iFixit zitten de camera's van onderen aan het moederbord vast; om een camera te vervangen moet het bord eruit. Ligging volgt de lensvensters op de officiële render; de modules zelf zijn geschat.`, ex: [-0.12, 0.1, 0] }, [
    P('Cameraframebeugel', beugel, MAT.steel, { d: `Stalen beugel die de drie modules op hun plaats houdt, met gaten voor de lensbuizen en een korte rand rondom. Vorm en maten zijn geschat.`, ex: [0, 0.75, 0] }),
    ...mods.map(caColumnModule),
  ]);
}

/* ---------- periscoopcamera (plat, licht via een prisma naar +z) ---------- */
function caPeriscope() {
  const xa = -9.8, xb = -2.8, xc = (xa + xb) / 2, yb = 2.9, zA = -76, zS = -61.5, zE = -40.4;
  // zijwanden met een getrapt profiel (hoog onder het prisma, laag onder flitser en laser-AF)
  const wand = cache('caPeriWand', () => {
    const prof = [[zA, yb], [zE, yb], [zE, 5.88], [zS, 5.88], [zS, 6.9], [zA, 6.9]].map(p => [mm(p[0]), mm(p[1])]);
    const w = side(shapeOf(prof), mm(0.25), 1);
    return merge([xf(w, [mm(xa + 0.125), 0, 0]), xf(w, [mm(xb - 0.125), 0, 0])]);
  });
  const behuizing = cache('caPeriBeh', () => merge([wand, caBx(xa, xb, yb, 3.15, zA, zE), caBx(xa + 0.25, xb - 0.25, 3.15, 6.9, zA, zA + 0.25)]));
  const deksel = cache('caPeriDeksel', () => merge([
    caPlate('PeriRaam', caRect(xa, xb, zA, zS), [{ pts: caRect(-8.9, -3.7, -68.9, -65.3) }], 6.6, 6.9, 1),
    caBx(xa, xb, 5.88, 5.98, zS, -41.2),
  ]));
  // prisma: rechthoekige driehoek in het z-y-vlak; licht komt van boven (-y) en gaat na de schuine kant naar +z
  const prisma = cache('caPrisma', () => xf(side(shapeOf([[-68.6, 6.2], [-65.6, 6.2], [-65.6, 3.2]].map(p => [mm(p[0]), mm(p[1])])), mm(5.4), 1), [mm(xc), 0, 0]));
  const prismaHouder = cache('caPrismaHouder', () => xf(side(shapeOf([[-70.2, 6.2], [-68.6, 6.2], [-65.6, 3.2], [-70.2, 3.2]].map(p => [mm(p[0]), mm(p[1])])), mm(5.6), 1), [mm(xc), 0, 0]));
  // lensgroep: ovale (D-vormige) buis langs z met vier lenselementen
  const rx = 2.0, ry = 1.3, yl = 4.5, zl0 = -64.9, zl1 = -52.6;
  const buis = cache('caPeriBuis', () => xf(G.cyl('z', mm(1), mm(1), mm(zl1 - zl0), 32, true), [mm(xc), mm(yl), mm((zl0 + zl1) / 2)], null, [mm(rx) / mm(1), mm(ry) / mm(1), 1]));
  const lenzen = cache('caPeriLenzen', () => merge([-64.3, -61.2, -57.6, -53.4].map(z => xf(G.cyl('z', mm(1), mm(1), mm(0.45), 28), [mm(xc), mm(yl), mm(z)], null, [mm(rx - 0.15) / mm(1), mm(ry - 0.12) / mm(1), 1]))));
  const mag = cache('caPeriMag', () => merge([caBx(-9.5, -8.9, 3.5, 5.5, -59, -52), caBx(-3.7, -3.1, 3.5, 5.5, -59, -52)]));
  const spoel = cache('caPeriSpoel', () => merge([caBx(-8.8, -8.5, 3.7, 5.3, -58.5, -52.5), caBx(-4.1, -3.8, 3.7, 5.3, -58.5, -52.5)]));
  const flex = cache('caPeriFlex', () => merge([caBx(-6.3, -2.1, 3.4, 4.6, -40.4, -40.32), caBx(-2.18, -2.1, 3.4, 4.6, -45.6, -40.32)]));
  return A('Periscoopcamera 50 MP (5×)', {
    d: `Telecamera met vijfvoudige optische zoom in periscoopbouw: de module ligt plat in de dikte van het toestel. Een prisma onder het kleine venster buigt het licht 90° af naar de lensgroep die langs de lengte van het toestel ligt; de sensor zit aan het eind. Ligging van het venster gemeten op de render; opbouw en maten zijn geschat.`,
    spec: [['Resolutie', '50 MP'], ['Zoom', '5× optisch'], ['Diafragma', 'f/2,9']], ex: [0.3, 0.15, 0.12],
  }, [
    P('Periscoopbehuizing', behuizing, MAT.shield, { d: `Metalen bak met getrapte zijwanden: hoog onder het prisma, lager waar de flitser en de laser-AF-sensor erboven zitten. ${CA_SCHATTING}`, ex: [0, -0.15, 0] }),
    P('Afdekplaten', deksel, MAT.steel, { d: `Raam met lichtopening boven het prisma en een dunne afdekplaat boven de lensgroep. ${CA_SCHATTING}`, ex: [0, 0.42, 0] }),
    A('Prisma met actuator', { d: `Prisma dat het licht van boven 90° naar de lensgroep afbuigt, met een eigen stabilisatie-actuator (schatting).`, ex: [0, 0.2, -0.18] }, [
      P('Prisma', prisma, MAT.glass, { d: `Glazen prisma met een rechte hoek; het licht valt van boven in en verlaat het prisma richting de lensgroep. ${CA_SCHATTING}`, ex: [0, 0.28, 0] }),
      P('Prismahouder', prismaHouder, MAT.plasticGrey, { d: `Kunststof wig onder de schuine kant van het prisma. ${CA_SCHATTING}`, p: [0, 0, 0], ex: [0, 0.12, -0.04] }),
      P('Prismamagneet', caBx(-8.6, -4.0, 3.3, 5.8, -75.6, -74.0), MAT.caMagneet, { d: `Magneet van de prisma-actuator (schatting).`, ex: [0, 0.06, -0.2] }),
      P('Prismaspoel', caBx(-8.2, -4.4, 3.5, 5.6, -73.8, -72.9), MAT.copper, { d: `Spoel van de prisma-actuator die het prisma kantelt voor beeldstabilisatie (schatting).`, ex: [0, 0.06, -0.12] }),
    ]),
    A('Lensgroep', { d: `Lenselementen in een ovale buis langs de lengte van het toestel; schuift heen en weer om scherp te stellen. ${CA_SCHATTING}`, ex: [0, 0.3, 0.04] }, [
      P('Lensbuis', buis, MAT.caLensbuis, { d: `Ovale lensbuis (aan boven- en onderkant afgevlakt om in de dikte te passen). ${CA_SCHATTING}`, ex: [0, 0.06, 0] }),
      P('Lenselementen', lenzen, MAT.lensGlass, { d: `Vier lenselementen in de buis (aantal geschat).`, ex: [0, 0.16, 0] }),
    ]),
    A('AF-actuator', { d: `Magneten in de behuizing en spoelen op de lensslede die de lensgroep langs z verschuiven (schatting).`, ex: [0, 0.18, 0.06] }, [
      P('Magneten', mag, MAT.caMagneet, { d: `Twee magneten langs de zijwanden (schatting).`, ex: [0, 0.1, 0] }),
      P('Spoelen', spoel, MAT.copper, { d: `Twee spoelen aan de lensslede (schatting).`, ex: [0, 0.04, 0] }),
    ]),
    A('Sensorblok', { d: `Beeldsensor aan het eind van de lichtweg, rechtop tegen de lensgroep, met ir-filter en print. ${CA_SCHATTING}`, ex: [0, 0.1, 0.28] }, [
      P('Ir-filter', caBx(-8.3, -4.3, 3.4, 5.6, -46.2, -46.0), MAT.caIrFilter, { d: `Infraroodfilter voor de sensor. ${CA_SCHATTING}`, ex: [0, 0.04, -0.1] }),
      P('Beeldsensor', caBx(-8.5, -4.1, 3.5, 5.5, -41.5, -41.2), MAT.caSensor, { d: `Beeldsensor, loodrecht op de lengte van het toestel. Afmeting geschat.`, ex: [0, 0.04, 0.03] }),
      P('Sensorprint', caBx(xa + 0.25, xb - 0.25, 3.15, 5.88, -41.2, zE), MAT.pcb, { d: `Print van de sensor; sluit de periscoopbehuizing aan het eind af. ${CA_SCHATTING}`, ex: [0, 0.04, 0.12] }),
    ]),
    P('Flexkabel', flex, MAT.flex, { d: `Flexkabel van de sensorprint langs de zijkant naar de connector. Verloop geschat.`, ex: [0.16, 0, 0.16] }),
    P('Connector', mmSlab(0.85, 2.8, 0.6, 0.2, 0.08), MAT.shield, { d: `Bordconnector naast de uitsparing voor de periscoop. ${CA_SCHATTING}`, p: caMid(-2.1, -1.25, 3.2, 3.8, -45.2, -42.4), ex: [0.26, 0, 0.16] }),
  ]);
}

/* ---------- laser-AF-sensor en flitser ---------- */
function caLaserAF() {
  const cx = -6.2, cz = -48.8;
  return A('Laser-AF-sensor', { d: `Kleine time-of-flight-module voor laserscherpstelling onder het kleine venster onder in de rechterkolom. Zit boven de periscoopbuis. Vorm en maten zijn geschat.`, ex: [0.18, 0.5, 0.06] }, [
    P('Printje', mmSlab(5, 5, 0.25, 0.4, 0.06), MAT.pcb, { d: `Printje van de laser-AF-sensor. ${CA_SCHATTING}`, p: mmv(cx - 0.25, 6.125, cz), ex: [0, -0.06, 0] }),
    P('Sensorbehuizing', mmSlab(4.4, 4.4, 0.7, 0.5, 0.12), MAT.plastic, { d: `Zwarte behuizing met zender en ontvanger. ${CA_SCHATTING}`, p: mmv(cx - 0.25, 6.6, cz), ex: [0, 0.04, 0] }),
    P('Zender en ontvanger', merge([xf(mmCyl('y', 0.6, 0.1, 20), mmv(cx - 1.4, 7.0, cz)), xf(mmCyl('y', 0.6, 0.1, 20), mmv(cx + 0.9, 7.0, cz))]), MAT.lensGlass, { d: `Twee vensters: de laserzender (VCSEL) en de ontvanger. ${CA_SCHATTING}`, ex: [0, 0.14, 0] }),
    P('Flexje', caBx(-3.9, -1.3, 6.0, 6.06, -49.4, -48.2), MAT.flex, { d: `Korte flex naar de connector. Verloop geschat.`, ex: [0.1, -0.04, 0] }),
    P('Connector', mmSlab(1.1, 2.0, 0.5, 0.2, 0.08), MAT.shield, { d: `Connector naar het moederbord. ${CA_SCHATTING}`, p: caMid(-2.4, -1.3, 5.5, 6.0, -49.8, -47.8), ex: [0.18, -0.08, 0] }),
  ]);
}
function caFlash() {
  const cx = -6.5, cz = -58.3;
  return A('Flitser', { d: `Led-flitser op een eigen printje onder het flitservenster in het achterglas. Vorm en maten zijn geschat.`, ex: [0.18, 0.62, -0.08] }, [
    P('Flitsprintje', mmSlab(4.6, 4, 0.2, 0.4, 0.05), MAT.pcb, { d: `Printje van de flitser. ${CA_SCHATTING}`, p: mmv(cx, 6.6, cz), ex: [0, -0.06, 0] }),
    P('Flitser-led', mmSlab(2.4, 2.4, 0.25, 0.2, 0.05), MAT.ceramic, { d: `Keramische led-behuizing. ${CA_SCHATTING}`, p: mmv(cx, 6.825, cz), ex: [0, 0.05, 0] }),
    P('Fosforlaag', mmCyl('y', 0.8, 0.12, 24), MAT.caFosfor, { d: `Gele fosforlaag op de led die het blauwe licht wit maakt.`, p: mmv(cx, 7.01, cz), ex: [0, 0.12, 0] }),
    P('Flexje', caBx(-4.4, -1.3, 6.5, 6.56, -58.9, -57.7), MAT.flex, { d: `Korte flex naar de connector. Verloop geschat.`, ex: [0.1, -0.03, 0] }),
    P('Connector', mmSlab(1.1, 1.6, 0.5, 0.2, 0.08), MAT.shield, { d: `Connector naar het moederbord. ${CA_SCHATTING}`, p: caMid(-2.4, -1.3, 6.0, 6.5, -59.1, -57.5), ex: [0.18, -0.08, 0] }),
  ]);
}

/* ---------- selfiecamera (kijkt naar -y door het scherm) ---------- */
function caSelfie() {
  const lz = -76, mz = -74.5, w = 6.8, l = 6.9;
  const buis = caLathe('SelfieBuis', [[0, 1.12], [1.15, 1.12], [1.15, 1.0], [1.45, 1.0], [1.45, 1.75], [1.8, 1.75], [1.8, 2.48], [0, 2.48]], 32);
  return A('Selfiecamera 12 MP', {
    d: `Selfiecamera onder het moederbord, kijkt door het gat in de middenplaat en het gat in het scherm (punch-hole). Volgens iFixit zwaar verlijmd. Alleen de lensvoet zakt tot vlak boven het schermpaneel; de rest blijft boven de middenplaat. Vorm en maten zijn geschat.`,
    spec: [['Resolutie', '12 MP'], ['Diafragma', 'f/2,2']], ex: [0.45, -0.3, -0.3],
  }, [
    P('Voorlens', mmCyl('y', 1.12, 0.12, 24), MAT.lensGlass, { d: `Voorste lenselement, achter het gat in het scherm. ${CA_SCHATTING}`, p: mmv(0, 1.06, lz), ex: [0, -0.34, 0] }),
    P('Lensbuis', buis, MAT.caLensbuis, { d: `Lensbuis met een smalle voet die door de middenplaat steekt. ${CA_SCHATTING}`, p: mmv(0, 0, lz), ex: [0, -0.24, 0] }),
    P('Lijmlaag', caPlate('SelfieLijm', caRRect(0, mz, w, l, 0.5), [{ x: 0, z: lz, r: 1.85 }], 2.4, 2.48, 20), MAT.adhesive, { d: `Lijmlaag waarmee de module tegen de middenplaat zit; iFixit noemt de selfiecamera zwaar verlijmd. Vorm geschat.`, ex: [0, -0.14, 0] }),
    P('Lenshouder', mmSlab(w, l, 1.07, 0.5, 0.12), MAT.plastic, { d: `Kunststof houder van de lens. ${CA_SCHATTING}`, p: mmv(0, 3.015, mz), ex: [0, -0.04, 0] }),
    P('Beeldsensor', mmBox(4.6, 0.3, 3.6), MAT.caSensor, { d: `Beeldsensor boven de lens. Afmeting geschat.`, p: mmv(0, 3.7, lz), ex: [0, 0.06, 0] }),
    P('Sensorprint', mmSlab(w, l, 0.3, 0.5, 0.06), MAT.pcb, { d: `Printje van de sensor. ${CA_SCHATTING}`, p: mmv(0, 4.0, mz), ex: [0, 0.14, 0] }),
    P('Verstevigingsplaat', mmBox(3.2, 0.2, 3.4), MAT.steel, { d: `Stalen plaatje op de achterkant van de sensorprint. ${CA_SCHATTING}`, p: mmv(-1.6, 4.25, lz), ex: [0, 0.24, 0] }),
    P('Flexkabel', caBx(0.2, 3.35, 4.15, 4.22, -73.6, -71.4), MAT.flex, { d: `Korte flex van de sensorprint naar de connector. Verloop geschat.`, ex: [0.1, 0.18, 0] }),
    P('Connector', mmSlab(2.3, 2.0, 0.28, 0.2, 0.06), MAT.shield, { d: `Connector die van onderen in het moederbord klikt. ${CA_SCHATTING}`, p: mmv(2.15, 4.36, -72.5), ex: [0.16, 0.24, 0] }),
  ]);
}

function caBuild() {
  return A("Camera's", {
    d: `Alle camera's van het toestel: de kolom met ultragroothoek, hoofdcamera en 3×-tele, de 5×-periscoopcamera, de laser-AF-sensor, de flitser en de selfiecamera. De specificaties zijn nagekeken; de opbouw van de modules is geschat (zie de beschrijving per onderdeel). Volgens iFixit zitten de camera's van onderen aan het moederbord vast.`,
  }, [caColumn(), caPeriscope(), caLaserAF(), caFlash(), caSelfie()]);
}

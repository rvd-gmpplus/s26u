/* ===================== Achterkant (reBuild) ===================== */
// Domeinbestand; zie docs/indeling.md voor de zones en voorvoegsels. Zolang de bouwfunctie ontbreekt, zet phone.js een plaatshouder neer.
// Achterglas met lijmrand, camera-eiland met lensringen en afdekglazen, en de laag met laadspoel, NFC en grafietfolie
// (y 7,0 tot 7,2). Maten in mm via mm()/mmv(); de buitenomtrek, het eiland en de lensposities komen uit docs/indeling.md
// (gemeten op de achteraanzichtrender), alle dikten en de hele laadlaag zijn schattingen.

// eigen materialen (voorvoegsel re)
phys('reIslandGlass', { color: TOESTELKLEUR.glas, metalness: 0, roughness: 0.26, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 1.1 });
std('reFlash', 0xe4d9b8, 0.1, 0.18, { envMapIntensity: 1.1 });
std('reFerrite', 0x38393b, 0.15, 0.78);

// maten in mm (schattingen behalve de buitenomtrek en de posities uit docs/indeling.md)
const RE = {
  W: 78.1, L: 163.6, R: 8.5,                 // buitenomtrek en hoekstraal (indeling)
  gl0: 7.2, gl1: 7.9,                        // achterglas
  isl: { x0: -34.55, x1: -13.75, z0: -77.3, z1: -20.5, y1: 8.9 }, // camera-eiland (capsule)
  coil: { cx: -4, cz: 23, r0: 8, r1: 21.5, turns: 12.04, w: 0.85 },  // laadspoel (schatting)
};

// rrect-omtrek als THREE.Shape-punten in wereldeenheden (breedte w langs x, lengte l langs z)
function reRrectShape(w, l, r, hole) {
  const s = shapeOf(rrectPts(mm(w), mm(l), mm(r), 8));
  if (hole) { const h = new THREE.Path(); rrectPts(mm(hole[0]), mm(hole[1]), mm(hole[2]), 8).slice().reverse().forEach((p, i) => i ? h.lineTo(p[0], p[1]) : h.moveTo(p[0], p[1])); h.closePath(); s.holes.push(h); }
  return s;
}
// vlakke band (afgeronde rechthoek met gat), dikte t langs y, gecentreerd
function reBand(w, l, r, bw, t) {
  return plan(reRrectShape(w, l, r, [w - 2 * bw, l - 2 * bw, Math.max(0.2, r - bw)]), mm(t));
}

// lensring als lathe-profiel om de y-as: binnenstraal ri, buitenstraal ro, hoogte h (gecentreerd), afgeronde bovenkant
function reRingGeo(ri, ro, h, key) {
  const hh = h / 2, c = Math.min(0.25, (ro - ri) / 3);
  const pts = [[ri, -hh], [ro, -hh], [ro, hh - c], [ro - c * 0.35, hh - c * 0.3], [ro - c, hh], [ri + c * 0.8, hh], [ri, hh - c * 0.7], [ri, -hh]];
  return G.lathe('y', pts.map(p => [mm(p[0]), mm(p[1])]), 48, 'reRing' + key);
}

// platte spiraalspoel (koperbaan), in het lokale vlak rond (0, 0), dikte t; met brug en aansluitlippen naar de flexstrook
function reCoilGeo(t) {
  return cache('reCoil', () => {
    const { r0, r1, turns, w, cz } = RE.coil, perTurn = 48, N = Math.round(turns * perTurn), pitch = (r1 - r0) / turns;
    const pos = [], hy = mm(t) / 2;
    const pt = (i, dr) => { const th = i / perTurn * 2 * PI, r = r0 + pitch * th / (2 * PI) + dr, ph = -HALF - th; return [mm(r * Math.cos(ph)), mm(r * Math.sin(ph))]; };
    const quad = (a, b, c, d) => pos.push(...a, ...b, ...c, ...a, ...c, ...d);
    for (let i = 0; i < N; i++) {
      const ai = pt(i, -w / 2), ao = pt(i, w / 2), bi = pt(i + 1, -w / 2), bo = pt(i + 1, w / 2);
      const T = p => [p[0], hy, p[1]], B = p => [p[0], -hy, p[1]];
      quad(T(ai), T(bi), T(bo), T(ao));           // boven
      quad(B(ai), B(ao), B(bo), B(bi));           // onder
      quad(T(ao), T(bo), B(bo), B(ao));           // buitenkant
      quad(T(bi), T(ai), B(ai), B(bi));           // binnenkant
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    // aansluitingen naar de flexstrook (die ligt bij z -16 tot -1, dus lokaal tot cz + 1): buitenlip recht naar -z,
    // binnenlip als brug over de windingen heen (op de echte spoel loopt die brug onder een isolatiestrook)
    const end = pt(N, 0), zEnd = -cz - 1.5, ez = end[1] / MM;
    const lead = xf(mmBox(1.4, t, ez - zEnd), [end[0], 0, mm((ez + zEnd) / 2)]);
    const bridgeLen = -r0 - zEnd;
    const bridge = xf(mmBox(1.0, 0.02, bridgeLen), [0, hy + mm(0.01), mm((-r0 + zEnd) / 2)]);
    const pad = xf(mmBox(1.8, t, 1.8), [0, 0, mm(-r0)]);
    return merge([g, lead, bridge, pad]);
  });
}

function reBuild() {
  const isl = RE.isl, icx = (isl.x0 + isl.x1) / 2, icz = (isl.z0 + isl.z1) / 2;
  const glY = (RE.gl0 + RE.gl1) / 2;

  // ---------- camera-eiland ----------
  const big = [
    ['ultragroothoek', 'Ultragroothoek', -67.1, 'de ultragroothoekcamera van 50 MP'],
    ['hoofdcamera', 'Hoofdcamera', -48.9, 'de hoofdcamera van 200 MP'],
    ['tele 3×', 'Tele 3×', -30.7, 'de telecamera van 10 MP met 3× zoom'],
  ];
  const small = [
    ['periscoop 5×', 'Periscoop 5×', -6.2, -67.1, 'de periscoopcamera van 50 MP met 5× zoom (het prisma zit eronder, de module ligt plat langs +z)'],
    ['laser-AF', 'Laser-AF', -6.2, -48.8, 'de laser-autofocus (zender en ontvanger achter één venster)'],
  ];
  const ORDER_NOTE = 'De volgorde van de camera\'s in de kolom is een schatting (zelfde indeling als bij de S24 en S25 Ultra).';
  // grote ring: y 8,7 tot 9,7 (0,2 mm in het eilandglas verzonken), afdekglas tot 9,45 net onder de ringrand
  const bigLens = ([k, K, z, cam]) => A('Lens ' + k, { d: `Lensring met afdekglas boven ${cam}. Positie gemeten op de achteraanzichtrender; ${ORDER_NOTE}`, ex: [0, 0.32, 0] }, [
    P('Lensring ' + k, reRingGeo(7.8, 8.5, 1.0, 'L'), MAT.ringMetal, { d: `Metalen lensring rond het venster van ${cam}: buiten Ø 17 mm, venster Ø 15,6 mm (gemeten op de render), steekt 0,8 mm boven het eiland uit. Profiel en hoogte zijn geschat.`, p: mmv(icx, 9.2, z), ex: [0, 0.14, 0] }),
    P('Afdekglas ' + k, mmCyl('y', 7.78, 0.75, 48), MAT.lensGlass, { d: `Donker afdekglas (saffier of gehard glas) boven ${cam}, Ø 15,6 mm. ${ORDER_NOTE} Dikte geschat.`, p: mmv(icx, 9.075, z), ex: [0, 0.05, 0] }),
  ]);
  // kleine ring op het achterglas: y 7,85 tot 8,6, afdekglas tot 8,45
  const smallLens = ([k, K, x, z, cam]) => A('Lens ' + k, { d: `Kleine lensring met afdekglas, buiten het eiland direct op het achterglas, boven ${cam}. ${ORDER_NOTE}`, ex: [0, 0.3, 0] }, [
    P('Lensring ' + k, reRingGeo(4.1, 4.8, 0.75, 'S'), MAT.ringMetal, { d: `Metalen lensring rond het venster van ${cam}: buiten Ø 9,6 mm, venster Ø 8,2 mm (gemeten op de render), staat ongeveer 0,7 mm op het achterglas. Hoogte geschat.`, p: mmv(x, 8.225, z), ex: [0, 0.12, 0] }),
    P('Afdekglas ' + k, mmCyl('y', 4.08, 0.6, 40), MAT.lensGlass, { d: `Donker afdekglas boven ${cam}, Ø 8,2 mm. ${ORDER_NOTE} Dikte geschat.`, p: mmv(x, 8.15, z), ex: [0, 0.05, 0] }),
  ]);
  const island = A('Camera-eiland', { d: 'Verhoogd camera-eiland: een capsule van wit glas (20,8 × 56,8 mm, gemeten op de achteraanzichtrender) met drie grote lensringen, plus naast het eiland twee kleine lensringen en het flitservenster direct op het achterglas. Hoogte van het eiland en de ringen geschat.', ex: [0, 0.7, 0] }, [
    P('Eilandglas', mmCapsule(isl.x1 - isl.x0, isl.z1 - isl.z0, 1.05), MAT.reIslandGlass, { d: 'Verhoogde capsule van glas in de kleur van het toestel (White), met de drie grote camera\'s erin. Breedte 20,8 mm en straal 10,4 mm gemeten op de render; ongeveer 1 mm hoog boven het achterglas (schatting).', p: mmv(icx, 8.375, icz), ex: [0, 0.12, 0] }),
    ...big.map(bigLens),
    ...small.map(smallLens),
    P('Flitservenster', mmCyl('y', 1.5, 0.12, 24), MAT.reFlash, { d: 'Venster van de ledflitser, Ø 3 mm, vlak in het achterglas tussen de twee kleine lenzen. Positie gemeten op de render, uitvoering geschat.', p: mmv(-6.5, 7.86, -58.3), ex: [0.12, 0.25, 0] }),
  ]);

  // ---------- draadloos laden en NFC (y 7,0 tot 7,2), boven de batterij ----------
  const c = RE.coil;
  const nfcGeo = cache('reNfc', () => merge([0, 1, 2].map(i => reBand(54 - i * 2.8, 68 - i * 2.8, 5 - i * 1.4, 0.8, 0.04))));
  const contacts = cache('reContacts', () => merge([-4.5, 0, 4.5].map(dx => xf(mmBox(2.6, 0.11, 2.6), mmv(dx, 0, 0)))));
  const wireless = A('Draadloos laden en NFC', { d: 'Laag tussen de batterij en het achterglas: laadspoel voor draadloos laden, NFC-antenne, ferrietplaat, flexstrook en grafietfolie. Opbouw volgt gangbare Galaxy-teardowns; vorm, maten en ligging zijn geschat.', ex: [0, 0.08, 0.35] }, [
    P('Grafietfolie achterglas', mmSlab(58, 76, 0.06, 4, 0.02), MAT.graphite, { d: 'Grafietfolie tegen de binnenkant van het achterglas die de warmte van spoel en batterij over het glas verdeelt. Maat en dikte geschat.', p: mmv(-4, 7.17, 23), ex: [0, 0.75, 0] }),
    P('Laadspoel', reCoilGeo(0.06), MAT.copper, { d: 'Platte koperen spoel voor draadloos laden (Qi), ongeveer Ø 44 mm met twaalf windingen, en de twee aansluitlippen naar de flexstrook. Draadloos laden van 25 W staat nog open (zie de bronnen); de spoel zelf is geschat.', p: mmv(c.cx, 7.08, c.cz), ex: [0, 0.45, 0] }),
    P('NFC-antenne', nfcGeo, MAT.copper, { d: 'NFC-antennelus van drie koperbanen rond de laadspoel. Vorm en maat geschat.', p: mmv(-4, 7.07, 24), ex: [0, 0.24, 0] }),
    P('Ferrietplaat', mmSlab(56, 70, 0.05, 4, 0.015), MAT.reFerrite, { d: 'Dunne ferrietplaat onder spoel en NFC-lus die het magnetisch veld van de batterij afschermt en naar het achterglas richt. Maat geschat.', p: mmv(-4, 7.025, 24), ex: [0, 0.04, 0] }),
    A('Flexstrook laadspoel', { d: 'Flexstrook die laadspoel en NFC-antenne met het moederbord verbindt; de contactjes drukken op veercontacten aan de kant van het bord. Ligging en vorm geschat.', ex: [0.15, 0.1, -0.22] }, [
      P('Flex laadspoel', mmSlab(14, 15, 0.03, 1, 0.01), MAT.flex, { d: 'Polyimide flexstrook met de koperbanen van spoel en NFC. Maat geschat.', p: mmv(-6, 7.125, -8.5), ex: [0, 0.06, 0] }),
      P('Contactjes laadspoel', contacts, MAT.gold, { d: 'Drie vergulde contactvlakjes aan de onderkant van de flexstrook (spoel plus, spoel min, NFC). Aantal en maat geschat.', p: mmv(-6, 7.055, -14), ex: [0, -0.06, 0] }),
    ]),
  ]);

  return A('Achterkant', { d: 'Achterkant van het toestel in White: wit mat achterglas met lijmrand, het verhoogde camera-eiland met metalen lensringen, en daaronder de laag voor draadloos laden en NFC. Het achterglas is de toegang tot het toestel (verwarmen en loswrikken). Omtrek en camerapositie gemeten, dikten geschat.' }, [
    island,
    P('Achterglas', mmSlab(RE.W, RE.L, RE.gl1 - RE.gl0, RE.R, 0.3), MAT.backGlass, { d: 'Wit mat achterglas (White), 78,1 × 163,6 mm met hoekstraal 8,5 mm en een afgeronde bovenrand. Het wordt bij reparatie verwarmd en losgewrikt; daarna is de rest van het toestel bereikbaar. Dikte 0,7 mm geschat.', p: mmv(0, glY, 0), ex: [0, 0.38, 0] }),
    P('Lijmrand achterglas', reBand(RE.W - 0.4, RE.L - 0.4, RE.R - 0.2, 1.8, 0.05), MAT.adhesive, { d: 'Dunne lijmrand langs de omtrek die het achterglas op het frame houdt en het toestel waterdicht maakt; laat los na verwarmen. Breedte en dikte geschat.', p: mmv(0, 7.175, 0), ex: [0, 0.2, 0] }),
    wireless,
  ]);
}

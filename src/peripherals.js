/* ===================== Randapparatuur en S Pen (peBuild, peBuildPen) ===================== */
// Domeinbestand; zie docs/indeling.md voor de zones en voorvoegsels. Zolang de bouwfunctie ontbreekt, zet phone.js een plaatshouder neer.
// Alle maten in mm in het modelframe (x breedte, y dikte met het scherm op y = 0, z lengte met de onderrand op +81,8).
// Onderdelen staan op hun absolute plek; groepen hebben geen eigen positie. Vrijwel alle maten zijn schattingen binnen
// de zones van docs/indeling.md; alleen wat in docs/specificaties-en-bronnen.md bevestigd is, staat in een spec.

std('pePen', 0xeceae4, 0, 0.42);          // S Pen in de kleur van het toestel (White), mat kunststof
std('pePunt', 0xd6d3cc, 0, 0.85);         // zachte penpunt
std('peFerriet', 0x2e2f33, 0.25, 0.6);    // ferrietkern van de digitizerspoel
std('peMembraan', 0x2b2f36, 0.05, 0.5);   // luidsprekermembraan
std('peSim', 0xf2efe6, 0, 0.5);           // nano-SIM-kaartje
std('peGaas', 0x2a2d32, 0.4, 0.75);       // stofgaas voor speaker en microfoon

/* ---------- hulpen (mm in, wereldeenheden uit) ---------- */
// doos tussen twee hoeken als onderdeel
function peBox(name, mat, x0, x1, y0, y1, z0, z1, o = {}) {
  return P(name, mmBox(x1 - x0, y1 - y0, z1 - z0), mat, Object.assign({ p: mmv((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2) }, o));
}
// doos tussen twee hoeken als geometrie op zijn plek (om samen te voegen)
function peBoxG(x0, x1, y0, y1, z0, z1) {
  return xf(mmBox(x1 - x0, y1 - y0, z1 - z0), mmv((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2));
}
// afgeronde rechthoek op zijn plek: midden (cu, cv), maat w × l, hoekstraal r (mm)
function peRR(cu, cv, w, l, r, n = 4) { return rrectPts(w, l, r, n).map(([u, v]) => [cu + u, cv + v]); }
function pePath(pts) { const h = new THREE.Path(); pts.forEach(([u, v], i) => i ? h.lineTo(mm(u), mm(v)) : h.moveTo(mm(u), mm(v))); h.closePath(); return h; }
function peShape(pts, holes) { const s = shapeOf(pts.map(([u, v]) => [mm(u), mm(v)])); for (const h of holes || []) s.holes.push(pePath(h)); return s; }
// bovenaanzichtvorm (punten in x, z) met dikte langs y van y0 tot y1, op zijn plek
function pePlanG(pts, y0, y1, holes) { const g = plan(peShape(pts, holes), mm(y1 - y0)); g.translate(0, mm((y0 + y1) / 2), 0); return g; }
// vooraanzichtvorm (punten in x, y) uitgetrokken langs z van z0 tot z1, op zijn plek
function peFrontG(pts, z0, z1, holes) { const g = front(peShape(pts, holes), mm(z1 - z0)); g.translate(0, 0, mm((z0 + z1) / 2)); return g; }
// flexstrook als profiel: lijn van punten (x, y) met dikte t naar boven
function peFlexPts(line, t) { return line.concat(line.slice().reverse().map(([x, y]) => [x, y + t])); }
function peRect(x0, x1, z0, z1) { return [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]; }

/* ---------- Randapparatuur ---------- */
function peSubbord() {
  // print 0,6 mm dik met uitsparingen voor de USB-C-poort (die door de print heen zakt) en voor de SIM-lade
  const print = pePlanG([[-6, 64.5], [24, 64.5], [24, 79.5], [22.4, 79.5], [22.4, 66.6], [7.6, 66.6], [7.6, 79.5], [4.7, 79.5],
    [4.7, 71.8], [-4.7, 71.8], [-4.7, 79.5], [-6, 79.5]], 2.9, 3.5);
  // USB-C-poort: as y 3,9; huls 8,34 × 2,56 mm (maat van een USB-C-bus), van z 73 tot 81,6
  const yc = 3.9;
  const huls = peFrontG(peRR(0, yc, 8.34, 2.56, 1.27, 5), 73, 81.6, [peRR(0, yc, 7.7, 1.96, 0.95, 5)]);
  const pins = [];
  for (const s of [-1, 1]) for (let i = 0; i < 12; i++) pins.push(peBoxG(-2.875 + i * 0.5, -2.625 + i * 0.5, yc + s * 0.3 - 0.02, yc + s * 0.3 + 0.02, 77.8, 81.0));
  const pakking = peFrontG(peRR(0, yc, 9, 2.9, 1.4, 5), 79.0, 79.8, [peRR(0, yc, 8.34, 2.56, 1.27, 5)]);
  const usb = A('USB-C-poort', {
    d: 'USB-C-bus op het subbord: metalen huls met een contacttong in het midden en een rubberen afdichting tegen het frame. Volgens de iFixit-teardown is de poort los te vervangen. De iFixit-specificaties noemen USB 3.2 Gen 1; dat is niet nagekeken. Maten geschat.',
    spec: [['Vervangen', 'los vervangbaar (iFixit-teardown)']],
    ex: [0, 0.12, 0.5],
  }, [
    P('Poorthuls', huls, MAT.steel, { d: 'Metalen huls van de USB-C-bus, de buitenmaat van een USB-C-bus (ongeveer 8,3 × 2,6 mm). Steekt door een opening in de onderrand van het frame.', ex: [0, 0, 0.2] }),
    peBox('Contacttong', MAT.plastic, -3.2, 3.2, yc - 0.3, yc + 0.3, 75.4, 81.2, { d: 'Kunststof tong in de bus met aan beide kanten twaalf contacten, zodat de stekker twee kanten op past.', ex: [0, 0.15, 0.1] }),
    P('Contactpennen USB-C', merge(pins), MAT.gold, { d: 'Vergulde contacten op de tong, twaalf boven en twaalf onder. Aantal volgens de USB-C-norm, plek geschat.', ex: [0, 0.3, 0.1] }),
    peBox('Achterwand USB-C', MAT.darkSteel, -4.5, 4.5, 2.45, 5.5, 72, 73, { d: 'Achterwand en soldeerlippen van de bus, waarmee hij op het subbord vastzit. Vorm geschat.', ex: [0, 0, -0.15] }),
    P('Waterdichting USB-C', pakking, MAT.rubber, { d: 'Rubberen ring om de huls die de poort tegen de binnenkant van het frame afdicht. Vorm geschat.', ex: [0, 0, 0.35] }),
  ]);
  // SIM-kaartlezer: metalen kooi om de lade met contactveren door een venster in de lade
  const lezer = merge([
    peBoxG(8, 22, 2.9, 3.15, 66.95, 79.4),
    peBoxG(7.6, 8, 2.9, 4.65, 66.6, 79.4), peBoxG(22, 22.4, 2.9, 4.65, 66.6, 79.4),
    peBoxG(7.6, 22.4, 2.9, 4.65, 66.6, 66.95),
    peBoxG(7.6, 22.4, 4.45, 4.65, 66.95, 75.5),
  ]);
  const veren = [];
  for (const x of [13, 15, 17]) for (const z of [72.1, 74.9]) veren.push(peBoxG(x - 0.4, x + 0.4, 3.15, 3.45, z - 1, z + 1));
  const sim = A('SIM-kaartlezer', {
    d: 'Kaartlezer op het subbord: een metalen kooi waar de SIM-lade in schuift, met zes contactveren die de nano-SIM van onderen raken. Vorm geschat.',
    ex: [0, 0.3, 0],
  }, [
    P('Lezerframe', lezer, MAT.shield, { d: 'Metalen kooi van de kaartlezer met geleiders voor de lade en een aanslag achterin. Vorm geschat.', ex: [0, 0.15, 0] }),
    P('Contactveren SIM', merge(veren), MAT.gold, { d: 'Zes vergulde contactveren die door het venster in de lade tegen de contacten van de nano-SIM drukken.', ex: [0, -0.1, 0] }),
  ]);
  const flexKop = merge([peBoxG(-5.6, -1.4, 3.5, 3.85, 64.4, 66.4), peBoxG(-5.4, -1.6, 3.85, 4.0, 64.6, 66.2)]);
  const spkKop = merge([peBoxG(-5.6, -1.5, 3.5, 3.85, 68.6, 71.4), peBoxG(-5.4, -1.7, 3.85, 4.0, 68.8, 71.2)]);
  return A('USB-C-subbord', {
    d: 'Losse print onderin het toestel met de USB-C-poort, de SIM-kaartlezer, de onderste microfoon en de aansluitingen voor de koppelflex naar het moederbord en voor de luidspreker. Indeling en maten geschat.',
    ex: [0.25, 0.35, 0.35],
  }, [
    P('Subbordprint', print, MAT.pcb, { d: 'Printplaat van het subbord, ongeveer 0,6 mm dik, met uitsparingen voor de USB-C-poort en de SIM-lade. Vorm en maat geschat.', ex: [0, -0.12, 0] }),
    usb,
    sim,
    peBox('Microfoon onder', MAT.shield, 5.0, 7.3, 3.5, 4.5, 76.4, 79.2, { d: 'MEMS-microfoon voor gesprekken, met een geluidsopening in de onderrand. Plek en maat geschat.', ex: [0.1, 0.3, 0.15] }),
    P('Connector koppelflex', flexKop, MAT.plastic, { d: 'Bord-op-bordconnector waar de koppelflex naar het moederbord op klikt. Plek geschat.', ex: [0, 0.22, 0] }),
    P('Connector luidspreker', spkKop, MAT.plastic, { d: 'Connector voor de flex van de luidspreker onderin. Plek geschat.', ex: [0, 0.22, 0.05] }),
    P('Afschermkap subbord', mmSlab(6.7, 6.4, 0.8, 0.4, 0.1), MAT.shield, { d: 'Metalen kap over de laad- en beveiligingscomponenten van het subbord. Wat eronder zit is niet bekend; vorm geschat.', p: mmv(3.85, 3.9, 67.6), ex: [0, 0.3, 0] }),
  ]);
}

function peSimLade() {
  const ladeBodem = pePlanG(peRect(8, 22, 67, 79.8), 3.2, 3.5, [peRect(12, 18, 71, 76)]);
  const ladeRand = pePlanG(peRect(8, 22, 67, 79.8), 3.5, 4.4, [peRR(15, 73.9, 12.5, 9.0, 0.5, 2)]);
  // nano-SIM 12,3 × 8,8 × 0,67 mm (ETSI-maat) met de schuine hoek
  const s0 = [8.85, 69.55], s1 = [21.15, 78.35];
  const kaart = pePlanG([[s0[0] + 1.65, s0[1]], [s1[0], s0[1]], [s1[0], s1[1]], [s0[0], s1[1]], [s0[0], s0[1] + 1.65]], 3.5, 4.17);
  const kopje = peFrontG(peRR(15, 3.8, 14, 1.2, 0.55, 4), 79.8, 81.8, [peRR(20.6, 3.8, 0.7, 0.7, 0.34, 3)]);
  return A('SIM-lade', {
    d: 'Uitneembare lade voor één nano-SIM, met een kopje in de framekleur dat gelijk ligt met de onderrand. Uitwerpen met een pinnetje in het gaatje. Plek en maten geschat.',
    ex: [0.15, 0.12, 0.95],
  }, [
    P('Lade', merge([ladeBodem, ladeRand]), MAT.plastic, { d: 'Draagplaatje van de lade met een kuil voor de nano-SIM en een venster in de bodem voor de contactveren. Maten geschat.', ex: [0, 0, 0.12] }),
    P('Kopje SIM-lade', kopje, MAT.frameAlu, { d: 'Buitenkant van de lade in de kleur van het frame, met het gaatje voor het uitwerppinnetje. Eindigt precies in het vlak van de onderrand. Maten geschat.', ex: [0, 0, 0.3] }),
    A('Nano-SIM', { d: 'Nano-SIM-kaart (12,3 × 8,8 × 0,67 mm volgens de norm) in de lade, met de contacten naar beneden.', ex: [0, 0.4, 0] }, [
      P('Kaartje', kaart, MAT.peSim, { d: 'Kunststof drager van de nano-SIM met de schuine hoek die de stand bepaalt.', ex: [0, 0.12, 0] }),
      peBox('Contactvlak SIM', MAT.gold, 12.2, 17.8, 3.47, 3.5, 71.2, 75.8, { d: 'Vergulde contacten van de SIM-chip aan de onderkant van het kaartje.', ex: [0, -0.12, 0] }),
    ]),
  ]);
}

function peLuidspreker() {
  const cx = -22.5, cz = 73.5;
  const buiten = peRR(-21, 73.5, 26, 11, 1.5);
  const kast = merge([pePlanG(buiten, 2.9, 3.4), pePlanG(buiten, 3.4, 6.0, [peRR(cx, cz, 18, 8.6, 4.29, 5)])]);
  const spoel = pePlanG(peRR(cx, cz, 12.4, 6.4, 3.15, 5), 4.6, 5.6, [peRR(cx, cz, 11.6, 5.6, 2.75, 5)]);
  const gaten = [];
  for (const z of [71.3, 73.5, 75.7]) for (let i = 0; i < 7; i++) gaten.push(rrectPts(1, 1, 0.49, 2).map(([u, v]) => [-30 + i * 2.5 + u, z + v]));
  const rooster = pePlanG(peRR(cx, cz, 21, 9.8, 2), 6.0, 6.9, gaten);
  const flex = peFrontG(peFlexPts([[-11.5, 6.0], [-8.4, 6.0], [-6.3, 4.0], [-1.6, 4.0]], 0.12), 69.0, 71.0);
  return A('Luidspreker onder', {
    d: 'Luidsprekermodule onderin: een gesloten kast met magneet, spreekspoel, membraan en rooster, die via een korte flex op het subbord aansluit. Volgens de iFixit-teardown moet deze module eruit voordat de batterij eruit kan. Maten geschat.',
    spec: [['Batterij vervangen', 'eerst deze luidspreker eruit (iFixit-teardown)']],
    ex: [-0.45, 0.5, 0.3],
  }, [
    P('Luidsprekerkast', kast, MAT.plastic, { d: 'Kunststof kast van de module met een ovale holte voor de luidspreker; de kast dient ook als klankkast. Vorm geschat.', ex: [0, -0.1, 0] }),
    P('Magneet', mmCapsule(11, 5.4, 1.2), MAT.darkSteel, { d: 'Ovale magneet met poolplaat onder in de holte. Maat geschat.', p: mmv(cx, 4.0, cz), ex: [0, 0.1, 0] }),
    P('Spreekspoel', spoel, MAT.copper, { d: 'Ovale spreekspoel aan het membraan die in de luchtspleet om de magneet beweegt. Maat geschat.', ex: [0, 0.22, 0] }),
    P('Membraan', mmCapsule(17.6, 8.2, 0.2), MAT.peMembraan, { d: 'Ovaal membraan van ongeveer 18 × 8 mm. Maat geschat.', p: mmv(cx, 5.7, cz), ex: [0, 0.34, 0] }),
    P('Rooster luidspreker', rooster, MAT.plastic, { d: 'Deksel van de kast met een rooster boven het membraan. Vorm geschat.', ex: [0, 0.48, 0] }),
    P('Luidsprekerflex', flex, MAT.flex, { d: 'Korte flex van de luidspreker naar zijn connector op het subbord. Verloop geschat.', ex: [0.15, 0.3, -0.05] }),
  ]);
}

function peOorspeaker() {
  return A('Oorspeaker', {
    d: 'Oorspeaker achter de smalle spleet tussen frame en scherm aan de bovenrand, op een eigen printje met de bovenste microfoon. Werkt ook als tweede luidspreker voor stereo. Plek en maten geschat.',
    ex: [0, 0.6, -1.25],
  }, [
    P('Oorspeakerkast', mmSlab(11.2, 4.3, 1.9, 0.8, 0.3), MAT.plastic, { d: 'Gesloten kast van de oorspeaker. Maat geschat.', p: mmv(9.8, 3.95, -77.35), ex: [0, 0.25, 0] }),
    peBox('Stofgaas oorspeaker', MAT.peGaas, 5.0, 14.6, 3.4, 4.5, -79.8, -79.5, { d: 'Fijn gaas voor de geluidsuitgang naar de spleet aan de bovenrand. Maat geschat.', ex: [0, 0.1, -0.15] }),
    peBox('Oorspeakerprintje', MAT.flex, 4, 18, 2.9, 3.0, -79.4, -75.2, { d: 'Flexprintje onder de oorspeaker met de contacten naar het moederbord. Vorm geschat.', ex: [0, -0.1, 0] }),
    peBox('Microfoon boven', MAT.shield, 15.8, 17.8, 3.0, 4.0, -78.4, -76.2, { d: 'Bovenste MEMS-microfoon voor ruisonderdrukking, op het printje van de oorspeaker. Plek geschat.', ex: [0.12, 0.2, 0] }),
  ]);
}

function peTrilmotor() {
  return A('Trilmotor', {
    d: 'Lineaire trilmotor (een massa die op veren heen en weer schuift) voor de trillingen en de haptische terugkoppeling. Type, plek en maat geschat.',
    ex: [-0.5, 0.45, 0],
  }, [
    P('Motorhuis', mmSlab(9.6, 3.6, 2.5, 0.8, 0.3), MAT.steel, { d: 'Stalen huis van de lineaire motor, ongeveer 9,6 × 3,6 × 2,5 mm. Maat geschat.', p: mmv(-29, 4.65, 65), ex: [0, 0.15, 0] }),
    peBox('Aansluitflex trilmotor', MAT.flex, -26.4, -24.4, 5.9, 6.0, 63.3, 64.9, { d: 'Flexlipje met de twee aansluitingen van de motor. Vorm geschat.', ex: [0.1, 0.3, 0] }),
    peBox('Dempingsrubber', MAT.foam, -33, -25, 3.15, 3.4, 63.6, 66.4, { d: 'Dempend kussentje onder de motor, zodat de trilling niet rammelt. Geschat.', ex: [0, -0.1, 0] }),
  ]);
}

function peFlexkabels() {
  // route (aanvulling orkestrator): langs -x van z +65,8 tot z -20, haaks naar +x door de vrije strook z -21 tot -17 tot
  // x -13,5, in de vrijgelaten hoek x -13,5 tot -9,5 omhoog naar y 3,6 en dan op de bordconnector (x -9,5 tot -0,9,
  // z -25,7 tot -22,7) met een eigen flexconnector op y 3,6 tot 4,0
  const xc = -34.82, yc = 3.15, zc = -17.5;
  const coax = merge([xf(mmCyl('z', 0.18, 61.7 - zc, 8), mmv(xc, yc, (61.7 + zc) / 2)), xf(mmCyl('x', 0.18, -14.6 - xc, 8), mmv((xc + -14.6) / 2, yc, zc))]);
  const stekkers = merge([peBoxG(-14.6, -13.4, 2.9, 3.4, zc - 0.35, zc + 0.35), peBoxG(xc - 0.35, xc + 0.35, 2.9, 3.4, 61.7, 62.9)]);
  const hoofd = merge([
    peBoxG(-36.6, -35.3, 2.9, 3.05, -20.5, 65.8),
    peBoxG(-35.3, -13.5, 2.9, 3.05, -20.5, -18.5),
    peFrontG(peFlexPts([[-13.5, 2.9], [-11.8, 2.9], [-9.9, 3.6], [-9.3, 3.6]], 0.15), -20.5, -18.5),
    peBoxG(-9.3, -5.0, 3.6, 3.75, -22.9, -18.5),
  ]);
  const kopBoven = merge([peBoxG(-9.5, -0.9, 3.6, 3.9, -25.7, -22.7), peBoxG(-9.2, -1.2, 3.9, 4.0, -25.4, -23.0)]);
  const koppel = peFrontG(peFlexPts([[-36.5, 3.4], [-35.3, 3.4], [-34.3, 2.95], [-8, 2.95], [-6.3, 4.0], [-1.6, 4.0]], 0.15), 64.7, 66.1);
  return A('Hoofdflexkabels', {
    d: 'Lange flexkabels van het moederbord naar het subbord onderin: vanaf de bordconnector door de strook tussen camerakolom en batterij naar de rechterkant (gezien op het scherm), dan langs de zijkant naar beneden, met een koppelflex onder de trilmotor door naar het subbord. Route en maten geschat.',
    ex: [-0.6, 0.25, -0.1],
  }, [
    P('Hoofdflex', hoofd, MAT.flex, { d: 'Lange flexkabel met de signalen en de laadstroom tussen moederbord en subbord. Buigt bovenin haaks af naar de connector op het moederbord en loopt dan langs de zijkant naast de batterij. Breedte en verloop geschat.', ex: [-0.1, 0.05, 0] }),
    P('Connector hoofdflex boven', kopBoven, MAT.plastic, { d: 'Flexconnector aan het boveneind van de hoofdflex, die op de bordconnector van het moederbord klikt. Maat geschat.', ex: [0, 0.2, -0.05] }),
    peBox('Connector hoofdflex onder', MAT.plastic, -36.7, -35.3, 3.05, 3.4, 63.0, 65.8, { d: 'Connector aan de onderkant van de hoofdflex, waar de koppelflex op aansluit. Plek geschat.', ex: [0, 0.15, 0.05] }),
    P('Antennekabel', coax, MAT.rubber, { d: 'Dunne coaxkabel langs dezelfde route als de hoofdflex, van het moederbord naar de antenne-aansluiting onderin. Of er een coaxkabel loopt en waar hij eindigt is geschat.', ex: [0.1, 0.12, 0] }),
    P('Coaxstekkers', stekkers, MAT.shield, { d: 'Kleine coaxstekkers aan beide eindes van de antennekabel. Geschat.', ex: [0.12, 0.2, 0] }),
    P('Koppelflex naar subbord', koppel, MAT.flex, { d: 'Korte flex van de hoofdflex dwars onder de trilmotor door naar de connector op het subbord. Verloop geschat.', ex: [0, 0.2, 0.1] }),
  ]);
}

function peAfdekplaat() {
  const schroeven = [[-35.0, 64.2], [-35.0, 70.0], [-7.0, 67.3], [25.0, 65.0], [25.0, 78.5]];
  const r = 5.5, boog = [];
  for (let i = 0; i <= 6; i++) { const a = HALF + i / 6 * HALF; boog.push([-30.5 + r * Math.cos(a), 74.3 + r * Math.sin(a)]); }
  const plaat = pePlanG([[-36, 63], [26, 63], [26, 79.8], ...boog], 6.9, 7.0, schroeven.map(([x, z]) => peRR(x, z, 1.7, 1.7, 0.84, 2)));
  const schroef = cache('peSchroef', () => merge([xf(mmCyl('y', 0.82, 0.1, 12), mmv(0, -0.05, 0)), xf(mmCyl('y', 0.5, 1.2, 8), mmv(0, -0.7, 0))]));
  return A('Onderafdekplaat', {
    d: 'Dunne kunststof plaat over de onderste modules (luidspreker, subbord en trilmotor), met vijf schroefjes vastgezet. Dient vaak ook als drager van antennes. Vorm en maat geschat.',
    ex: [0, 0.95, 0],
  }, [
    P('Afdekplaat onder', plaat, MAT.plastic, { d: 'Kunststof afdekplaat van ongeveer 62 × 17 mm met een ronde hoek langs het frame. Maat geschat.', ex: [0, 0.1, 0] }),
    A('Schroeven onderafdekplaat', { d: 'Vijf kleine kruiskopschroefjes die de afdekplaat in bussen van het frame en het subbord vastzetten. Aantal en plek geschat.', ex: [0, 0.35, 0] },
      schroeven.map(([x, z], i) => P(`Schroef onderplaat ${i + 1}`, schroef, MAT.darkSteel, { d: 'Kruiskopschroefje van de onderafdekplaat. Maat geschat.', p: mmv(x, 7.0, z), ex: [0, 0.2, 0] }))),
  ]);
}

function peBuild() {
  return A('Randapparatuur', {
    d: 'Alles onderin en aan de randen buiten het moederbord: het USB-C-subbord met SIM-lezer, de SIM-lade, de luidspreker onderin, de oorspeaker, de trilmotor, de hoofdflexkabels en de onderafdekplaat. De binnenindeling volgt teardowns van eerdere Ultra-modellen; maten en plekken zijn geschat (zie docs/indeling.md).',
  }, [peSubbord(), peSimLade(), peLuidspreker(), peOorspeaker(), peTrilmotor(), peFlexkabels(), peAfdekplaat()]);
}

/* ---------- S Pen ---------- */
// as x +31,8, y 4,45, van z -24 (punt, binnenin) tot +78,6 (dop, net binnen de hoekwand); Ø 4,4 met een platte kant naar +y
const PE_PEN = { x: 31.8, y: 4.45, r: 2.2, plat: 1.75 };
// doorsnede in (x, y) rond de as: cirkel met een platte koorde boven, geschaald met f
function pePenDoorsnede(f) {
  const a0 = Math.asin(PE_PEN.plat / PE_PEN.r), pts = [], N = 22;
  for (let i = 0; i <= N; i++) { const a = PI - a0 + (PI + 2 * a0) * i / N; pts.push([PE_PEN.r * f * Math.cos(a), PE_PEN.r * f * Math.sin(a)]); }
  return pts;
}
// D-vormig stuk pen van z0 tot z1 (mm) met schaal fz(z) langs de as, op zijn plek
function pePenG(z0, z1, steps, fz) {
  const g = new THREE.ExtrudeGeometry(peShape(pePenDoorsnede(1)), { depth: mm(z1 - z0), steps, bevelEnabled: false, curveSegments: 1 });
  const a = g.attributes.position;
  for (let i = 0; i < a.count; i++) { const z = z0 + a.getZ(i) / MM, f = fz(z); a.setXYZ(i, a.getX(i) * f, a.getY(i) * f, mm(z)); }
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  const s = cleanG(THREE.BufferGeometryUtils.toCreasedNormals(THREE.BufferGeometryUtils.mergeVertices(g, 1e-6), 0.6));
  s.translate(mm(PE_PEN.x), mm(PE_PEN.y), 0);
  return s;
}
function peBuildPen() {
  const { x, y } = PE_PEN;
  const at = (dx, dy, z) => mmv(x + dx, y + dy, z);
  // neus: van 0,35 maal de straal bij z -21,6 naar de volle straal bij z -14
  const neus = z => { const t = clamp((z + 21.6) / 7.6, 0, 1); return 0.35 + 0.65 * (1 - (1 - t) * (1 - t)); };
  const huis = merge([pePenG(-21.6, -14, 7, neus), pePenG(-14, 76, 1, () => 1)]);
  // De silo loopt door de afgeronde hoek van het frame (de hoek begint bij x +30,55); de dop eindigt daarom op z 78,6,
  // vóór de binnenkant van de hoekwand, ongeveer 3 mm achter de buitenrand (afwijking van docs/indeling.md, zie daar).
  const eind = z => { const t = clamp((z - 77.8) / 0.8, 0, 1); return 1 - 0.22 * t * t; };
  const dop = merge([pePenG(76.05, 77.8, 1, () => 1), pePenG(77.8, 78.6, 4, eind)]);
  const punt = G.lathe('z', [[0, mm(-24)], [mm(0.28), mm(-24)], [mm(0.4), mm(-23.5)], [mm(0.45), mm(-22.6)], [mm(0.45), mm(-21.5)], [0, mm(-21.5)]], 12, 'pePunt');
  const kringChips = merge([-4, -1, 2].map(z => xf(mmBox(0.8, 0.3, 1.2), at(0, 0.8, z))));
  return A('S Pen', {
    d: 'S Pen in de silo aan de onderrand: een passieve pen zonder batterij, die met een spoel en een resonantiekring reageert op het veld van de digitizer onder het scherm (EMR). Of deze pen geheel zonder batterij werkt, is een schatting op basis van eerdere Ultra-modellen. Hoort bij het toestel. Maten geschat; Ø 4,4 mm en de lengte volgen de silo in docs/indeling.md.',
  }, [
    P('Penpunt', punt, MAT.pePunt, { d: 'Verwisselbare zachte penpunt die in de spoel steekt. Maat geschat.', p: at(0, 0, 0), ex: [0, 0, -0.4] }),
    P('Penbehuizing', huis, MAT.pePen, { d: 'Behuizing van de pen met een platte kant, zodat hij maar op één manier in de silo past. Vorm en maat geschat.', ex: [0.1, 0, 0] }),
    P('Zijknop', mmSlab(1.4, 6, 0.35, 0.65, 0.1), MAT.pePen, { d: 'Knop op de platte kant, waarmee de pen de resonantiefrequentie verandert. Plek en maat geschat.', p: at(0, PE_PEN.plat + 0.15, -5), ex: [0, 0.3, 0] }),
    A('Digitizerspoel', { d: 'Spoel om een ferrietkern achter de punt. Het veld van de digitizer wekt hier een stroom op; zo vindt het toestel de pen en meet het de druk. Maten geschat.', inner: true, ex: [0.45, 0, -0.25] }, [
      P('Spoel', mmCyl('z', 1.3, 7, 16), MAT.copper, { d: 'Koperen spoel van de pen. Maat geschat.', p: at(0, 0, -12.5), ex: [0.12, 0, 0] }),
      P('Ferrietkern', mmCyl('z', 0.5, 11.5, 10), MAT.peFerriet, { d: 'Ferrietkern in de spoel; de punt drukt hem een fractie in, wat de druk meet. Maat geschat.', p: at(0, 0, -12.75), ex: [0, 0, -0.25] }),
    ]),
    A('Resonantiekring', { d: 'Printje met condensatoren dat met de spoel een afgestemde kring vormt; de zijknop schakelt er een condensator bij. Maten geschat.', inner: true, ex: [0.45, 0, 0.2] }, [
      P('Penprintje', mmBox(1.8, 0.5, 10), MAT.pcb, { d: 'Smal printje in de pen. Maat geschat.', p: at(0, 0.4, -1), ex: [0, -0.06, 0] }),
      P('Condensatoren', kringChips, MAT.chip, { d: 'Condensatoren en de schakelaar onder de zijknop. Geschat.', ex: [0, 0.12, 0] }),
    ]),
    A('Klikmechanisme', { d: 'Duw-duwvergrendeling achter in de pen: druk op de dop en de pen springt een stukje uit de silo. Vorm geschat.', inner: true, ex: [0.45, 0, 0.7] }, [
      P('Klikhuls', mmCyl('z', 1.5, 4, 16), MAT.steel, { d: 'Metalen huls van de vergrendeling. Geschat.', p: at(0, 0, 71), ex: [0, 0, -0.12] }),
      P('Klikveer', spring(mm(1.0), mm(0.15), mm(4), 7, 'z'), MAT.steel, { d: 'Drukveer die de pen uit de silo duwt. Geschat.', p: at(0, 0, 75), ex: [0, 0, 0.15] }),
    ]),
    P('Einddop', dop, MAT.pePen, { d: 'Dop aan het eind van de pen, gelijk met de onderrand van het toestel; hier druk je op om de pen uit te nemen. Vorm geschat.', ex: [0, 0, 0.6] }),
  ]);
}

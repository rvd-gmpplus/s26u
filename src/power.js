/* ===================== Energie en koeling (pwBuild) ===================== */
// Domeinbestand; zie docs/indeling.md voor de zones en voorvoegsels. Zolang de bouwfunctie ontbreekt, zet phone.js een plaatshouder neer.
// Inhoud: de batterij (cel, kunststof omhulling met lijm, treklip, beveiligingsprint met flex en connector, label), de vapor
// chamber op de middenplaat (koperen mantel en wiekstructuur) en de koelstapel bij de processor (thermische pad, koelpasta,
// warmtegeleidende zijstrips, grafietfolie). Alle maten in mm via mm()/mmv(); de maten zijn schattingen tenzij een spec ze
// noemt (zie docs/specificaties-en-bronnen.md).

std('pwLabel', 0xcfd0cc, 0, 0.7);
std('pwPullTab', 0x2f4f6e, 0, 0.6);
std('pwWick', 0xc4865a, 0.6, 0.85);
std('pwPad', 0x8f9aa6, 0, 0.9);
std('pwPaste', 0xc9ccce, 0.3, 0.55);
std('pwStrip', 0x8a5a3c, 0.7, 0.45);
std('pwNickel', 0xc2c5c8, 0.9, 0.3);

// omtrek van de vapor chamber in het vlak (u = x, v = z), in mm, tegen de klok in. Uitsparingen met 0,5 mm speling:
// camerakolom (x -34 tot -14, z -77 tot -21) en periscoop met laser-AF (x -11 tot -1, z -77 tot -40). De selfiecamera
// (z -78 tot -71) ligt al buiten de plaat (die begint bij z -70).
const PW_VC = [[-30, 10], [-30, -20.5], [-13.5, -20.5], [-13.5, -39.5], [-0.5, -39.5], [-0.5, -70], [26, -70], [26, 10]];
// de processor (SoC) zit op het moederbord rond x +14, z -52 (onderkant y 2,9)
const PW_SOC = [14, -52];

// rechthoekige omtrek d mm naar binnen verschuiven (werkt voor een veelhoek tegen de klok in met rechte hoeken)
function pwInset(poly, d) {
  const n = poly.length, unit = (a, c) => { const dx = c[0] - a[0], dy = c[1] - a[1], l = Math.hypot(dx, dy); return [dx / l, dy / l]; };
  return poly.map((P, i) => { const e1 = unit(poly[(i + n - 1) % n], P), e2 = unit(P, poly[(i + 1) % n]); return [P[0] - d * (e1[1] + e2[1]), P[1] + d * (e1[0] + e2[0])]; });
}
function pwInside(poly, x, y) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}
// vorm in het bovenaanzicht (mm) naar THREE.Shape in wereldeenheden; holes: lijst van veelhoeken of cirkels [cx, cz, r]
function pwShape(poly, holes = []) {
  const s = shapeOf(poly.map(p => [mm(p[0]), mm(p[1])]));
  for (const h of holes) {
    if (h.length === 3 && !Array.isArray(h[0])) s.holes.push(circlePath(mm(h[0]), mm(h[1]), mm(h[2])));
    else { const pth = new THREE.Path(); h.forEach((p, i) => i ? pth.lineTo(mm(p[0]), mm(p[1])) : pth.moveTo(mm(p[0]), mm(p[1]))); pth.closePath(); s.holes.push(pth); }
  }
  return s;
}
// plaat in het bovenaanzicht tussen y0 en y1 (mm); plan() zet u op x, v op z en de dikte langs y
function pwPlan(key, y0, y1, poly, holes = []) {
  return cache('pw' + key, () => { const g = plan(pwShape(poly, holes), mm(y1 - y0)); g.translate(0, mm((y0 + y1) / 2), 0); return g; });
}
// afgeronde plaat met de omtrek poly (mm, tegen de klok in), dikte langs y tussen y0 en y1, randstraal b
function pwRoundPlan(key, y0, y1, poly, b, ri = 1) {
  return cache('pw' + key, () => { const g = roundPlate(poly.map(p => [mm(p[0]), mm(p[1])]), mm(y1 - y0), mm(b), mm(ri), 2); g.rotateX(HALF); g.translate(0, mm((y0 + y1) / 2), 0); return g; });
}
// rechthoek als veelhoek tegen de klok in
const pwRect = (x0, x1, z0, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
// doos tussen twee hoeken in mm, als losse geometrie (voor merge)
function pwBoxAt(x0, x1, y0, y1, z0, z1) {
  const g = new THREE.BoxGeometry(mm(x1 - x0), mm(y1 - y0), mm(z1 - z0));
  g.translate(mm((x0 + x1) / 2), mm((y0 + y1) / 2), mm((z0 + z1) / 2));
  return g;
}

/* ---------- batterij ---------- */
// Pakket in de zone x -34 tot +26, z -16 tot +62, y 2,8 tot 7,0. Kunststof omhulling (frame en bodem) rondom de cel, met
// lijmstrips onder de bodem; de beveiligingsprint zit in de omhulling aan de bovenkant (-z), de connector steekt door een
// uitsparing in de bovenwand naar het moederbord (connector rond x +10, z -18).
function pwBattery() {
  const cellD = 'Lithium-ionpolymeercel in een pouch van gelamineerde aluminiumfolie, met licht afgeronde randen. Maten geschat: ongeveer 57 × 72 × 3,85 mm.';
  const cell = P('Batterijcel', cache('pwCell', () => { const g = mmSlab(57.2, 72, 3.85, 2.2, 0.9).clone(); g.translate(...mmv(-4, 4.875, 24.6)); return g; }), MAT.battery,
    { d: cellD, ex: [0, 0.16, 0], spec: [['Capaciteit', '5000 mAh (typisch), 4855 mAh (nominaal)']] });

  // kunststof omhulling: wanden (1 mm) rond de cel, onderbroken in de bovenwand voor de flex, plus een dunne bodem
  const frame = P('Omhullingsframe', cache('pwFrame', () => merge([
    pwBoxAt(-34, -33, 2.85, 6.95, -16, 62),       // wand rechts (gezien op het scherm)
    pwBoxAt(25, 26, 2.85, 6.95, -16, 62),         // wand links
    pwBoxAt(-33, 25, 2.85, 6.95, 61, 62),         // onderwand
    pwBoxAt(-33, 6.5, 2.85, 6.95, -16, -15),      // bovenwand, deel naast de flex
    pwBoxAt(13.5, 25, 2.85, 6.95, -16, -15),      // bovenwand, ander deel
    pwBoxAt(6.5, 13.5, 2.85, 5.3, -16, -15),      // verlaagde bovenwand onder de flexdoorvoer
  ])), MAT.plastic, { d: 'Kunststof frame dat de cel omsluit (in teardowns de "plastic embrace"), aan de binnenkant bekleed met lijm. In de bovenwand een verlaging waar de batterijflex naar het moederbord loopt. Wanddikte en hoogte geschat.', ex: [0, 0.08, 0] });
  const floor = P('Bodemplaat omhulling', pwRoundPlan('Floor', 2.85, 2.95, pwRect(-33, 25, -15, 61), 0.03, 0.5), MAT.plasticGrey,
    { d: 'Dunne kunststof bodem van de omhulling, waarop de cel ligt. Dikte geschat (0,1 mm).', ex: [0, -0.07, 0] });
  const glue = P('Lijmstrips', cache('pwGlue', () => merge([
    pwBoxAt(-29, -21, 2.8, 2.85, 12, 59), pwBoxAt(-9, -1, 2.8, 2.85, 12, 59), pwBoxAt(11, 19, 2.8, 2.85, 12, 59),
  ])), MAT.adhesive, { d: 'Lijmstrips onder de omhulling die het batterijpakket op de middenplaat vastzetten; ze liggen naast de vapor chamber, waar de middenplaat vrij is. Aantal en maten geschat.', ex: [0, -0.15, 0] });
  const embrace = A('Kunststof omhulling', {
    d: 'Kunststof omhulling met lijm rond de cel (bevestigd in de iFixit-teardown: "plastic embrace lined with glue"). Ze houdt de cel vast en beschermt hem bij het uitnemen. Vorm en maten geschat.',
    ex: [0, -0.12, 0],
  }, [frame, floor, glue]);

  const label = P('Batterijlabel', pwPlan('Label', 6.8, 6.85, rrectPts(54, 66, 1.5, 3).map(([u, v]) => [u - 4, v + 24.5])), MAT.pwLabel,
    { d: 'Label op de bovenkant van de cel, hier zonder tekst. Maat geschat.', ex: [0, 0.3, 0] });
  const tab = P('Treklip', cache('pwTab', () => merge([
    pwBoxAt(-5, 5, 6.85, 6.9, 44, 60.4),         // strip over het label
    pwBoxAt(-5, 5, 6.9, 6.95, 56.4, 60.4),         // dubbelgevouwen greep aan het eind
  ])), MAT.pwPullTab, { d: 'Treklip om de batterij uit de omhulling te lichten (bevestigd in de iFixit-teardown). Ligt aan de onderkant (+z), waar je na het uitnemen van de luidspreker onderin bij kunt. Vorm en kleur geschat.', ex: [0, 0.42, 0.25] });

  return A('Batterij', {
    d: 'Batterijpakket: cel in een kunststof omhulling met lijm, treklip en beveiligingsprint met flex en connector naar het moederbord. Volgens iFixit is de batterij makkelijk te vervangen nadat de luidspreker onderin eruit is. De zone volgt docs/indeling.md; de maten van de onderdelen zijn geschat.',
    spec: [['Capaciteit', '5000 mAh (typisch), 4855 mAh (nominaal)'], ['Bedraad laden', 'tot 75% in ongeveer 30 min met een 60W-adapter'], ['Vervangen', 'eenvoudig, nadat de luidspreker onderin eruit is (iFixit)']],
    ex: [0, 0.55, 0.35],
  }, [cell, embrace, pwPcm(), label, tab]);
}

// beveiligingsprint (PCM) aan de bovenkant van de cel, met de lipjes van de cel, flex en batterijconnector
function pwPcm() {
  const board = P('Printplaat PCM', pwRoundPlan('PcmBoard', 4.4, 5.0, pwRect(-18, 18, -14.8, -12.0), 0.08, 0.3), MAT.pcb,
    { d: 'Smalle printplaat van de beveiligingsschakeling (PCM) tegen overladen, te diep ontladen en kortsluiting. Maten geschat.', ex: [0, 0.05, 0] });
  const chips = P('Beveiligingschips', cache('pwPcmChips', () => merge([
    pwBoxAt(-14, -9, 5.0, 5.35, -14.3, -12.5),     // beveiligings-IC
    pwBoxAt(-7, -2.5, 5.0, 5.4, -14.3, -12.5),     // dubbele MOSFET
    pwBoxAt(0, 4, 5.0, 5.3, -14.0, -12.8),         // brandstofmeter (fuel gauge)
    pwBoxAt(15, 16.4, 5.0, 5.2, -14.0, -12.8),     // NTC voor de temperatuur
    pwBoxAt(-17, -15.8, 5.0, 5.2, -14.0, -12.8),   // kleine passieve onderdelen
  ])), MAT.chip, { d: 'Chips op de beveiligingsprint: beveiligings-IC, schakel-MOSFETs, brandstofmeter en temperatuursensor. Indeling en maten geschat.', ex: [0, 0.14, 0] });
  const tabs = P('Lipjes van de cel', cache('pwCellTabs', () => merge([
    pwBoxAt(-12, -6, 4.9, 5.0, -12.6, -10.6), pwBoxAt(6, 12, 4.9, 5.0, -12.6, -10.6),
  ])), MAT.pwNickel, { d: 'Nikkelen lipjes (plus en min) van de cel, gelast op de beveiligingsprint. Maten geschat.', ex: [0, 0.03, 0.06] });
  // flex in zijaanzicht (u = z, v = y), 5 mm breed: van de print omhoog en dan vlak naar de connector
  const flex = P('Batterijflex', cache('pwFlex', () => {
    const pts = [[-12.6, 5.0], [-13.6, 5.0], [-14.6, 5.5], [-19.0, 5.5], [-19.0, 5.6], [-14.55, 5.6], [-13.55, 5.1], [-12.6, 5.1]];
    const g = side(shapeOf(pts.map(p => [mm(p[0]), mm(p[1])])), mm(5));
    g.translate(mm(10), 0, 0);
    return g;
  }), MAT.flex, { d: 'Korte flexkabel van de beveiligingsprint door de verlaging in de omhulling naar de batterijconnector. Loop en breedte geschat.', ex: [0, 0.09, -0.12] });
  const conn = P('Batterijconnector', cache('pwConn', () => merge([
    pwBoxAt(7.2, 12.8, 5.6, 6.0, -19.0, -17.0),
  ])), MAT.plastic, { d: 'Board-to-boardconnector (stekker) van de batterij, die op het moederbord klikt. Positie volgens docs/indeling.md, maten geschat.', ex: [0, 0.2, -0.2] });
  const stiff = P('Verstevigingsplaatje connector', cache('pwConnStiff', () => pwBoxAt(7.0, 13.0, 6.0, 6.2, -19.0, -16.9)), MAT.steel,
    { d: 'Stalen verstevigingsplaatje op de rug van de batterijconnector. Maten geschat.', ex: [0, 0.28, -0.2] });
  return A('Beveiligingsprint (PCM)', {
    d: 'Beveiligingsprint (protection circuit module) met de lipjes van de cel, flexkabel en batterijconnector, aan de bovenkant van het pakket richting het moederbord. Indeling en maten geschat.',
    ex: [0, 0.22, -0.3],
  }, [board, chips, tabs, flex, conn, stiff]);
}

/* ---------- vapor chamber ---------- */
// Op de middenplaat, y 2,4 tot 2,8: onderschaal 2,40 tot 2,52, wiekstructuur ertussen, bovenschaal 2,68 tot 2,80 met een
// opstaande rand van 1 mm die tot de onderschaal reikt.
function pwVaporChamber() {
  const inner = pwInset(PW_VC, 1.0), wickPoly = pwInset(PW_VC, 1.15);
  const low = P('Koperen mantel (onderschaal)', pwRoundPlan('VcLow', 2.4, 2.52, PW_VC, 0.04, 0.8), MAT.copper,
    { d: 'Onderste koperen plaat van de vapor chamber, op de middenplaat. Met uitsparingen voor de camerakolom en voor de periscoop met laser-AF; de selfiecamera valt buiten de plaat. Dikte geschat (0,12 mm).', ex: [0, -0.12, 0] });
  const top = P('Koperen mantel (bovenschaal)', cache('pwVcTop', () => merge([
    pwRoundPlan('VcTopPlate', 2.68, 2.8, PW_VC, 0.04, 0.8),
    pwPlan('VcRim', 2.52, 2.68, PW_VC, [inner]),
  ])), MAT.copper, { d: 'Bovenste koperen schaal van de vapor chamber met opstaande rand; rand en onderschaal zijn rondom dichtgesoldeerd, zodat de werkvloeistof (water onder lage druk) ingesloten blijft. Dikte geschat.', ex: [0, 0.2, 0] });
  // wiekstructuur: plaat van gesinterd koper met een raster van gaten (dampkanalen en steunpilaartjes)
  const holes = [];
  for (let x = -27; x <= 23; x += 5) for (let z = -67; z <= 7; z += 5) {
    const ok = [[-2, -2], [2, -2], [2, 2], [-2, 2]].every(([dx, dz]) => pwInside(wickPoly, x + dx, z + dz));
    if (ok) holes.push([x, z, 1.1]);
  }
  const wick = P('Wiekstructuur', cache('pwWick', () => { const g = plan(pwShape(wickPoly, holes), mm(0.14)); g.translate(0, mm(2.6), 0); return g; }), MAT.pwWick,
    { d: 'Wiekstructuur van gesinterd koperpoeder binnen in de vapor chamber, met open kanalen voor de damp. De vloeistof verdampt boven de processor, condenseert verder weg en loopt via de wiek terug. Patroon en dikte geschat.', ex: [0, 0.05, 0], inner: true });
  return A('Vapor chamber', {
    d: 'Vapor chamber (dampkamer) op de middenplaat, onder moederbord en batterij. Volgens het persbericht herontworpen, met warmtegeleidend materiaal langs de zijkanten van de processor. Teardownverslagen noemen hem ongeveer 15% groter dan bij de S25 Ultra; dat is niet zelf nagemeten (status open). Omtrek volgens docs/indeling.md, opbouw en diktes geschat.',
    spec: [['Ontwerp', 'herontworpen, met warmtegeleidend materiaal langs de zijkanten van de processor']],
    ex: [0, -0.1, -0.15],
  }, [low, wick, top]);
}

/* ---------- koelstapel bij de processor ---------- */
// Tussen de vapor chamber (y 2,8) en de onderkant van het moederbord (y 2,9).
function pwCoolingStack() {
  const [sx, sz] = PW_SOC;
  const pad = P('Thermische pad', cache('pwPad', () => pwBoxAt(sx - 7, sx + 7, 2.8, 2.88, sz - 7, sz + 7)), MAT.pwPad,
    { d: 'Thermische pad van ongeveer 14 × 14 mm tussen de vapor chamber en de processor aan de onderkant van het moederbord. Maat en dikte geschat.', ex: [0, 0.12, 0] });
  const paste = P('Koelpasta', cache('pwPaste', () => pwBoxAt(sx - 5.5, sx + 5.5, 2.88, 2.9, sz - 5.5, sz + 5.5)), MAT.pwPaste,
    { d: 'Dunne laag koelpasta op de pad, recht onder de processor. Teardownverslagen noemen koelpasta als een van de vier lagen (status open); plaats en maat geschat.', ex: [0, 0.22, 0] });
  const strips = P('Warmtegeleidende zijstrips', cache('pwStrips', () => merge([
    pwBoxAt(sx - 9, sx - 7.5, 2.8, 2.9, sz - 7, sz + 7), pwBoxAt(sx + 7.5, sx + 9, 2.8, 2.9, sz - 7, sz + 7),
    pwBoxAt(sx - 7, sx + 7, 2.8, 2.9, sz - 9, sz - 7.5), pwBoxAt(sx - 7, sx + 7, 2.8, 2.9, sz + 7.5, sz + 9),
  ])), MAT.pwStrip, { d: 'Warmtegeleidend materiaal langs de zijkanten van de processor (bevestigd in het persbericht). Vorm, materiaal en maten zijn geschat: hier vier strips rond de pad.', ex: [0.12, 0.1, 0] });
  // grafietfolie op de vapor chamber, waar geen pad zit: één vel onder het moederbord (met een gat rond de pad) en één
  // onder de batterij
  const hole = pwRect(sx - 9.5, sx + 9.5, sz - 9.5, sz + 9.5);
  const sheetTop = [[-12.5, -21.5], [-12.5, -40.5], [0.5, -40.5], [0.5, -69], [25, -69], [25, -21.5]];
  const g1 = P('Grafietfolie onder het moederbord', pwPlan('Graph1', 2.8, 2.85, sheetTop, [hole]), MAT.graphite,
    { d: 'Dun vel grafietfolie op de vapor chamber onder het moederbord, met een uitsparing voor de pad en de zijstrips. Spreidt de warmte in het vlak. Teardownverslagen noemen grafietfolie als laag van de koelstapel (status open); vorm en dikte geschat.', ex: [0, 0.06, -0.08] });
  const g2 = P('Grafietfolie onder de batterij', pwPlan('Graph2', 2.8, 2.85, pwRect(-29, 25, -19.5, 9), []), MAT.graphite,
    { d: 'Vel grafietfolie op het deel van de vapor chamber onder de batterij. Vorm en dikte geschat.', ex: [0, 0.04, 0.08] });
  return A('Koelstapel processor', {
    d: 'Koelstapel tussen de processor en de vapor chamber. Teardownverslagen beschrijven vier lagen: grafietfolie, thermische pads, koelpasta en de vapor chamber (status open, niet zelf nagekeken). Plaats volgt de processor rond x +14, z -52; maten geschat.',
    ex: [0, 0.18, -0.25],
  }, [pad, paste, strips, g1, g2]);
}

function pwBuild() {
  return A('Energie en koeling', {
    d: 'Batterij, vapor chamber en koelstapel. De zones en lagen volgen docs/indeling.md; vormen en maten van de onderdelen zijn geschat op basis van teardownverslagen, tenzij een specificatie iets anders zegt.',
  }, [pwBattery(), pwVaporChamber(), pwCoolingStack()]);
}

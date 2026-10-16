/* ===================== het hele toestel (plaatshouder van golf 0) ===================== */
// Golf 0 zet alleen de opbouw neer: drie lagen met de buitenmaat van het toestel, zodat bouw, tests en app werken.
// De domeinbestanden van golf 2 en 3 (frame.js, rear.js, display.js, camera.js, board.js, power.js, peripherals.js)
// vervangen deze plaatshouders; buildPhone() blijft hier en roept dan hun bouwfuncties aan.
// Assen: x is de breedte, y de dikte (scherm op de vloer, achterkant boven), z de lengte met de bovenrand naar -z.
// Maten in millimeters via mm() (core.js). Alleen de buitenmaat is geverifieerd; de laagdiktes en de hoekstraal zijn
// schattingen die golf 1 en 2 vervangen.
const PH_L = 163.6, PH_W = 78.1, PH_T = 7.9;          // buitenmaat in mm, bevestigd (zie docs/specificaties-en-bronnen.md)
const PH_R = 11;                                       // hoekstraal in bovenaanzicht, schatting
const PH_SCREEN = 1.6, PH_BACK = 0.8;                  // dikte schermpakket en achterglas, schattingen

// afgeronde plaat in bovenaanzicht: breedte w (x), lengte l (z), dikte t (y, gecentreerd), hoekstraal r, randstraal b (alles in mm)
function phSlab(w, l, t, r, b) {
  return cache(`phSlab${w}|${l}|${t}|${r}|${b}`, () => { const g = roundPlate(rrectPts(mm(w), mm(l), mm(r), 6), mm(t), mm(b)); g.rotateX(HALF); return g; });
}

function buildPhone() {
  const yScreen = PH_SCREEN / 2, yFrame = PH_SCREEN + (PH_T - PH_SCREEN - PH_BACK) / 2, yBack = PH_T - PH_BACK / 2;
  const plh = 'Plaatshouder van golf 0 met de buitenmaat van het toestel; de echte vorm volgt in golf 2.';
  const screen = A('Scherm', { d: 'Het schermpakket aan de voorkant: coverglas met daaronder het OLED-paneel. ' + plh, ex: [0, -0.3, 0] }, [
    P('Coverglas', phSlab(PH_W, PH_L, 0.6, PH_R, 0.25), MAT.coverGlass, { d: 'Glazen voorruit over het hele scherm. ' + plh, p: mmv(0, 1.3, 0), ex: [0, -0.25, 0] }),
    P('Displaypaneel', phSlab(PH_W - 1.2, PH_L - 1.2, 1.0, PH_R - 0.6, 0.2), MAT.oled, { d: 'OLED-paneel onder het coverglas. ' + plh, p: mmv(0, 0.5, 0), ex: [0, -0.1, 0] }),
  ]);
  const frame = A('Behuizing', { d: 'Middenframe met de zijkanten van het toestel en de middenplaat waar alle binnendelen op rusten. ' + plh, ex: [0, 0.75, 0] }, [
    P('Middenframe', phSlab(PH_W, PH_L, PH_T - PH_SCREEN - PH_BACK, PH_R, 1.2), MAT.frameAlu, { d: 'Metalen frame dat de zijkanten van het toestel vormt. ' + plh, p: mmv(0, yFrame, 0), ex: [0, 0.2, 0] }),
    P('Middenplaat', phSlab(PH_W - 4, PH_L - 4, 0.6, PH_R - 2, 0.2), MAT.frameCast, { d: 'Plaat binnen het frame die het scherm draagt en de binnendelen scheidt. ' + plh, p: mmv(0, PH_SCREEN + 0.4, 0), ex: [0, -0.2, 0] }),
  ]);
  const back = A('Achterkant', { d: 'Achterglas met het camera-eiland. ' + plh, ex: [0, 1.5, 0] }, [
    P('Achterglas', phSlab(PH_W, PH_L, PH_BACK, PH_R, 0.35), MAT.backGlass, { d: 'Glazen achterkant in de kleur van het toestel. ' + plh, p: mmv(0, yBack, 0), ex: [0, 0.2, 0] }),
    P('Cameraringen', merge([[-26, -64], [-26, -51], [-26, -38], [-12, -64]].map(([x, z]) => xf(G.cyl('y', mm(5.6), mm(5.8), mm(1.4), 32), mmv(x, 0, z)))), MAT.ringMetal, { d: 'Metalen ringen rond de vier camera\'s achter. Posities zijn een schatting. ' + plh, p: mmv(0, PH_T + 0.7, 0), ex: [0, 0.3, 0] }),
  ]);
  return A('Samsung Galaxy S26 Ultra', {
    d: 'Samsung Galaxy S26 Ultra in een lichte kleur, 1 TB met 16 GB RAM. Golf 0: alleen de opbouw in drie lagen; scherm, frame, moederbord, batterij, koeling, camera\'s en S Pen volgen. Klik op een onderdeel om het uit te klappen, dubbelklik om er direct naartoe te gaan, rechtsklik of houd vast om weer in te klappen.',
    spec: [['L × B × D', '163,6 × 78,1 × 7,9 mm'], ['Gewicht', '214 g'], ['Scherm', '6,9 inch, 3120 × 1440'], ['Chip', 'Snapdragon 8 Elite Gen 5 for Galaxy'], ['Geheugen', '16 GB RAM, 1 TB opslag'], ['Batterij', '5000 mAh'], ['Camera\'s achter', '200 + 50 + 50 + 10 MP'], ['Selfiecamera', '12 MP']],
  }, [back, frame, screen]);
}

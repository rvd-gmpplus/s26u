"""Silhouet: de gemonteerde telefoon tegen de gemeten buitenvorm, met stralen.

    python3 tools/silhouette.py        # exitcode 1 bij een afwijking

1. Bovenaanzicht: een raster van verticale stralen (van boven naar beneden). Binnen de afgeronde rechthoek van
   78,1 × 163,6 mm met hoekstraal 8,5 mm (docs/indeling.md) moet een straal het toestel raken, erbuiten niet. Een band van
   0,6 mm langs de rand telt niet mee (afronding van de randen).
2. Dikte: buiten het camera-eiland ligt het hoogste punt onder elke straal op 7,9 mm (± 0,15), en zijwaartse stralen op
   halve hoogte raken het frame op de buitenmaat (± 0,3 mm).
3. Camera-eiland: binnen de capsule van het eiland ligt het hoogste punt boven 7,9 mm. De twee kleine lensringen naast het
   eiland (Ø 9,6) steken boven het achterglas uit en tellen niet mee voor de dikte.
De maten staan in millimeters; de pagina rekent met MM (core.js).
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harness import session

CHECK = r"""() => {
  const L = window.__s26u; L.preset('assembled'); L.finishAll();
  L.ROOT.obj.updateMatrixWorld(true);
  const meshes = L.MESHES.filter(m => m.visible !== false);
  const rc = new THREE.Raycaster(); rc.layers.enableAll();
  const W = 78.1, LEN = 163.6, T = 7.9, R = 8.5;
  // afstand tot de afgeronde rechthoek (negatief = binnen), in mm
  const sd = (x, z) => { const qx = Math.abs(x) - (W / 2 - R), qz = Math.abs(z) - (LEN / 2 - R);
    return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - R; };
  // camera-eiland (capsule) uit docs/indeling.md
  const isl = { x0: -34.55, x1: -13.75, z0: -77.3, z1: -20.5 };
  // de twee kleine lensringen (periscoop en laser-AF) staan buiten het eiland op het achterglas en steken iets uit
  const SMALL = [[-6.2, -67.1], [-6.2, -48.8]], inSmall = (x, z) => SMALL.some(([a, c]) => Math.hypot(x - a, z - c) <= 4.8 + 1.2);
  const inIsland = (x, z, g) => { const cx = (isl.x0 + isl.x1) / 2, r = (isl.x1 - isl.x0) / 2 + g, zc = Math.max(isl.z0 + r - g, Math.min(isl.z1 - r + g, z)); return Math.hypot(x - cx, z - zc) <= r; };
  const err = [], down = new THREE.Vector3(0, -1, 0), o = new THREE.Vector3();
  let n = 0, hits = 0;
  for (let x = -41; x <= 41; x += 1.3) for (let z = -84; z <= 84; z += 1.3) {
    const d = sd(x, z); if (Math.abs(d) < 0.6) continue;
    o.set(x * MM, 30 * MM, z * MM); rc.set(o, down); rc.far = 40 * MM;
    const h = rc.intersectObjects(meshes, false)[0]; n++;
    if (d < 0 && !h) err.push(`geen toestel op (${x.toFixed(1)}, ${z.toFixed(1)}) mm`);
    if (d > 0 && h) err.push(`toestel buiten de omtrek op (${x.toFixed(1)}, ${z.toFixed(1)}) mm: ${h.object.userData.node.name}`);
    if (!h || d >= 0) continue;
    hits++;
    const y = h.point.y / MM;
    if (inIsland(x, z, -1.2)) { if (y <= T + 0.2) err.push(`camera-eiland niet verhoogd op (${x.toFixed(1)}, ${z.toFixed(1)}): ${y.toFixed(2)} mm`); }
    else if (!inIsland(x, z, 1.2) && !inSmall(x, z) && d < -1.5 && Math.abs(y - T) > 0.15) err.push(`dikte ${y.toFixed(2)} mm in plaats van ${T} op (${x.toFixed(1)}, ${z.toFixed(1)}): ${h.object.userData.node.name}`);
  }
  // zijkanten op halve hoogte
  // de flanken op halve hoogte; de boven- en onderrand op y 6,6, boven de poorten, de SIM-sleuf en de S Pen-opening (y tot 5,5)
  const side = (dir, ox, oz, oy = 3.95) => { o.set(ox * MM, oy * MM, oz * MM); rc.set(o, dir); rc.far = 200 * MM; const h = rc.intersectObjects(meshes, false)[0]; return h ? h.point.clone().divideScalar(MM) : null; };
  for (const z of [-60, -30, 0, 30, 60]) {
    const a = side(new THREE.Vector3(-1, 0, 0), 60, z), b = side(new THREE.Vector3(1, 0, 0), -60, z);
    if (!a || Math.abs(a.x - W / 2) > 0.3) err.push(`linkerflank op z ${z}: ${a ? a.x.toFixed(2) : 'geen'} in plaats van ${W / 2}`);
    if (!b || Math.abs(-b.x - W / 2) > 0.3) err.push(`rechterflank op z ${z}: ${b ? b.x.toFixed(2) : 'geen'} in plaats van ${-W / 2}`);
  }
  for (const x of [-20, 0, 20]) {
    const a = side(new THREE.Vector3(0, 0, 1), x, -120, 6.6), b = side(new THREE.Vector3(0, 0, -1), x, 120, 6.6);
    if (!a || Math.abs(-a.z - LEN / 2) > 0.3) err.push(`bovenrand op x ${x}: ${a ? a.z.toFixed(2) : 'geen'} in plaats van ${-LEN / 2}`);
    if (!b || Math.abs(b.z - LEN / 2) > 0.3) err.push(`onderrand op x ${x}: ${b ? b.z.toFixed(2) : 'geen'} in plaats van ${LEN / 2}`);
  }
  return { n, hits, err };
}"""

with session() as s:
    pg = s.page(900, 700)
    r = pg.evaluate(CHECK)
    print(f"{r['n']} stralen van boven, {r['hits']} op het toestel, {len(r['err'])} afwijkingen")
    for e in r['err'][:40]: print('FOUT ' + e)
    s.report()
    sys.exit(1 if r['err'] or s.errors() else 0)

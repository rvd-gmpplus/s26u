"""Doorsteken tussen domeinen: steekt een onderdeel van de ene hoofdgroep in een onderdeel van een andere?

    python3 tools/overlap.py              # exitcode 1 bij een doorsteek dieper dan de tolerantie
    python3 tools/overlap.py --alles      # ook paren binnen dezelfde hoofdgroep (informatie, geen poort)

Voor elk paar onderdelen uit verschillende hoofdgroepen waarvan de begrenzende dozen elkaar overlappen, worden de
hoekpunten van het ene onderdeel getest op "binnen het andere" met stralen in drie richtingen (oneven aantal snijpunten in
alle drie, zodat een open of niet-waterdichte vorm geen valse treffer geeft). Een punt telt pas als het minstens TOL mm
binnen de andere vorm ligt (afstand tot het dichtstbijzijnde snijpunt). Zo vindt de test echte doorsteken en geen
aanrakingen. Dunne folies en lijmlagen zijn daardoor ongevoelig; daarvoor dient het indelingscontract.
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harness import session

TOL = 0.08  # mm

CHECK = r"""([TOL, ALL]) => {
  const L = window.__s26u; L.preset('assembled'); L.finishAll();
  L.ROOT.obj.updateMatrixWorld(true);
  const top = n => { let t = n; while (t.parent && t.parent !== L.ROOT) t = t.parent; return t.name; };
  const path = n => { const a = []; for (let p = n; p && p !== L.ROOT; p = p.parent) a.unshift(p.name); return a.join(' › '); };
  const parts = L.ALL.filter(n => !n.asm).map(n => { const b = new THREE.Box3().setFromObject(n.obj); return { n, b, g: top(n) }; });
  const rc = new THREE.Raycaster(); rc.layers.enableAll();
  const dirs = [new THREE.Vector3(1, 0.0013, 0.0021).normalize(), new THREE.Vector3(0.0017, 1, 0.0011).normalize(), new THREE.Vector3(0.0019, 0.0007, 1).normalize()];
  const tol = TOL * MM, v = new THREE.Vector3();
  const inside = (p, mesh) => {
    let minD = Infinity;
    for (const d of dirs) {
      rc.set(p, d); rc.far = 1e3;
      const h = rc.intersectObject(mesh, false); if (h.length % 2 === 0) return false;
      minD = Math.min(minD, h[0].distance);
      rc.set(p, d.clone().negate()); const h2 = rc.intersectObject(mesh, false); if (h2.length % 2 === 0) return false;
      minD = Math.min(minD, h2[0].distance);
    }
    return minD > tol;
  };
  const hits = [];
  for (let i = 0; i < parts.length; i++) for (let j = 0; j < parts.length; j++) {
    if (i === j) continue;
    const A = parts[i], B = parts[j];
    if (!ALL && A.g === B.g) continue;
    if (!A.b.intersectsBox(B.b)) continue;
    const a = A.n.obj.geometry.attributes.position, step = Math.max(1, Math.floor(a.count / 160));
    let c = 0, ex = null;
    for (let k = 0; k < a.count; k += step) {
      v.fromBufferAttribute(a, k).applyMatrix4(A.n.obj.matrixWorld);
      if (!B.b.containsPoint(v)) continue;
      if (inside(v, B.n.obj)) { c++; if (!ex) ex = v.clone().divideScalar(MM); }
    }
    if (c) hits.push({ a: path(A.n), b: path(B.n), c, at: ex.toArray().map(x => +x.toFixed(2)), same: A.g === B.g });
  }
  hits.sort((x, y) => y.c - x.c);
  return { parts: parts.length, hits };
}"""

alle = '--alles' in sys.argv
with session() as s:
    pg = s.page(800, 600)
    r = pg.evaluate(CHECK, [TOL, alle])
    cross = [h for h in r['hits'] if not h['same']]
    print(f"{r['parts']} onderdelen, {len(cross)} doorsteken tussen domeinen" + (f", {len(r['hits']) - len(cross)} binnen een domein" if alle else ''))
    for h in r['hits'][:60]:
        print(('BINNEN ' if h['same'] else 'FOUT   ') + f"{h['a']}  steekt in  {h['b']}  ({h['c']} punten, bijvoorbeeld op {h['at']} mm)")
    s.report()
    sys.exit(1 if cross or s.errors() else 0)

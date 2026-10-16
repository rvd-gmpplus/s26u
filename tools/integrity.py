"""Integriteit van de onderdelenboom: namen, beschrijvingen, geometrie, posities, uitklapvectoren en presets.

    python3 tools/integrity.py        # exitcode 1 bij fouten; waarschuwingen worden alleen gemeld
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harness import session

CHECK = r"""(ANCHORS) => {
  const L = window.__s26u, err = [], warn = [];
  const path = n => { const a = []; for (let p = n; p; p = p.parent) a.unshift(p.name); return a.join(' › '); };
  L.ROOT.obj.updateMatrixWorld(true);
  const box = new THREE.Box3(), v = new THREE.Vector3();
  // buitengrens van het gemonteerde toestel in millimeters (MM uit core.js): buitenmaat 78,1 × 7,9 × 163,6 mm plus
  // 1 mm marge, en boven de achterkant ruimte voor het camera-eiland (schatting tot 4 mm)
  const LIM = { x: (78.1 / 2 + 1) * MM, y0: -0.2 * MM, y1: (7.9 + 4) * MM, z: (163.6 / 2 + 1) * MM };
  const pos = new Map();
  for (const n of L.ALL) {
    if (!n.name || typeof n.name !== 'string') err.push('naamloze knoop ' + n.id);
    if (!n.d || n.d.length < 8) warn.push('geen of korte beschrijving: ' + path(n));
    if (n.asm) {
      if (n.kids.length === 0) err.push('lege groep: ' + path(n));
      else if (n.kids.length === 1) warn.push('groep met één onderdeel: ' + path(n));
      const names = new Map();
      for (const k of n.kids) names.set(k.name, (names.get(k.name) || 0) + 1);
      for (const [k, c] of names) if (c > 1) warn.push(`dubbele naam binnen groep (${c}x): ${path(n)} › ${k}`);
    } else {
      const g = n.obj.geometry, a = g && g.attributes.position;
      if (!a || a.count === 0) { err.push('onderdeel zonder geometrie: ' + path(n)); continue; }
      let bad = false; for (let i = 0; i < a.array.length; i++) if (!Number.isFinite(a.array[i])) { bad = true; break; }
      if (bad) { err.push('NaN in geometrie: ' + path(n)); continue; }
      box.setFromObject(n.obj);
      if (box.isEmpty() || ![box.min.x, box.min.y, box.min.z, box.max.x, box.max.y, box.max.z].every(Number.isFinite)) { err.push('ongeldige box: ' + path(n)); continue; }
      if (box.min.x < -LIM.x || box.max.x > LIM.x || box.min.y < LIM.y0 || box.max.y > LIM.y1 || box.min.z < -LIM.z || box.max.z > LIM.z)
        err.push(`buiten het toestel (gemonteerd): ${path(n)} [${box.min.toArray().map(x => x.toFixed(2))} .. ${box.max.toArray().map(x => x.toFixed(2))}]`);
      const key = box.getCenter(v).toArray().map(x => x.toFixed(4)).join(',') + '|' + (g.index ? g.index.count : a.count) + '|' + (n.obj.material && n.obj.material.name);
      if (pos.has(key)) warn.push('dubbel onderdeel op dezelfde plek: ' + path(n) + '  ==  ' + pos.get(key)); else pos.set(key, path(n));
    }
    if (n.parent) {
      const e = n.exv;
      if (!e || ![e.x, e.y, e.z].every(Number.isFinite)) err.push('ongeldige uitklapvector: ' + path(n));
      else if (e.length() < 1e-4) warn.push('uitklapvector nul: ' + path(n));
    }
  }
  const anchorErr = [];
  const A = ANCHORS, count = new Map();
  for (const n of L.ALL) count.set(n.name, (count.get(n.name) || 0) + 1);
  const SPECIAL = new Set(['root_children_order', 'contains', 'content', 'openers', 'preset_ids', 'triangle_budgets']);
  for (const [k, list] of Object.entries(A)) {
    if (SPECIAL.has(k)) continue;
    for (const name of list) { const c = count.get(name) || 0; if (c !== 1) anchorErr.push(`anker "${name}" (${k}) komt ${c}x voor, moet 1x`); }
  }
  // openers: precies deze leiders in de modus Openen, als pad (namen zoals Zijruit komen vier keer voor), niet meer en niet minder
  if (A.openers) {
    const leaders = (typeof OPENERS !== 'undefined' && typeof uiPathOf === 'function') ? OPENERS.map(n => uiPathOf(n)) : [];
    const have = new Set(leaders);
    for (const p of A.openers) if (!have.has(p)) anchorErr.push(`opener "${p}" bestaat niet of is geen leider in de modus Openen`);
    for (const p of have) if (!A.openers.includes(p)) anchorErr.push(`opener "${p}" staat niet in anchors.json (openers)`);
    if (have.size !== A.openers.length) anchorErr.push(`${have.size} openers in de pagina, ${A.openers.length} in anchors.json`);
  }
  // presets: precies deze id's (een verdwenen of hernoemde preset is een fout)
  if (A.preset_ids && L.PRESETS) {
    const ids = L.PRESETS.map(p => p.id);
    for (const id of A.preset_ids) if (!ids.includes(id)) anchorErr.push(`preset "${id}" bestaat niet meer`);
    for (const id of ids) if (!A.preset_ids.includes(id)) anchorErr.push(`preset "${id}" staat niet in anchors.json (preset_ids)`);
  }
  const rc = L.ROOT.kids.map(k => k.name).join(' | '), want = A.root_children_order.join(' | ');
  if (rc !== want) anchorErr.push(`hoofdgroepen: "${rc}" in plaats van "${want}"`);
  const byN = new Map(); for (const n of L.ALL) if (!byN.has(n.name)) byN.set(n.name, n);
  const under = (n, a) => { for (let p = n; p; p = p.parent) if (p === a) return true; return false; };
  for (const [anc, des] of (A.contains || [])) { const a = byN.get(anc), d = byN.get(des); if (a && d && !under(d, a)) anchorErr.push(`"${des}" hoort onder "${anc}" te hangen`); }
  for (const [anc, rules] of Object.entries(A.content || {})) {
    const a = byN.get(anc); if (!a) continue;
    const sub = []; (function w(n) { sub.push(n); n.kids.forEach(w); })(a); sub.shift();
    for (const r of rules) { const re = new RegExp(r.re, "i"); const c = sub.filter(n => (r.groups ? n.asm : r.parts ? !n.asm : true) && re.test(n.name)).length;
      if (c < r.min) anchorErr.push(`"${anc}" bevat ${c} knopen die op /${r.re}/ passen${r.groups ? ' (groepen)' : r.parts ? ' (onderdelen)' : ''}, minimaal ${r.min}`); }
  }
  const presetErr = [];
  if (L.checkPresets) presetErr.push(...L.checkPresets());
  return { err, warn, presetErr, anchorErr, nodes: L.ALL.length, parts: L.ALL.filter(n => !n.asm).length };
}"""

ANCHORS = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'anchors.json'), encoding='utf-8'))

with session() as s:
    pg = s.page(1100, 700)
    r = pg.evaluate(CHECK, ANCHORS)
    print(f"{r['nodes']} knopen, {r['parts']} onderdelen")
    print(f"{len(r['err'])} fouten, {len(r['anchorErr'])} ankerfouten, {len(r['warn'])} waarschuwingen, {len(r['presetErr'])} presetfouten")
    for e in r['err'][:60]: print('FOUT  ' + e)
    for e in r['anchorErr'][:60]: print('ANKER ' + e)
    for e in r['presetErr'][:30]: print('PRESET ' + e)
    show = int(os.environ.get('WARN', '25'))
    for w in r['warn'][:show]: print('let op ' + w)
    if len(r['warn']) > show: print(f'... nog {len(r["warn"]) - show} waarschuwingen (WARN=999 voor alles)')
    s.report()
    sys.exit(1 if (r['err'] or r['anchorErr'] or r['presetErr'] or s.errors()) else 0)

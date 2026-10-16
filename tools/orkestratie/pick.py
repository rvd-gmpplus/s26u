"""Wat ligt er op schermpunten? pick.py 'JS-voorbereiding' x,y x,y ..."""
import sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # tools/ van deze checkout
from harness import session
prep = sys.argv[1]; pts = [tuple(map(int, a.split(','))) for a in sys.argv[2:]]
with session() as s:
    pg = s.page(1280, 800)
    pg.wait_for_function('window.__s26u && window.__s26u.ready', timeout=180000)
    pg.evaluate('() => window.__s26u.setOpenMode(true)')
    pg.evaluate(prep); pg.wait_for_timeout(300); pg.evaluate('() => window.__s26u.finishAll()'); pg.wait_for_timeout(1500)
    pg.screenshot(path=os.environ.get('PICK_PNG', 'pick.png'))
    print(pg.evaluate('() => [camera.position.toArray().map(v => +v.toFixed(3)), controls.target.toArray().map(v => +v.toFixed(3))]'))
    for x, y in pts:
        r = pg.evaluate('''([x, y]) => { const n = window.__s26u.pickNodeAt(x, y, false); if (!n) return null; const p = []; for (let k = n; k; k = k.parent) p.unshift(k.name); return p.slice(1).join('/'); }''', [x, y])
        print((x, y), r)
    s.report()

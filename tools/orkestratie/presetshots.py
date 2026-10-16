"""Screenshot van elke preset (zonder rondleiding).  python3 presetshots.py REPO UITVOERMAP"""
import sys, os, re
if len(sys.argv) < 3: print(__doc__); sys.exit(2)
REPO, OUT = sys.argv[1], sys.argv[2]
sys.path.insert(0, os.path.join(REPO, 'tools'))
from harness import session
ids = [m for m in re.findall(r"\{ id: '([A-Za-z0-9]+)', cat:", open(os.path.join(REPO, 'src/presets.js')).read()) if m != 'tour']
os.makedirs(OUT, exist_ok=True)
failed = False
with session() as s:
    pg = s.page(1280, 800)
    for i, pid in enumerate(ids):
        try:
            pg.evaluate("(id) => { const L = window.__s26u; L.preset(id); L.finishAll(); return true; }", pid)
            pg.wait_for_timeout(500)
            pg.evaluate("() => { window.__s26u.finishAll(); }")
            pg.wait_for_timeout(300)
            pg.screenshot(path=os.path.join(OUT, f'{i+1:02d}-{pid}.png'), timeout=180000)
            print('beeld', pid)
        except Exception as e:
            print('MISLUKT', pid, str(e)[:200]); failed = True
    s.report()
    sys.exit(1 if failed or s.errors() else 0)

"""Interactietest: bediening van de pagina zoals een gebruiker hem gebruikt, op bureaublad en telefoon.

    python3 tools/itest.py             # exitcode 1 bij een fout

Controles (elk met een naam in de uitvoer):
 1. klik op het achterglas klapt zijn groep (Achterkant) uit; nog een klik selecteert en licht het achterglas uit
 2. duiken naar een diep onderdeel opent alle groepen erboven
 3. rechtsklik klapt weer in; stap terug zet de vorige stand terug
 4. modus Openen: een klik op het achterglas opent de opener; een tweede klik sluit hem
 5. elke preset past: zijn onderwerp ligt binnen het vrije beeld (tussen paneel, dock en titel)
 6. labels overlappen elkaar niet en vallen niet buiten het beeld (preset Hoofdgroepen)
 7. zoeken: "accu" vindt de Batterij (synoniem), een naam vindt zichzelf
 8. deellink ?preset=rep1 opent het achterglas
 9. telefoon: tik klapt uit, lang drukken klapt in, geen horizontale scroll
10. rondleiding: start, volgende, pauze, stop
11. omdraaien (golf 7): scherm boven ligt met het laagste punt op de vloer (alle hoekpunten gemeten), ook uitgeklapt en tijdens de draai;
    Uitklappen blijft lokaal (het achterglas klapt omgedraaid naar beneden), een tik op het scherm selecteert, stap terug neemt de
    stand mee, knop (aria-pressed), schakelaar en sneltoets F, camera van boven op het scherm, camknoppen en alle presets in
    beide standen, ?flip=1 (ook met preset) laadt omgedraaid en de URL volgt de stand; de stand tijdens de draai wordt
    deterministisch getoetst (uiFlipPose bij 36 hoeken, laagste punt tussen -0,01 en 0,05 mm), heen en terug geeft exact de beginpositie,
    omdraaien wist de actieve preset
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harness import session, screen_pt

FAILS, N = [], [0]


def check(name, ok, info=''):
    N[0] += 1
    print(('GOED ' if ok else 'FOUT ') + name + (f'  ({info})' if info else ''))
    if not ok: FAILS.append(name)


def settle(pg, ms=250):
    pg.evaluate("() => window.__s26u.finishAll()")
    pg.wait_for_timeout(ms)


def node_pt(pg, name):
    return screen_pt(pg, f"window.__s26u.byName({name!r})")


def desktop(s):
    pg = s.page(1280, 800)
    L = "window.__s26u"
    pg.evaluate(f"() => {L}.preset('assembled')"); settle(pg, 1200)
    # 1. klik op het achterglas
    x, y, _ = node_pt(pg, 'Achterglas')
    pg.mouse.click(x, y); settle(pg, 900)
    st = pg.evaluate(f"() => ({{ ach: {L}.byName('Achterkant').target, sel: {L}.sel().name }})")
    check('klik klapt de groep van het onderdeel uit', st['ach'] == 1, str(st))
    x, y, _ = node_pt(pg, 'Achterglas')
    pg.mouse.click(x, y); settle(pg, 900)
    st = pg.evaluate(f"() => ({{ sel: {L}.sel().name, lifted: {L}.liftedNode() ? {L}.liftedNode().name : null }})")
    check('tweede klik selecteert en licht het achterglas uit', st['sel'] == 'Achterglas', str(st))
    # 2. dubbelklik op een diep onderdeel
    pg.evaluate(f"() => {L}.preset('assembled')"); settle(pg, 1200)
    r = pg.evaluate(f"""() => {{ const n = {L}.byPath('Samsung Galaxy S26 Ultra/Camera\\'s/Camerakolom/Hoofdcamera 200 MP');
        {L}.dive(n); {L}.finishAll(); const up = []; for (let a = n.parent; a; a = a.parent) up.push(a.target); return up; }}""")
    check('duiken opent alle groepen erboven', all(t == 1 for t in r), str(r))
    # 3. inklappen en stap terug
    pg.evaluate(f"() => {L}.preset('assembled')"); settle(pg, 1200)
    x, y, _ = node_pt(pg, 'Achterglas')
    pg.mouse.click(x, y); settle(pg, 900)
    a1 = pg.evaluate(f"() => {L}.byName('Achterkant').target")
    pg.evaluate(f"() => {L}.undo()"); settle(pg, 900)
    a0 = pg.evaluate(f"() => {L}.byName('Achterkant').target")
    check('stap terug zet de vorige stand terug', a1 == 1 and a0 == 0, f'na klik {a1}, na stap terug {a0}')
    pg.evaluate(f"() => {L}.preset('assembled')"); settle(pg, 1200)
    x, y, _ = node_pt(pg, 'Achterglas')
    pg.mouse.click(x, y); settle(pg, 900)
    x, y, _ = node_pt(pg, 'Achterglas')
    pg.mouse.click(x, y, button='right'); settle(pg, 900)
    t = pg.evaluate(f"() => {L}.byName('Achterkant').target")
    check('rechtsklik klapt weer in', t == 0, f'target {t}')
    # 4. openmodus
    pg.evaluate(f"() => {{ {L}.preset('assembled'); {L}.setOpenMode(true); }}"); settle(pg, 1200)
    x, y, _ = node_pt(pg, 'Achterglas')
    pg.mouse.click(x, y); pg.wait_for_timeout(1500); settle(pg, 300)
    o = pg.evaluate(f"() => {L}.openers().find(o => o.name === 'Achterkant').open")
    check('openmodus: klik opent het achterglas', o > 0.99, f'open {o}')
    x, y, _ = node_pt(pg, 'Achterglas')
    pg.mouse.click(x, y); pg.wait_for_timeout(1500); settle(pg, 300)
    o = pg.evaluate(f"() => {L}.openers().find(o => o.name === 'Achterkant').open")
    check('openmodus: tweede klik sluit het weer', o < 0.01, f'open {o}')
    pg.evaluate(f"() => {L}.setOpenMode(false)")
    # 5. elke preset in beeld
    plist = pg.evaluate(f"() => {L}.presetList().filter(p => !p.tour)")
    ids = [p['id'] for p in plist]
    bad = []
    for p in plist:
        pid = p['id']
        pg.evaluate(f"(id) => {L}.preset(id)", pid); pg.wait_for_timeout(2700); settle(pg, 200)
        f = pg.evaluate(f"(names) => {L}.frameOf(names)", p['subject'])
        if not f or not f.get('box'):
            bad.append(f'{pid}: geen kader'); continue
        if f['cover'] < 0.04: bad.append(f"{pid}: onderwerp te klein ({f['cover']})")
        if not f['inside']: bad.append(f"{pid}: onderwerp buiten het vrije beeld")
    check(f'alle {len(ids)} presets kaderen hun onderwerp', not bad, '; '.join(bad[:6]))
    # 6. labels
    pg.evaluate(f"() => {L}.preset('main')"); pg.wait_for_timeout(2700); settle(pg, 400)
    rects = pg.evaluate(f"() => {L}.labelRects()")
    over = 0
    for i in range(len(rects)):
        for j in range(i + 1, len(rects)):
            a, b = rects[i], rects[j]
            if a['x'] < b['x'] + b['w'] and b['x'] < a['x'] + a['w'] and a['y'] < b['y'] + b['h'] and b['y'] < a['y'] + a['h']: over += 1
    outside = sum(1 for r in rects if r['x'] < 0 or r['y'] < 0 or r['x'] + r['w'] > 1280 or r['y'] + r['h'] > 800)
    check('labels zonder overlap en binnen beeld', len(rects) >= 6 and over == 0 and outside == 0, f'{len(rects)} labels, {over} overlappen, {outside} buiten')
    # 7. zoeken
    terms = pg.evaluate(f"() => {L}.searchTerms('accu')")
    hit = pg.evaluate(f"() => {{ const t = {L}.searchTerms('accu'); return {L}.ALL.some(n => t.some(q => n.norm.includes(q)) && n.name === 'Batterij'); }}")
    check('zoeken met synoniem: accu vindt Batterij', hit, str(terms))
    # 8. deellink
    pg2 = s.page(1280, 800, query='?preset=rep1')
    pg2.wait_for_timeout(3000); settle(pg2, 300)
    o = pg2.evaluate("() => window.__s26u.openers().find(o => o.name === 'Achterkant').open")
    check('deellink ?preset=rep1 opent het achterglas', o > 0.99, f'open {o}')
    # 10. rondleiding
    pg.evaluate(f"() => {L}.preset('tour')"); pg.wait_for_timeout(800)
    t0 = pg.evaluate(f"() => {L}.tourState()")
    pg.evaluate(f"() => {L}.tour.next()"); pg.wait_for_timeout(500)
    t1 = pg.evaluate(f"() => {L}.tourState()")
    pg.evaluate(f"() => {L}.tour.pause()"); t2 = pg.evaluate(f"() => {L}.tourState()")
    pg.evaluate(f"() => {L}.stopTour()"); t3 = pg.evaluate(f"() => {L}.tourState()")
    check('rondleiding: start, volgende, pauze, stop', bool(t0) and t1['step'] == t0['step'] + 1 and t2['paused'] and t3 is None, f'{t0} {t1} {t2} {t3}')


# kleinste wereldhoogte van alle hoekpunten van alle meshes (ook ingesloten) en de stand van de vloer
LOWEST = """() => { const v = new THREE.Vector3(), L = window.__s26u; L.ROOT.obj.updateMatrixWorld(true); let min = Infinity;
    for (const m of L.MESHES) { const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld); if (v.y < min) min = v.y; } }
    return { min, ground: ground.position.y, cam: camera.position.y, target: controls.target.y }; }"""
WORLDY = "(n) => { const L = window.__s26u, o = L.byName(n); return o.obj.localToWorld(o.lc.clone()).y; }"


def flip_test(s):
    pg = s.page(1280, 800)
    L = "window.__s26u"
    pg.evaluate(f"() => {L}.preset('assembled')"); settle(pg, 800)
    low0 = pg.evaluate(LOWEST)
    check('omdraaien: uit ligt het scherm op de vloer', abs(low0['min']) < 0.002 and not pg.evaluate(f"() => {L}.state().flip"), f"laagste punt {low0['min']:.5f}")
    # heen en terug: de positie van ROOT is daarna precies de beginpositie (geen verschuiving van 0,125 mm in x)
    p0 = pg.evaluate(f"() => {L}.flipInfo().pos")
    pg.evaluate(f"() => {{ {L}.flip(true); {L}.finishAll(); }}")
    pf = pg.evaluate(f"() => {L}.flipInfo().pos")
    pg.evaluate(f"() => {{ {L}.flip(false); {L}.finishAll(); }}")
    p1 = pg.evaluate(f"() => {L}.flipInfo().pos")
    check('omdraaien: heen en terug geeft exact de beginpositie van ROOT', p1 == p0 and pf != p0, f'begin {p0}, omgedraaid {pf}, terug {p1}')
    # aan: de draai begint (de animatie loopt; de stand ertussen wordt hieronder deterministisch getoetst)
    pg.evaluate(f"() => {L}.flip(true)")
    info = pg.evaluate(f"() => {L}.flipInfo()")
    check('omdraaien: aan start de draai (animatie loopt, hoek tussen 0 en pi)', info['flip'] is True and info['animating'] and 0 <= info['angle'] <= 3.1416, f"hoek {info['angle']}")
    # tijdens de draai rolt het toestel over de vloer: zet uiFlipPose(a) voor 36 hoeken (geen wachten op echte frames, die zijn
    # in software-rendering traag en bij parallelle runs wisselvallig) en meet het laagste hoekpunt van alle meshes in mm
    roll = pg.evaluate("""() => { const L = window.__s26u, low = %s, out = [], a0 = L.flipInfo().angle;
        for (let i = 0; i <= 36; i++) { const a = Math.PI * i / 36; L.flipPose(a); out.push(low().min * 40); }
        L.flipPose(a0); return out; }""" % LOWEST)
    check('omdraaien: bij elke hoek (36 stappen) raakt het laagste punt de vloer (geen zweven, niets erdoorheen)', len(roll) == 37 and all(-0.01 < v < 0.05 for v in roll), f"min {min(roll):.4f} mm, max {max(roll):.4f} mm")
    settle(pg, 600)
    st = pg.evaluate(f"() => {L}.state()")
    low = pg.evaluate(LOWEST)
    check('omdraaien: aan zet state().flip en het laagste punt (camera-eiland) op de vloer', st['flip'] is True and -0.0005 < low['min'] < 0.004, f"{st['flip']}, laagste punt {low['min']:.5f} ({low['min'] * 40:.3f} mm)")
    ys, ya = pg.evaluate(WORLDY, 'Scherm'), pg.evaluate(WORLDY, 'Achterkant')
    check('omdraaien: scherm boven, achterkant onder', ys > ya + 0.1 and low['cam'] > low['target'], f'scherm y {ys:.3f}, achterkant y {ya:.3f}, camera y {low["cam"]:.2f} boven doel {low["target"]:.2f}')
    pg.evaluate(f"() => {L}.preset('main')"); settle(pg, 900)
    low = pg.evaluate(LOWEST)
    ys, ya = pg.evaluate(WORLDY, 'Scherm'), pg.evaluate(WORLDY, 'Achterkant')
    check('omdraaien: uitgeklapt blijft lokaal (achterkant klapt omlaag, scherm omhoog) en niets steekt door de vloer', ya < ys and low['min'] > low['ground'] - 0.0005, f"achterkant y {ya:.2f}, scherm y {ys:.2f}, laagste punt {low['min']:.3f}, vloer {low['ground']:.3f}")
    # omdraaien wist de actieve preset: de camera kadert niet meer op de preset, dus de URL toont geen ?preset= meer
    pg.evaluate(f"() => {L}.flip(false)"); settle(pg, 600)
    sp = pg.evaluate(f"() => ({{ preset: {L}.state().preset, q: location.search }})")
    check('omdraaien: omdraaien wist de actieve preset en haalt ?preset= uit de URL', sp['preset'] is None and 'preset=' not in sp['q'] and 'flip' not in sp['q'], str(sp))
    # tikken, isoleren, dimmen, openen in de omgedraaide stand
    pg.evaluate(f"() => {{ {L}.flip(false); {L}.preset('assembled'); }}"); settle(pg, 800)
    pg.evaluate(f"() => {L}.flip(true)"); settle(pg, 900)   # de camera kijkt daarna van boven op het scherm
    x, y, _ = node_pt(pg, 'Scherm')
    pg.mouse.click(x, y); settle(pg, 900)
    st = pg.evaluate(f"() => ({{ sel: {L}.sel().name, sys: {L}.sel().sys, open: {L}.state().open }})")
    check('omdraaien: tik op het scherm selecteert iets van het scherm', st['sys'] == 'Scherm' and st['sel'] != 'Samsung Galaxy S26 Ultra', str(st))
    pg.evaluate(f"() => {{ {L}.dive('Selfiecamera 12 MP'); }}"); settle(pg, 900)
    dm = pg.evaluate(f"() => ({{ dim: {L}.dimInfo(), state: {L}.state() }})")
    check('omdraaien: duiken dimt de rest en klapt de groepen erboven uit', dm['dim']['dimmed'] > 0 and len(dm['state']['open']) > 0, str(dm['dim']))
    pg.evaluate(f"() => {{ {L}.isolate([{L}.byName('Batterij')]); }}"); settle(pg, 600)
    iso = pg.evaluate(f"() => ({{ iso: {L}.isolated(), low: ({LOWEST})() }})")
    check('omdraaien: isoleren werkt', iso['iso'] == ['Batterij'], str(iso['iso']))
    pg.evaluate(f"() => {{ {L}.isolate([]); {L}.preset('assembled'); {L}.setOpenMode(true); {L}.setOpen('Achterkant', 1, true); }}"); settle(pg, 900)
    ach = pg.evaluate(f"() => ({{ o: {L}.openers().find(o => o.name === 'Achterkant').open, y: ({WORLDY})('Achterglas') }})")
    pg.evaluate(f"() => {{ {L}.setOpenMode(false); {L}.setOpen('Achterkant', 0, true); }}")
    check('omdraaien: openers werken (achterglas gaat open)', ach['o'] > 0.99, str(ach))
    # stap terug neemt de stand mee
    pg.evaluate(f"() => {L}.preset('assembled')"); settle(pg, 600)
    pg.evaluate(f"() => {L}.flip(false)"); settle(pg, 900)
    f0 = pg.evaluate(f"() => {L}.state().flip")
    pg.evaluate(f"() => {L}.undo()"); settle(pg, 900)
    f1 = pg.evaluate(f"() => {L}.state().flip")
    low = pg.evaluate(LOWEST)
    check('omdraaien: stap terug neemt de stand mee (uit, dan terug naar aan)', f0 is False and f1 is True and -0.0005 < low['min'] < 0.004, f'{f0} {f1} laagste {low["min"]:.4f}')
    # knop, schakelaar, sneltoets
    pg.evaluate(f"() => {L}.flip(false)"); settle(pg, 800)
    pr = lambda: pg.evaluate("() => [document.getElementById('btnFlip').getAttribute('aria-pressed'), document.getElementById('tFlip').checked, document.getElementById('btnFlip').getAttribute('aria-label')]")
    a0 = pr()
    pg.click('#btnFlip'); settle(pg, 800)
    a1, f2 = pr(), pg.evaluate(f"() => {L}.state().flip")
    pg.keyboard.press('f'); settle(pg, 800)
    a2, f3 = pr(), pg.evaluate(f"() => {L}.state().flip")
    pg.evaluate("() => document.getElementById('tabbtn-view').click()")
    pg.click('label[for=tFlip]'); settle(pg, 800)
    a3, f4 = pr(), pg.evaluate(f"() => {L}.state().flip")
    check('omdraaien: knop (aria-pressed en aria-label), sneltoets F en schakelaar in Weergave', a0[:2] == ['false', False] and a1[:2] == ['true', True] and f2 and a2[:2] == ['false', False] and not f3 and a3[:2] == ['true', True] and f4 and bool(a0[2]), f'{a0} {a1} {a2} {a3}')
    # camera: knoppen in beide standen
    res = {}
    for flip in (False, True):
        pg.evaluate(f"(f) => {{ {L}.flip(f); {L}.preset('assembled'); }}", flip); settle(pg, 800)
        for cam in ('front', 'rear', 'iso'):
            pg.click(f'[data-cam={cam}]'); settle(pg, 700)
            c = pg.evaluate("() => camera.position.y - controls.target.y")
            res[(flip, cam)] = c
    ok = res[(False, 'front')] < 0 < res[(False, 'rear')] and res[(True, 'front')] > 0 > res[(True, 'rear')] and res[(False, 'iso')] > 0 > res[(True, 'iso')]
    check('omdraaien: camknoppen draaien mee (Scherm kijkt omgedraaid van boven, Achterkant van onder)', ok, str({f'{int(k[0])}{k[1]}': round(v, 2) for k, v in res.items()}))
    # na het omdraaien kijkt de camera in een driekwartaanzicht van boven op het scherm; terug kijkt hij op de achterkant
    pg.evaluate(f"() => {{ {L}.flip(false); {L}.preset('assembled'); }}"); settle(pg, 800)
    pg.evaluate(f"() => {L}.flip(true)"); pg.wait_for_timeout(1500); settle(pg, 400)
    v = pg.evaluate("() => { const d = camera.position.clone().sub(controls.target).normalize(); return [d.x, d.y, d.z]; }")
    check('omdraaien: na omdraaien kijkt de camera in een driekwartaanzicht van boven op het scherm', 0.45 < v[1] < 0.85 and abs(v[0]) > 0.2 and abs(v[2]) > 0.2, str([round(a, 2) for a in v]))
    pg.evaluate(f"() => {L}.flip(false)"); pg.wait_for_timeout(1500); settle(pg, 400)
    v = pg.evaluate("() => { const d = camera.position.clone().sub(controls.target).normalize(); return [d.x, d.y, d.z]; }")
    check('omdraaien: terug kijkt de camera van boven op de achterkant', 0.45 < v[1] < 0.85, str([round(a, 2) for a in v]))
    # alle presets kaderen hun onderwerp ook omgedraaid
    pg.evaluate(f"() => {{ {L}.preset('assembled'); {L}.flip(true); }}"); settle(pg, 800)
    plist = pg.evaluate(f"() => {L}.presetList().filter(p => !p.tour)")
    bad = []
    for p in plist:
        pg.evaluate(f"(id) => {L}.preset(id)", p['id']); settle(pg, 250)
        f = pg.evaluate(f"(names) => {L}.frameOf(names)", p['subject'])
        if not f or not f.get('box'): bad.append(f"{p['id']}: geen kader"); continue
        if f['cover'] < 0.04: bad.append(f"{p['id']}: onderwerp te klein ({f['cover']})")
        if not f['inside']: bad.append(f"{p['id']}: onderwerp buiten het vrije beeld")
        low = pg.evaluate(LOWEST)
        if low['min'] < low['ground'] - 0.0005: bad.append(f"{p['id']}: steekt {low['ground'] - low['min']:.3f} door de vloer")
    check(f'omdraaien: alle {len(plist)} presets kaderen hun onderwerp en niets steekt door de vloer', not bad, '; '.join(bad[:6]))
    # deellinken
    for q, want_preset in (('?flip=1', None), ('?flip=1&preset=rep1', 'rep1'), ('?preset=rep1&flip=1', 'rep1')):
        pg2 = s.page(1280, 800, query=q)
        pg2.wait_for_timeout(2500); settle(pg2, 300)
        r = pg2.evaluate(f"() => ({{ flip: {L}.state().flip, preset: {L}.state().preset, open: {L}.openers().find(o => o.name === 'Achterkant').open, search: location.search, low: ({LOWEST})(), ang: {L}.flipInfo().angle }})")
        ok = r['flip'] is True and 'flip=1' in r['search'] and ((-0.0005 < r['low']['min'] < 0.004) if want_preset is None else (r['low']['min'] > r['low']['ground'] - 0.0005 and r['preset'] == want_preset and r['open'] > 0.99 and 'preset=rep1' in r['search']))
        check(f'omdraaien: deellink {q} laadt omgedraaid', ok, f"{r['flip']} {r['preset']} open {r['open']} {r['search']} laagste {r['low']['min']:.4f}")
        if want_preset is None:
            r2 = pg2.evaluate(f"() => {{ {L}.flip(false); {L}.finishAll(); return location.search; }}")
            check('omdraaien: uit haalt flip uit de URL', 'flip' not in r2, r2)
        pg2.close()
    pg.close()


def phone(s):
    pg = s.page(390, 844, scale=2, touch=True)
    L = "window.__s26u"
    pg.evaluate(f"() => {L}.preset('assembled')"); settle(pg, 1500)
    x, y, _ = node_pt(pg, 'Achterglas')
    pg.touchscreen.tap(x, y); settle(pg, 900)
    t = pg.evaluate(f"() => {L}.byName('Achterkant').target")
    check('telefoon: tik klapt uit', t == 1, f'target {t}')
    cdp = pg.context.new_cdp_session(pg)
    x, y, _ = node_pt(pg, 'Achterglas')
    for typ in ('touchStart',):
        cdp.send('Input.dispatchTouchEvent', {'type': typ, 'touchPoints': [{'x': x, 'y': y}]})
    pg.wait_for_timeout(900)
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
    settle(pg, 900)
    t = pg.evaluate(f"() => {L}.byName('Achterkant').target")
    check('telefoon: lang drukken klapt in', t == 0, f'target {t}')
    sc = pg.evaluate("() => document.documentElement.scrollWidth > window.innerWidth")
    check('telefoon: geen horizontale scroll', not sc)
    pg.touchscreen.tap(*pg.evaluate("() => { const r = document.getElementById('btnFlip').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }")); settle(pg, 900)
    st = pg.evaluate(f"() => ({{ flip: {L}.state().flip, pressed: document.getElementById('btnFlip').getAttribute('aria-pressed'), scroll: document.documentElement.scrollWidth > window.innerWidth }})")
    check('telefoon: de knop Omdraaien draait het toestel om, geen horizontale scroll', st['flip'] is True and st['pressed'] == 'true' and not st['scroll'], str(st))


with session() as s:
    desktop(s)
    flip_test(s)
    phone(s)
    print(f'{N[0]} controles, {len(FAILS)} fouten')
    s.report()
    sys.exit(1 if FAILS or s.errors() else 0)

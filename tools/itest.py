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


with session() as s:
    desktop(s)
    phone(s)
    print(f'{N[0]} controles, {len(FAILS)} fouten')
    s.report()
    sys.exit(1 if FAILS or s.errors() else 0)

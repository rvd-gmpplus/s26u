"""Publicatierooktest: de CDN-versie zoals hij gepubliceerd wordt, in twee vormen.

    python3 tools/pubsmoke.py          # exitcode 1 bij een fout

Vormen (orkestrator golf 6, 2026-10-16; premortem 2 en 6: tot nu toe laadde geen enkele test index.html zoals GitHub
Pages hem serveert, en zonder doctype en viewport rendert een telefoon de pagina in quirks-modus op 980 px breed):
- artifact: de in het geheugen gebouwde pagina in hetzelfde HTML-geraamte dat de artefacthost eromheen zet
  (SKELETON_HEAD en SKELETON_TAIL; die twee alleen wijzigen na een nieuwe meting van de host, andere scripts
  importeren ze).
- pages: de bytes van index.html zoals ze op schijf staan, zonder verpakking, geserveerd als
  https://rvd-gmpplus.github.io/s26u/ met content-type text/html; charset=utf-8.

Wat hij doet:
1. Bouwt de CDN-pagina in het geheugen (zoals build.py hem in index.html schrijft) en eist dat die byte voor byte gelijk
   is aan index.html op schijf (anders is index.html niet herbouwd en test de Pages-vorm iets anders dan de bron).
2. Laadt beide vormen in Chromium (SwiftShader) op 1280x800 en op drie telefoonviewports met touch en is_mobile:
   390x844, 360x780 (Android-achtig) en 430x932, alle drie met dpr 3. Verzoeken naar cdn.jsdelivr.net/npm/three@0.147.0/
   worden beantwoord uit het lokale npm-pakket; lettertypen krijgen een lege stylesheet.
3. Controleert per viewport: geen console-fouten, waarschuwingen (behalve harness.is_ignored) of paginafouten, __s26u klaar binnen PUBSMOKE_READY_MS (standaard 20 s),
   THREE.REVISION = 147, het canvas heeft touch-action en user-select uit, de stylesheet schakelt -webkit-touch-callout
   uit, document.compatMode is CSS1Compat en er is geen horizontale scroll. Op de telefoonviewports daarnaast:
   innerWidth gelijk aan de viewportbreedte, het paneel (#sheet) staat onderaan en past binnen de breedte, en een tik
   op het midden van het canvas selecteert iets (__s26u.state().selected verandert).
4. Controleert met curl via de proxy dat elk CDN-bestand bestaat en byte voor byte gelijk is aan het lokale pakket,
   en dat de lettertype-stylesheet van Google Fonts bereikbaar is.
"""
import sys, os, re, time, hashlib, subprocess, importlib.util, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harness import ROOT, ensure_three, chromium_path, ARGS, is_ignored

SKELETON_HEAD = ('<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover">'
                 '<style>:root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}'
                 'html{scroll-padding-top:env(safe-area-inset-top,0px)}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#fff;color:#000}'
                 'img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}</style></head><body>\n')
# Orkestrator golf 6, 2026-10-16: gemeten staart. Een Artifact read van https://claude.ai/artifact/4WvFbz8L3JZLEAGLcHPC4F
# (versie 1792155388-9fd0, 401.083 bytes) is exact SKELETON_HEAD (531 bytes) + 'git show edb37f2:index.html'
# (400.537 bytes) + '\n</body></html>' (15 bytes). De eerdere staart '\n\n</body></html>' (16 bytes) gaf ONGELIJK op
# offset 400536 (het slot-LF). build.py laat de pagina op precies één LF eindigen; dan geven 'host plakt
# \n</body></html> erachter' en 'host haalt het slot-LF weg en plakt \n\n</body></html> erachter' dezelfde bytes,
# dus '\n</body></html>' is de exacte, gemeten staart.
SKELETON_TAIL = '\n</body></html>'

# orkestrator golf 6, 2026-10-16: de Pages-URL en de viewports van de geemuleerde telefoontest (docs/telefoontest.md)
PAGES_URL = 'https://rvd-gmpplus.github.io/s26u/'
ARTIFACT_URL = 'https://artifact.local/index.html'
# (breedte, hoogte, dpr, touch): desktop, iPhone-achtig, Android-achtig, groot iPhone-achtig
VIEWPORTS = ((1280, 800, 1, False), (390, 844, 3, True), (360, 780, 3, True), (430, 932, 3, True))

PROBE = """(() => { const c = document.querySelector('canvas'); const cs = getComputedStyle(c);
    const css = [...document.styleSheets].map(s => { try { return [...s.cssRules].map(r => r.cssText).join('\\n'); } catch (e) { return ''; } }).join('\\n');
    const sh = document.getElementById('sheet'); const sr = sh ? sh.getBoundingClientRect() : null;
    const cr = c.getBoundingClientRect();
    return { rev: THREE.REVISION, touch: cs.touchAction, select: cs.userSelect || cs.webkitUserSelect, callout: /-webkit-touch-callout\\s*:\\s*none/.test(css) || /touch-callout/.test(document.documentElement.innerHTML),
             hscroll: document.documentElement.scrollWidth > innerWidth, compat: document.compatMode, iw: innerWidth, ih: innerHeight,
             sheet: sr ? { l: sr.left, r: sr.right, t: sr.top, b: sr.bottom, w: sr.width } : null,
             canvas: { x: cr.left + cr.width / 2, y: cr.top + cr.height / 2 } }; })()"""


def load_build():
    spec = importlib.util.spec_from_file_location('lagbuild', os.path.join(ROOT, 'build.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def run_view(br, b, three, form, body, w, h, dpr, touch, fails, logs):
    """Laadt een vorm in een viewport, drukt een regel met de meetwaarden af en voegt fouten toe aan fails."""
    ctx = br.new_context(viewport={'width': w, 'height': h}, device_scale_factor=dpr, has_touch=touch, is_mobile=touch)
    ctx.add_init_script('window.__S26U_CACHECHECK = true;')
    if os.environ.get('S26U_TEGENPROEF') == '1':
        # tegenproef: deze waarschuwing mag nooit door IGNORE vallen (zelfde als in harness.py)
        ctx.add_init_script("console.warn('s26u tegenproef');")
    pg = ctx.new_page()
    tag = f'{form} {w}x{h}'

    def on_console(m):
        # fouten en waarschuwingen tellen, behalve wat harness.is_ignored wegfiltert (IGNORE, op macOS ook IGNORE_DARWIN)
        if m.type in ('error', 'warning') and not is_ignored(m.text):
            loc = m.location or {}
            if 'Failed to load resource' in m.text and is_ignored(loc.get('url') or ''):
                return
            logs.append(f'[{tag}] {m.type}: {m.text}')
    pg.on('console', on_console)
    pg.on('pageerror', lambda e: logs.append(f'[{tag}] PAGEERROR: {e}'))
    url = ARTIFACT_URL if form == 'artifact' else PAGES_URL

    def route(rt):
        u = rt.request.url
        if u.startswith(b.CDN):
            path = os.path.join(three, u[len(b.CDN):].split('?')[0])
            if os.path.isfile(path):
                return rt.fulfill(status=200, body=open(path, 'rb').read(), headers={'content-type': 'application/javascript', 'access-control-allow-origin': '*'})
            return rt.fulfill(status=404, body='niet gevonden')
        if 'fonts.googleapis.com' in u or 'fonts.gstatic.com' in u:
            return rt.fulfill(status=200, body='', headers={'content-type': 'text/css', 'access-control-allow-origin': '*'})
        if u.split('?')[0].split('#')[0] in (url, PAGES_URL + 'index.html'):
            # pages: geen verpakking, precies de bytes van index.html, met het content-type van GitHub Pages
            return rt.fulfill(status=200, body=body, headers={'content-type': 'text/html; charset=utf-8'})
        return rt.abort()
    try:
        pg.route('**/*', route)
        t0 = time.time()
        pg.goto(url, wait_until='load', timeout=120000)
        # grens voor `ready`: 20 s (docs/testen.md); op een belaste machine of CI via PUBSMOKE_READY_MS hoger zetten
        ready_ms = int(os.environ.get('PUBSMOKE_READY_MS', '20000'))
        ready = True
        try:
            pg.wait_for_function('window.__s26u && window.__s26u.ready !== false', timeout=ready_ms)
        except Exception:
            fails.append(f'[{tag}] __s26u niet klaar binnen {ready_ms / 1000:g} s')
            ready = False
        dt = time.time() - t0
        r = pg.evaluate(PROBE)
        tap = '-'
        if ready and touch:
            # een tik op het toestel in het midden van het canvas moet iets selecteren (eerste tik: groep uitklappen
            # en selecteren, of het onderdeel zelf selecteren); __s26u.state().selected moet veranderen
            pg.wait_for_timeout(300)
            x, y = r['canvas']['x'], r['canvas']['y']
            under = pg.evaluate('([x, y]) => window.__s26u.pickAt(x, y)', [x, y])
            before = pg.evaluate('window.__s26u.state().selected')
            pg.touchscreen.tap(x, y)
            pg.wait_for_timeout(700)
            after = pg.evaluate('window.__s26u.state().selected')
            ok = bool(after) and after != before
            tap = f'{"GOED" if ok else "NIET GOED"} (onder de vinger {under}, selectie {before} -> {after})'
            if not ok:
                fails.append(f'[{tag}] tik op het midden van het canvas ({x:.0f},{y:.0f}) selecteert niets: onder de vinger {under}, selectie blijft {before}')
        sh = r['sheet']
        sheet_txt = f'paneel {sh["l"]:.0f}..{sh["r"]:.0f} x {sh["t"]:.0f}..{sh["b"]:.0f}' if sh else 'paneel ontbreekt'
        print(f'[{tag}] {"klaar" if ready else "NIET klaar"} in {dt:.1f} s, compatMode {r["compat"]}, innerWidth {r["iw"]}, three r{r["rev"]}, '
              f'touch-action {r["touch"]}, user-select {r["select"]}, touch-callout uit: {r["callout"]}, horizontale scroll: {r["hscroll"]}, '
              f'{sheet_txt}, tik: {tap}')
        if r['rev'] != '147': fails.append(f'[{tag}] THREE.REVISION is {r["rev"]}')
        if r['touch'] != 'none': fails.append(f'[{tag}] canvas touch-action is {r["touch"]}, moet none')
        if r['select'] != 'none': fails.append(f'[{tag}] canvas user-select is {r["select"]}, moet none')
        if not r['callout']: fails.append(f'[{tag}] -webkit-touch-callout: none ontbreekt (lang drukken op iOS opent dan het systeemmenu)')
        if r['hscroll']: fails.append(f'[{tag}] horizontale scroll')
        if r['compat'] != 'CSS1Compat': fails.append(f'[{tag}] document.compatMode is {r["compat"]}, moet CSS1Compat (doctype ontbreekt: quirks-modus)')
        if touch:
            if r['iw'] != w: fails.append(f'[{tag}] innerWidth is {r["iw"]}, moet {w} (viewport-meta ontbreekt: de telefoon rendert op desktopbreedte)')
            if not sh:
                fails.append(f'[{tag}] mobiel paneel #sheet ontbreekt')
            else:
                if abs(sh['b'] - r['ih']) > 1: fails.append(f'[{tag}] mobiel paneel staat niet onderaan (onderkant {sh["b"]:.0f}, scherm {r["ih"]})')
                if sh['l'] < -1 or sh['r'] > min(r['iw'], w) + 1 or sh['w'] > w + 1: fails.append(f'[{tag}] mobiel paneel past niet binnen de breedte ({sh["l"]:.0f}..{sh["r"]:.0f} bij {w} px)')
    finally:
        ctx.close()


def main():
    b = load_build()
    sources = [(f, b.read(f)) for f in b.ORDER]
    errs = b.lint(sources)
    if errs:
        print('lint faalt:', *errs, sep='\n  ')
        return 1
    page = b.page(b.read('head.html'), '\n'.join(t for _, t in sources), b.CDN)
    html = SKELETON_HEAD + page + SKELETON_TAIL
    three = ensure_three()
    fails = []

    # 1. index.html op schijf moet de in het geheugen gebouwde pagina zijn (orkestrator golf 6, 2026-10-16)
    with open(os.path.join(ROOT, 'index.html'), 'rb') as f:
        disk = f.read()
    if disk != page.encode('utf-8'):
        fails.append(f'index.html is niet herbouwd: wijkt af van de bron ({len(disk)} bytes op schijf, {len(page.encode("utf-8"))} gebouwd); draai python3 build.py')
    print(f'index.html {len(disk)} bytes, sha256 {hashlib.sha256(disk).hexdigest()[:12]}, '
          f'begint met {disk[:40]!r}, versie {(re.search(rb"s26u-version\" content=\"([^\"]+)", disk) or [b"", b"?"])[1].decode()}')

    # 4. CDN en lettertypen via curl (proxy)
    for lib in b.LIBS:
        url = b.CDN + lib
        r = subprocess.run(['curl', '-sS', '-L', '--max-time', '60', '-o', '-', '-w', '%{http_code}', url], capture_output=True)
        body, code = r.stdout[:-3], r.stdout[-3:].decode(errors='replace')
        local = open(os.path.join(three, lib), 'rb').read()
        if code != '200':
            fails.append(f'CDN {url} geeft HTTP {code}')
        elif hashlib.sha256(body).hexdigest() != hashlib.sha256(local).hexdigest():
            fails.append(f'CDN {url} wijkt af van het lokale pakket ({len(body)} tegen {len(local)} bytes)')
    fonts = re.search(r'href="(https://fonts\.googleapis\.com/css2[^"]+)"', page)
    if fonts:
        r = subprocess.run(['curl', '-sS', '-o', '/dev/null', '-w', '%{http_code}', '--max-time', '30', fonts.group(1).replace('&amp;', '&')], capture_output=True, text=True)
        if r.stdout.strip() != '200':
            fails.append(f'Google Fonts geeft HTTP {r.stdout.strip()}')

    # 2 en 3. Laden in beide vormen en alle viewports
    from playwright.sync_api import sync_playwright
    logs = []
    with sync_playwright() as p:
        exe = chromium_path()
        br = p.chromium.launch(executable_path=exe, args=ARGS) if exe else p.chromium.launch(args=ARGS)
        for form, body in (('artifact', html.encode('utf-8')), ('pages', disk)):
            for (w, h, dpr, touch) in VIEWPORTS:
                try:
                    run_view(br, b, three, form, body, w, h, dpr, touch, fails, logs)
                except Exception as e:
                    fails.append(f'[{form} {w}x{h}] test brak af: {str(e).splitlines()[0][:200]}')
        br.close()
    # logs bevat al alleen fouten, waarschuwingen en paginafouten die niet genegeerd worden: alles telt
    for l in logs[:30]: print('  ' + l[:300])
    fails += [f'console: {l}' for l in logs]
    print('PUBLICATIEROOKTEST OK' if not fails else 'PUBLICATIEROOKTEST NIET OK:\n  ' + '\n  '.join(fails))
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main())

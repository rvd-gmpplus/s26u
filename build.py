"""Bouwt index.html uit src/ en controleert de broncode.

Gebruik:
  python3 build.py                 schrijft index.html (three.js via CDN)
  python3 build.py MAP             schrijft ook MAP/index.html die three.js uit MAP/three/ laadt
  python3 build.py --lint          controleert alleen, schrijft niets
  python3 build.py --test-only MAP schrijft alleen MAP/index.html (gebruikt door de tests; laat index.html ongemoeid)

Controles (de bouw stopt bij een fout):
  - dubbele functienamen op het hoogste niveau over alle bestanden (die zouden elkaar stil overschrijven)
  - dubbele materiaalnamen in std()/phys()
  - syntaxis van het samengevoegde script via `node --check` (vangt ook dubbele const/let), en van elk inline script in head.html
  - head.html begint met <!doctype html> en bevat meta charset utf-8 en meta viewport met width=device-width (struikeldraad 2)

De scripttags van three.js krijgen integrity (sha384) en crossorigin="anonymous"; de hash komt uit het lokale npm-pakket
(THREE_DIR of ~/.cache/s26u/three-0.147.0/package, zie tools/harness.py --ensure-three). Ontbreekt dat, dan stopt de bouw.
"""
import os, re, sys, shutil, subprocess, tempfile, hashlib, base64

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'src')
# domeinbestanden vóór phone.js (de orkestrator die hun bouwfuncties aanroept); zie docs/indeling.md
ORDER = ['core.js', 'frame.js', 'rear.js', 'display.js', 'camera.js', 'board.js', 'power.js', 'peripherals.js', 'phone.js', 'partnumbers.js', 'app1.js', 'presets.js', 'app2.js']
LIBS = ['build/three.min.js', 'examples/js/controls/OrbitControls.js', 'examples/js/environments/RoomEnvironment.js', 'examples/js/geometries/RoundedBoxGeometry.js', 'examples/js/utils/BufferGeometryUtils.js']
THREE_VERSION = '0.147.0'  # r147: de laatste three.js met de niet-module examples/js (OrbitControls enz.)
CDN = f'https://cdn.jsdelivr.net/npm/three@{THREE_VERSION}/'


def three_dir():
    """Map met het uitgepakte npm-pakket three@THREE_VERSION (dezelfde padlogica als tools/harness.py: THREE_DIR, anders de
    cache van `python3 tools/harness.py --ensure-three`)."""
    d = os.environ.get('THREE_DIR')
    if d and os.path.isfile(os.path.join(d, 'build', 'three.min.js')):
        return d
    return os.path.expanduser(f'~/.cache/s26u/three-{THREE_VERSION}/package')


def integrity(lib):
    """R5: sha384-integriteit van een CDN-bestand, berekend uit het lokale npm-pakket (tools/pubsmoke.py bewaakt dat de CDN
    byte voor byte hetzelfde levert). Zonder pakket stopt de bouw: een pagina zonder integrity zou stil anders zijn."""
    path = os.path.join(three_dir(), lib)
    if not os.path.isfile(path):
        raise SystemExit(f'three.js-bestand {path} ontbreekt voor de integriteitshash; haal het pakket op met: python3 tools/harness.py --ensure-three')
    with open(path, 'rb') as f:
        return 'sha384-' + base64.b64encode(hashlib.sha384(f.read()).digest()).decode()


def read(name):
    with open(os.path.join(SRC, name), encoding='utf-8') as f:
        return f.read()


def lint(sources):
    errors = []
    seen_fn, seen_mat = {}, {}
    for name, text in sources:
        for i, line in enumerate(text.split('\n'), 1):
            m = re.match(r'(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)', line)
            if m:
                fn = m.group(1)
                if fn in seen_fn:
                    errors.append(f'{name}:{i}: functie {fn} bestaat al in {seen_fn[fn]}')
                else:
                    seen_fn[fn] = f'{name}:{i}'
            for mm in re.finditer(r'\b(?:std|phys)\(\s*[\'"]([^\'"]+)[\'"]', line):
                mat = mm.group(1)
                if mat in seen_mat:
                    errors.append(f'{name}:{i}: materiaal {mat} bestaat al in {seen_mat[mat]}')
                else:
                    seen_mat[mat] = f'{name}:{i}'
    js = '\n'.join(text for _, text in sources)
    node = shutil.which('node')
    if node:
        with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as f:
            f.write(js)
            tmp = f.name
        try:
            r = subprocess.run([node, '--check', tmp], capture_output=True, text=True)
            if r.returncode != 0:
                msg = (r.stderr or r.stdout).strip().replace(tmp, 'samengevoegd.js')
                # regelnummer terugvertalen naar bronbestand
                lm = re.search(r'samengevoegd\.js:(\d+)', msg)
                if lm:
                    ln, acc = int(lm.group(1)), 0
                    for name, text in sources:
                        n = text.count('\n') + 1
                        if ln <= acc + n:
                            msg += f'\n  -> {name}:{ln - acc}'
                            break
                        acc += n
                errors.append('syntaxfout:\n' + msg)
        finally:
            os.unlink(tmp)
    else:
        print('let op: node niet gevonden, syntaxcontrole overgeslagen', file=sys.stderr)
    return errors


def lint_head(head):
    """Inline scripts in head.html (zoals de foutafhandeling vóór de scripttags) vallen buiten het samengevoegde script;
    ze gaan apart door node --check. Daarnaast struikeldraad 2: het geraamte van de pagina (doctype, charset, viewport)."""
    errors = lint_skeleton(head)
    node = shutil.which('node')
    if not node:
        return errors
    for i, sc in enumerate(re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', head, re.S), 1):
        with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as f:
            f.write(sc)
            tmp = f.name
        try:
            r = subprocess.run([node, '--check', tmp], capture_output=True, text=True)
            if r.returncode != 0:
                errors.append(f'syntaxfout in inline script {i} van head.html:\n' + (r.stderr or r.stdout).strip().replace(tmp, 'head-inline.js'))
        finally:
            os.unlink(tmp)
    return errors


def lint_skeleton(head):
    """Struikeldraad 2 (orkestrator golf 6, 2026-10-16): index.html is de pagina die Pages ruw serveert, zonder geraamte
    eromheen. Zonder doctype draait een telefoon hem in quirks mode, zonder viewport met 980 px lay-outbreedte. Daarom moet
    head.html zelf beginnen met <!doctype html> en meta charset utf-8 en meta viewport (width=device-width) bevatten.
    Staat ook in --lint, zodat de controle vóór elke commit draait."""
    errors = []
    if not re.match(r'\s*<!doctype html>', head, re.I):
        errors.append('head.html begint niet met <!doctype html> (struikeldraad 2: zonder doctype quirks mode op Pages)')
    if not re.search(r'<meta\s+charset=["\']?utf-8["\']?\s*/?>', head, re.I):
        errors.append('head.html mist <meta charset="utf-8"> (struikeldraad 2)')
    vp = re.search(r'<meta\s+name=["\']?viewport["\']?\s+content=["\']([^"\']*)["\']', head, re.I)
    if not vp or not re.search(r'width\s*=\s*device-width', vp.group(1), re.I):
        errors.append('head.html mist <meta name="viewport"> met width=device-width (struikeldraad 2: anders 980 px lay-outbreedte op een telefoon)')
    return errors


def version(head, js, test=False):
    """Versiestempel: het nummer uit VERSION plus een inhoudshash (7 tekens) van head.html en het samengevoegde script,
    zodat de pagina zelf zegt uit welke bron hij komt. Niet uit HEAD: de commit die index.html bevat bestaat bij het bouwen nog niet."""
    with open(os.path.join(HERE, 'VERSION'), encoding='utf-8') as f:
        num = f.read().strip()
    h = hashlib.sha256((head + '\n' + js).encode('utf-8')).hexdigest()[:7]
    return f'{num} (bron {h}{", testversie" if test else ""})'


def page(head, js, prefix, test=False):
    tags = '\n'.join(f'<script src="{prefix}{l}" integrity="{integrity(l)}" crossorigin="anonymous"></script>' for l in LIBS)
    head = head.replace('__S26U_VERSION__', version(head, js, test))
    return f"{head}\n{tags}\n<script>\n{js}\n</script>\n"


def main(argv):
    lint_only = '--lint' in argv
    test_only = '--test-only' in argv
    args = [a for a in argv if not a.startswith('--')]
    sources = [(f, read(f)) for f in ORDER]
    errors = lint(sources) + lint_head(read('head.html'))
    if errors:
        print('BOUW GESTOPT:', file=sys.stderr)
        for e in errors:
            print('  ' + e, file=sys.stderr)
        return 1
    if lint_only:
        print('lint ok')
        return 0
    head = read('head.html')
    js = '\n'.join(text for _, text in sources)
    out = os.path.join(HERE, 'index.html')
    if test_only and not args:
        print('--test-only vraagt een map', file=sys.stderr)
        return 2
    if not test_only:
        with open(out, 'w', encoding='utf-8') as f:
            f.write(page(head, js, CDN))
    if args:
        test_dir = args[0]
        os.makedirs(test_dir, exist_ok=True)
        # orkestrator golf 6, 2026-10-16: de testversie is de ruwe vorm die Pages serveert, zonder eigen geraamte (doctype,
        # charset en viewport staan sinds versie 2 in head.html). Alleen het src-voorvoegsel van de vijf scripttags (three/ in
        # plaats van jsDelivr) en de versiestempel (', testversie') wijken af van index.html; de integrity-attributen zijn
        # gelijk. Zo laadt elke test via harness.build_test de echte vorm.
        with open(os.path.join(test_dir, 'index.html'), 'w', encoding='utf-8') as f:
            f.write(page(head, js, 'three/', test=True))
    print('ok', 'testversie' if test_only else f'{os.path.getsize(out)} bytes')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))

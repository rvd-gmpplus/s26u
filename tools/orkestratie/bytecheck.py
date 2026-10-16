"""Byte-vergelijking van wat gepubliceerd is met index.html in git, en de groen-poort voor publicatie.

Orkestrator golf 6, 2026-10-16. Reden: premortem punten 3 tot en met 7. Een claim 'byte gelijk' mag alleen uit dit
script komen, met een van de vastgelegde uitkomsten hieronder, en niets wordt gepubliceerd dat niet groen gemeten is.
Alleen standaardbibliotheek plus curl en gh.

    python3 tools/orkestratie/bytecheck.py bestand PAD [--ref REF]
    python3 tools/orkestratie/bytecheck.py pages [--ref main] [--wacht 900]
    python3 tools/orkestratie/bytecheck.py artifact PAD [--ref main]
    python3 tools/orkestratie/bytecheck.py groen RUNMAP [--repo PAD]
    python3 tools/orkestratie/bytecheck.py bronhash [--repo PAD]

bestand   vergelijkt de bytes van PAD met 'git show REF:index.html' (standaard REF = main). Drukt beide lengtes en beide
          sha256 af en bij verschil de eerste afwijkende offset met 40 bytes context uit beide. Exit 0 alleen bij gelijk.
          Bij bestand, pages en artifact geldt: eerst 'git fetch origin' (een mislukte fetch geeft een waarschuwing),
          zodat origin/main actueel is; is REF daarna een lokale tak met een origin/REF, dan telt origin/REF (de lokale
          tak loopt na een samenvoeging via gh achter); het script meldt welke commit het gebruikt.
pages     vraagt via 'gh api repos/rvd-gmpplus/s26u/pages/builds/latest' status en commit op en wacht (elke 15 s, tot
          --wacht seconden) tot status 'built' en commit gelijk aan de commit van REF na 'git fetch'. Is er een
          origin/REF, dan telt die (de lokale tak kan achterlopen; een verschil wordt gemeld). Daarna curl op
          https://rvd-gmpplus.github.io/s26u/?cb=<commit> (Pages geeft max-age=600; de cb-parameter omzeilt de cache)
          en vergelijken zoals 'bestand' tegen index.html van die commit. Meldt content-type en last-modified.
artifact  PAD is de bron die de Artifact-tool bij een read teruggeeft, als bestand opgeslagen. Precies twee uitkomsten
          betekenen gelijk:
            'gelijk (bron)'                   PAD is byte voor byte gelijk aan index.html van REF;
            'gelijk (na vaste verpakking)'    PAD begint exact met pubsmoke.SKELETON_HEAD en eindigt exact met
                                              pubsmoke.SKELETON_TAIL (UTF-8), en wat daartussen staat is byte voor
                                              byte gelijk aan index.html van REF.
          Elk ander verschil is ongelijk, met offset. Er is geen andere normalisatie: geen witruimte, regeleinden of
          BOM wegpoetsen. SKELETON_HEAD en SKELETON_TAIL komen uit tools/pubsmoke.py (import, geen kopie).
          De verpakking is gemeten (2026-10-16, artifact https://claude.ai/artifact/4WvFbz8L3JZLEAGLcHPC4F, versie
          1792155388-9fd0, 401.083 bytes = 531 bytes kop + 400.537 bytes index.html van edb37f2 + 15 bytes staart
          '\n</body></html>'). Wijzigt de host zijn verpakking, dan eerst opnieuw meten en pubsmoke.py aanpassen,
          nooit hier een uitzondering toevoegen.
groen     struikeldraad 5: RUNMAP is de uitmap van een volledige run (tools/orkestratie/finaltests.sh). Exit 0 alleen als
          RUNMAP/bron.txt bestaat, platform Linux noemt, vuil 'nee' zegt, de bron-sha256 erin gelijk is aan die van de
          huidige werkmap (--repo, standaard deze repo), de werkmap niet vuil is ('git status --porcelain' leeg), elke
          test uit RUNMAP/tests.txt in RUNMAP/NAAM.txt eindigt op 'exit 0 ' en de slotregel van de run 'ALLES GROEN' is.
bronhash  drukt de bron-sha256 van de werkmap af (zelfde functie als 'groen'), zodat finaltests.sh hem kan aanroepen in
          plaats van zelf te rekenen.

Gedeelde, letterlijke beschrijving van de bron-sha256 (finaltests.sh schrijft hem zo in bron.txt, dit script rekent hem
zo na; afgestemd met de bron.txt-code van finaltests.sh uit pakket P3, 2026-10-16):
  1. De bestanden, in deze volgorde: eerst elk pad dat de glob src/* oplevert (relatief aan de repowortel, geen namen
     die met een punt beginnen), bytegewijs gesorteerd (zoals Python sorted(glob.glob("src/*")) of LC_ALL=C in de
     shell); daarna build.py; daarna VERSION. Dus niet de hele lijst sorteren: build.py en VERSION staan achteraan.
  2. Per bestand de regel '<sha256 hex, kleine letters>  <pad>' (twee spaties, LF na elke regel), precies de uitvoer
     van 'sha256sum PAD' op Linux of 'shasum -a 256 PAD' op macOS, over de bytes in de werkmap.
  3. De bron-sha256 is de sha256 (hex, kleine letters) van de aaneengeschakelde regels.
  In bash:  LC_ALL=C sha256sum src/* build.py VERSION | sha256sum | cut -c1-64     (macOS: shasum -a 256)
  Of:       python3 tools/orkestratie/bytecheck.py bronhash

RUNMAP/bron.txt heeft een regel per sleutel, 'sleutel: waarde' of 'sleutel=waarde'; extra sleutels en tekst na de
hash mogen. Gelezen worden: commit, een sleutel met 'vuil' (werkmap_vuil: ja|nee), een sleutel met 'sha256'
(bron_sha256: <64 hex> (N bestanden)) en platform (Linux ... of Darwin ...).
De slotregel van de run is de laatste niet-lege regel van het eerste bestand dat bestaat uit SLOTBESTANDEN.
"""
import os, sys, re, json, glob, time, hashlib, argparse, subprocess, importlib, tempfile

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PAGES_API = 'repos/rvd-gmpplus/s26u/pages/builds/latest'
PAGES_URL = 'https://rvd-gmpplus.github.io/s26u/'
# Waar de slotregel van finaltests.sh staat: het script drukt hem af, de CI-job 'volledig' zet die uitvoer in samenvatting.txt
SLOTBESTANDEN = ('samenvatting.txt', 'slot.txt', 'finaltests.txt', 'finaltests.log', 'uitslag.txt')  # samenvatting.txt: CI-job volledig
CONTEXT = 40


def git(*args, repo=REPO, binary=False, check=True):
    r = subprocess.run(['git', '-C', repo, *args], capture_output=True, check=False)
    if check and r.returncode != 0:
        raise SystemExit(f'git {" ".join(args)} faalt: {r.stderr.decode(errors="replace").strip()}')
    return r.stdout if binary else r.stdout.decode(errors='replace')


def index_at(ref, repo=REPO):
    return git('show', f'{ref}:index.html', repo=repo, binary=True)


def sha(b):
    return hashlib.sha256(b).hexdigest()


def compare(got, want, naam_got, naam_want):
    """Drukt lengtes, sha256 en bij verschil de eerste afwijkende offset af. Geeft True bij gelijk."""
    print(f'  {naam_got:28s} {len(got):9d} bytes  sha256 {sha(got)}')
    print(f'  {naam_want:28s} {len(want):9d} bytes  sha256 {sha(want)}')
    if got == want:
        return True
    n = min(len(got), len(want))
    off = next((i for i in range(n) if got[i] != want[i]), n)
    print(f'  eerste afwijking op offset {off} (0-gebaseerd)'
          + (f'; de een is een voorvoegsel van de ander' if off == n else ''))
    lo = max(0, off - CONTEXT)
    print(f'    {naam_got}: {got[lo:off + CONTEXT]!r}')
    print(f'    {naam_want}: {want[lo:off + CONTEXT]!r}')
    return False


def cmd_bestand(a):
    got = open(a.pad, 'rb').read()
    c = resolve_ref(a.ref, fetch=True)
    want = index_at(c)
    ok = compare(got, want, a.pad, f'{a.ref} ({c[:7]}):index.html')
    print('gelijk' if ok else 'ONGELIJK')
    return 0 if ok else 1


def resolve_ref(ref, fetch=False):
    """Commit van REF. Is REF een lokale tak met een origin/REF, dan telt origin/REF (de lokale tak loopt na een
    samenvoeging via gh achter); een verschil wordt gemeld. Met fetch eerst 'git fetch origin'."""
    if fetch:
        r = subprocess.run(['git', '-C', REPO, 'fetch', '--quiet', 'origin'], capture_output=True, text=True)
        if r.returncode != 0:
            print(f'  waarschuwing: git fetch faalt: {r.stderr.strip()}')
    local = git('rev-parse', '--verify', '--quiet', f'{ref}^{{commit}}', check=False).strip()
    branch = git('rev-parse', '--verify', '--quiet', f'refs/heads/{ref}', check=False).strip()
    remote = git('rev-parse', '--verify', '--quiet', f'refs/remotes/origin/{ref}^{{commit}}', check=False).strip() if branch else ''
    if remote and local and remote != local:
        print(f'  let op: lokale {ref} ({local[:7]}) wijkt af van origin/{ref} ({remote[:7]}); origin/{ref} telt')
    commit = remote or local
    if not commit:
        raise SystemExit(f'ref {ref} niet gevonden')
    return commit


def cmd_pages(a):
    commit = resolve_ref(a.ref, fetch=True)
    print(f'verwachte commit: {commit}')
    t0 = time.time()
    while True:
        r = subprocess.run(['gh', 'api', PAGES_API], capture_output=True, text=True)
        if r.returncode != 0:
            print(f'NETWERKFOUT: gh api {PAGES_API} faalt: {(r.stderr or r.stdout).strip()[:300]}')
            return 2
        info = json.loads(r.stdout)
        st, bc = info.get('status'), info.get('commit') or ''
        print(f'  Pages-build: status {st}, commit {bc[:12]}, bijgewerkt {info.get("updated_at")} ({int(time.time() - t0)} s)')
        if st == 'built' and bc == commit:
            break
        if st == 'errored':
            print(f'Pages-build faalt: {info.get("error")}')
            return 1
        if time.time() - t0 + 15 > a.wacht:
            print(f'TIJDSLIMIET: na {a.wacht} s geen build met status built voor {commit[:12]}')
            return 1
        time.sleep(15)
    url = f'{PAGES_URL}?cb={commit}'
    fd, hdr = tempfile.mkstemp(prefix='s26u-bytecheck-', suffix='.txt'); os.close(fd)
    r = subprocess.run(['curl', '-sS', '-L', '--max-time', '60', '-D', hdr, '-o', '-', '-w', '\n%{http_code}', url], capture_output=True)
    if r.returncode != 0:
        print(f'NETWERKFOUT: curl {url} faalt: {r.stderr.decode(errors="replace").strip()}')
        return 2
    body, _, code = r.stdout.rpartition(b'\n')
    print(f'  {url}: HTTP {code.decode()}')
    heads = open(hdr, 'rb').read().decode('latin-1').splitlines()
    os.unlink(hdr)
    for h in heads:
        if h.lower().startswith(('content-type:', 'last-modified:', 'cache-control:', 'age:')):
            print(f'    {h.strip()}')
    if code != b'200':
        print('ONGELIJK (geen HTTP 200)')
        return 1
    ok = compare(body, index_at(commit), 'Pages', f'{commit[:7]}:index.html')
    print('gelijk' if ok else 'ONGELIJK')
    return 0 if ok else 1


def skeleton():
    sys.path.insert(0, os.path.join(REPO, 'tools'))
    ps = importlib.import_module('pubsmoke')
    return ps.SKELETON_HEAD.encode('utf-8'), ps.SKELETON_TAIL.encode('utf-8')


def cmd_artifact(a):
    got = open(a.pad, 'rb').read()
    c = resolve_ref(a.ref, fetch=True)
    want = index_at(c)
    name = f'{a.ref} ({c[:7]}):index.html'
    if got == want:
        compare(got, want, a.pad, name)
        print('gelijk (bron)')
        return 0
    head, tail = skeleton()
    if got.startswith(head) and got.endswith(tail) and len(got) >= len(head) + len(tail):
        inner = got[len(head):len(got) - len(tail)]
        print(f'  vaste verpakking gevonden: {len(head)} bytes kop en {len(tail)} bytes staart afgehaald')
        ok = compare(inner, want, f'{a.pad} (zonder verpakking)', name)
        if ok:
            print('gelijk (na vaste verpakking)')
            return 0
        print(f'  (offset hierboven telt vanaf het einde van de kop; in het bestand: +{len(head)})')
        print('ONGELIJK')
        return 1
    compare(got, want, a.pad, name)
    print(f'  geen exacte vaste verpakking: begint met SKELETON_HEAD {got.startswith(head)}, eindigt met SKELETON_TAIL {got.endswith(tail)}')
    print('ONGELIJK')
    return 1


def bron_files(repo):
    """src/* bytegewijs gesorteerd, dan build.py, dan VERSION (zie de gedeelde beschrijving in de docstring)."""
    src = sorted((os.path.relpath(p, repo) for p in glob.glob(os.path.join(glob.escape(repo), 'src', '*'))), key=lambda s: s.encode('utf-8'))
    return [p for p in src if os.path.isfile(os.path.join(repo, p))] + ['build.py', 'VERSION']


def bron_sha256(repo):
    lines = ''.join(f'{sha(open(os.path.join(repo, p), "rb").read())}  {p}\n' for p in bron_files(repo))
    return sha(lines.encode('utf-8'))


def cmd_bronhash(a):
    print(bron_sha256(os.path.abspath(a.repo)))
    return 0


def read_bron(path):
    kv = {}
    for line in open(path, encoding='utf-8', errors='replace'):
        m = re.match(r'\s*([A-Za-z0-9_ -]+?)\s*[:=]\s*(.*?)\s*$', line)
        if m:
            kv[m.group(1).lower().replace('_', '-').replace(' ', '-')] = m.group(2)
    return kv


def pick(kv, *needles):
    for k, v in kv.items():
        if any(n in k for n in needles):
            return v
    return None


def cmd_groen(a):
    repo, run = os.path.abspath(a.repo), os.path.abspath(a.runmap)
    fouten = []
    bp = os.path.join(run, 'bron.txt')
    if not os.path.isfile(bp):
        print(f'NIET GROEN: {bp} ontbreekt')
        return 1
    kv = read_bron(bp)
    m = re.search(r'\b[0-9a-f]{64}\b', (pick(kv, 'sha256', 'sha-256', 'bron-sha') or '').lower())
    want = m.group() if m else ''
    plat = pick(kv, 'platform') or ''
    vuil = (pick(kv, 'vuil', 'dirty') or '').lower()
    cm = pick(kv, 'commit') or ''
    have = bron_sha256(repo)
    head = git('rev-parse', 'HEAD', repo=repo, check=False).strip()
    print(f'  run:     commit {cm[:12] or "?"}, platform {plat or "?"}, vuil {vuil or "?"}, bron-sha256 {want or "?"}')
    print(f'  werkmap: commit {head[:12]}, bron-sha256 {have}')
    if not re.fullmatch(r'[0-9a-f]{64}', want):
        fouten.append('bron.txt heeft geen bron-sha256 (64 hextekens)')
    elif want != have:
        fouten.append('bron-sha256 van de run wijkt af van de werkmap (src/*, build.py of VERSION gewijzigd na de run)')
    if 'linux' not in plat.lower():
        fouten.append(f'platform van de run is geen Linux: {plat or "onbekend"}')
    if vuil not in ('nee', '0', 'false', 'schoon', 'no'):
        fouten.append(f'de run draaide op een vuile of onbekende werkmap (vuil: {vuil or "ontbreekt"})')
    st = git('status', '--porcelain', repo=repo, check=False)
    if st.strip():
        fouten.append(f'werkmap is vuil ({len(st.splitlines())} regels in git status --porcelain)')
    if cm and head and not head.startswith(cm) and not cm.startswith(head):
        print(f'  let op: commit van de run ({cm[:12]}) is niet HEAD ({head[:12]}); de bron-sha256 beslist')
    tp = os.path.join(run, 'tests.txt')
    if not os.path.isfile(tp):
        fouten.append('tests.txt ontbreekt')
    else:
        for t in open(tp).read().split():
            f = os.path.join(run, f'{t}.txt')
            last = open(f, errors='replace').read().rstrip('\n').rsplit('\n', 1)[-1] if os.path.isfile(f) else '(ontbreekt)'
            if not last.startswith('exit 0 '):
                fouten.append(f'test {t}: slotregel {last!r}')
    slot = next((os.path.join(run, s) for s in SLOTBESTANDEN if os.path.isfile(os.path.join(run, s))), None)
    if not slot:
        fouten.append(f'geen slotregel gevonden (verwacht in een van: {", ".join(SLOTBESTANDEN)})')
    else:
        lines = [l.strip() for l in open(slot, errors='replace').read().splitlines() if l.strip()]
        last = lines[-1] if lines else ''
        print(f'  slotregel ({os.path.basename(slot)}): {last!r}')
        if last != 'ALLES GROEN':
            fouten.append(f'slotregel is niet ALLES GROEN: {last!r}')
    for f in fouten:
        print(f'  FOUT: {f}')
    print('GROEN: publiceren mag' if not fouten else 'NIET GROEN: niet publiceren')
    return 0 if not fouten else 1


def main():
    ap = argparse.ArgumentParser(description='Byte-vergelijking en groen-poort voor publicatie (zie docstring).')
    sub = ap.add_subparsers(dest='cmd', required=True)
    p = sub.add_parser('bestand'); p.add_argument('pad'); p.add_argument('--ref', default='main'); p.set_defaults(f=cmd_bestand)
    p = sub.add_parser('pages'); p.add_argument('--ref', default='main'); p.add_argument('--wacht', type=int, default=900); p.set_defaults(f=cmd_pages)
    p = sub.add_parser('artifact'); p.add_argument('pad'); p.add_argument('--ref', default='main'); p.set_defaults(f=cmd_artifact)
    p = sub.add_parser('groen'); p.add_argument('runmap'); p.add_argument('--repo', default=REPO); p.set_defaults(f=cmd_groen)
    p = sub.add_parser('bronhash'); p.add_argument('--repo', default=REPO); p.set_defaults(f=cmd_bronhash)
    a = ap.parse_args()
    return a.f(a)


if __name__ == '__main__':
    sys.exit(main())

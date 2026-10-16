"""Verwijzingen naar repobestanden die niet bestaan, en (met --geheim) een scan op IMEI en serienummers.

Orkestrator golf 6, 2026-10-16. Reden: premortem punten 4 en 6. Een doc of script dat naar een ontbrekend bestand
verwijst valt pas op bij de lezer, en een IMEI of serienummer van de gebruiker mag nooit in de repo of een commitbericht.
Alleen standaardbibliotheek plus git.

    python3 tools/orkestratie/verwijzingen.py [--repo PAD] [--ref REF]
    python3 tools/orkestratie/verwijzingen.py --geheim [--repo PAD] [--ref REF] [--basis main]

Bestanden: 'git ls-files --cached --others --exclude-standard' (dus ook nieuwe, nog niet toegevoegde bestanden), alleen
tekst, zonder docs/baseline/, docs/screenshots/, data/ en index.html (die volgt uit src/). Met --ref REF de vastgelegde
boom van REF ('git ls-tree -r REF'), zodat de uitkomst niet afhangt van wat andere agents in de werkmap doen.
Verwijzingen: paden met een voorvoegsel tools/, docs/, src/, data/ of .github/ (een glob als src/*.js telt als gevonden als
hij iets treft; een map telt als hij bestanden bevat) en losse namen op .py, .md, .js, .json, .sh, .csv of .yml. Een
losse naam telt als gevonden als een bestand met die naam ergens in de repo staat. URL's worden eerst weggehaald.
Exit 1 bij een of meer ontbrekende bestanden, met bestand en regelnummer.

--geheim zoekt in dezelfde bestanden en in de berichten van 'git log BASIS..HEAD' naar reeksen van precies 15 cijfers
die de Luhn-controle halen (IMEI) en naar Samsung-serienummers (R gevolgd door 10 hoofdletters of cijfers, als los
woord, met minstens een cijfer). Een treffer toont alleen bestand, regel en de laatste 4 tekens. GH82-servicenummers
passen op geen van beide patronen. Exit 1 bij een of meer treffers.
"""
import os, re, sys, argparse, subprocess, fnmatch

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OVERSLAAN = ('docs/baseline/', 'docs/screenshots/', 'data/')
OVERSLAAN_BESTAND = ('index.html',)
EXT = ('py', 'md', 'js', 'json', 'sh', 'csv', 'yml')
VOORVOEGSEL = ('tools', 'docs', 'src', 'data', '.github')

# Bewuste uitzonderingen: losse namen die geen bestand van deze repo bedoelen. Elk met reden.
UITZONDERINGEN = {
    'three.js': 'naam van de bibliotheek, geen bestand',
    'three.min.js': 'bestand in het npm-pakket three@0.147.0 (THREE_DIR, ~/.cache), niet in de repo',
    'systems.js': 'bestand uit laguna3, genoemd als herkomst in commentaar van src/app2.js',
    'anchorcheck.py': 'script uit laguna3, bewust niet overgenomen (docs/masterplan.md)',
    'samengevoegd.js': 'tijdelijke naam in een foutmelding van build.py --lint',
    'head-inline.js': 'tijdelijke naam in een foutmelding van build.py --lint',
    # uitvoer van een testrun in de uitmap (finaltests.sh, Actions-pakket), geen repobestand
    'stats.json': 'uitvoer van tools/orkestratie/stats.py in de uitmap',
    'tri.json': 'uitvoer van tools/tri.py --json in de uitmap',
    'opentest.json': 'uitvoer van tools/opentest.py in de uitmap',
    'visdiff.json': 'uitvoer van tools/visdiff.py in de uitmap',
    'UIT.json': 'voorbeeldnaam voor een uitvoerbestand in een gebruiksregel',
    'a.json': 'variabele a.json (argparse) in tools/opentest.py en tools/tri.py, geen bestandsnaam',
}
# Paden met een voorvoegsel die bewust niet bestaan. Glob op het pad, elk met reden.
UITZONDERING_PADEN = {
    'tools/anchorcheck.py': 'script uit laguna3, bewust niet overgenomen (docs/masterplan.md)',
}

URL = re.compile(r'(?:https?|file)://\S+')
# extern pad: ~/... of een absoluut pad; die worden weggehaald zodat een deel ervan niet als repopad telt
EXTERN = re.compile(r'(?<![\w.-])(?:~|/(?:opt|tmp|usr|etc|home|Users|var|private))(?:/[\w.@+*%-]+)+/?')
PAD = re.compile(r'(?<![\w./~-])(?:\./)?((?:%s)/[\w.*/@+-]*)' % '|'.join(re.escape(v) for v in VOORVOEGSEL))
LOS = re.compile(r'(?<![\w./~@-])([\w*][\w.*-]*\.(?:%s))(?![\w-])(?!\()' % '|'.join(EXT))


REF = None  # met --ref REF: de vastgelegde boom van REF in plaats van de werkmap


def lsfiles(repo):
    if REF:
        cmd = ['git', '-C', repo, 'ls-tree', '-r', '-z', '--name-only', REF]
    else:
        cmd = ['git', '-C', repo, 'ls-files', '-z', '--cached', '--others', '--exclude-standard']
    out = subprocess.run(cmd, capture_output=True, check=True).stdout.decode('utf-8', 'replace')
    return sorted({f for f in out.split('\0') if f and (REF or os.path.isfile(os.path.join(repo, f)))})


def lees(repo, f):
    if REF:
        return subprocess.run(['git', '-C', repo, 'show', f'{REF}:{f}'], capture_output=True, check=True).stdout
    return open(os.path.join(repo, f), 'rb').read()


def tekstbestanden(repo, files, alles=False):
    for f in files:
        if not alles and (f.startswith(OVERSLAAN) or f in OVERSLAAN_BESTAND):
            continue
        b = lees(repo, f)
        if b'\0' in b[:8192]:
            continue
        try:
            yield f, b.decode('utf-8')
        except UnicodeDecodeError:
            continue


def bestaat_pad(p, files, dirs):
    p = p.rstrip('/').rstrip('.,:;')
    if not p or p in VOORVOEGSEL:
        return True
    if any(fnmatch.fnmatch(p, g) for g in UITZONDERING_PADEN):
        return True
    if any(c in p for c in '*?['):
        return any(fnmatch.fnmatch(f, p) for f in files)
    return p in files or p in dirs


def scan_verwijzingen(repo):
    files = lsfiles(repo)
    fset = set(files)
    dirs = {os.path.dirname(f) for f in files}
    dirs |= {d for x in list(dirs) for d in (x.split('/')[0],) if d}
    for f in files:
        parts = f.split('/')
        for i in range(1, len(parts)):
            dirs.add('/'.join(parts[:i]))
    namen = {os.path.basename(f) for f in files}
    mis = []
    for f, txt in tekstbestanden(repo, files):
        for n, line in enumerate(txt.splitlines(), 1):
            s = EXTERN.sub(' ', URL.sub(' ', line))
            gezien = set()
            for m in PAD.finditer(s):
                p = m.group(1).rstrip('.,:;)')
                gezien.add(m.span())
                if not bestaat_pad(p, fset, dirs):
                    mis.append((f, n, p))
            for m in LOS.finditer(s):
                if any(a <= m.start() < b for a, b in gezien):
                    continue
                naam = m.group(1)
                if naam in UITZONDERINGEN:
                    continue
                if any(c in naam for c in '*?['):
                    if not any(fnmatch.fnmatch(x, naam) for x in namen):
                        mis.append((f, n, naam))
                elif naam not in namen:
                    mis.append((f, n, naam))
    return mis


def luhn(d):
    tot = 0
    for i, c in enumerate(reversed(d)):
        k = int(c)
        if i % 2:
            k *= 2
            if k > 9:
                k -= 9
        tot += k
    return tot % 10 == 0


IMEI = re.compile(r'(?<!\d)\d{15}(?!\d)')
SERIE = re.compile(r'\bR[A-Z0-9]{10}\b')


def geheim_in(txt):
    for n, line in enumerate(txt.splitlines(), 1):
        for m in IMEI.finditer(line):
            if luhn(m.group()):
                yield n, 'IMEI (15 cijfers, Luhn klopt)', m.group()[-4:]
        for m in SERIE.finditer(line):
            # minstens een cijfer: anders zijn het woorden in hoofdletters (bijvoorbeeld een constante), geen serienummer
            if any(c.isdigit() for c in m.group()):
                yield n, 'serienummer (R plus 10 tekens)', m.group()[-4:]


def scan_geheim(repo, basis):
    hits = []
    for f, txt in tekstbestanden(repo, lsfiles(repo), alles=True):
        hits += [(f, n, soort, eind) for n, soort, eind in geheim_in(txt)]
    ref = basis
    ok = subprocess.run(['git', '-C', repo, 'rev-parse', '--verify', '--quiet', basis], capture_output=True).returncode == 0
    if not ok and '/' not in basis:
        ref = f'origin/{basis}'
        ok = subprocess.run(['git', '-C', repo, 'rev-parse', '--verify', '--quiet', ref], capture_output=True).returncode == 0
    if not ok:
        print(f'  waarschuwing: basis {basis} niet gevonden; commitberichten niet gescand')
    else:
        log = subprocess.run(['git', '-C', repo, 'log', '--format=%x00%h%n%B', f'{ref}..HEAD'], capture_output=True, check=True).stdout.decode('utf-8', 'replace')
        aantal = 0
        for blok in log.split('\0'):
            if not blok.strip():
                continue
            aantal += 1
            h, _, msg = blok.partition('\n')
            hits += [(f'commitbericht {h}', n, soort, eind) for n, soort, eind in geheim_in(msg)]
        print(f'  {aantal} commitberichten gescand ({ref}..HEAD)')
    return hits


def main():
    ap = argparse.ArgumentParser(description='Ontbrekende verwijzingen en geheimscan (zie docstring).')
    ap.add_argument('--repo', default=REPO)
    ap.add_argument('--geheim', action='store_true')
    ap.add_argument('--basis', default='main')
    ap.add_argument('--ref', default=None, help='scan de vastgelegde boom van REF (bijvoorbeeld HEAD) in plaats van de werkmap')
    a = ap.parse_args()
    global REF
    REF = a.ref
    repo = os.path.abspath(a.repo)
    if a.geheim:
        hits = scan_geheim(repo, a.basis)
        for f, n, soort, eind in hits:
            print(f'  TREFFER {f}:{n}: {soort}, eindigt op ...{eind}')
        print(f'geheimscan: {len(hits)} treffers')
        return 1 if hits else 0
    mis = scan_verwijzingen(repo)
    for f, n, p in mis:
        print(f'  ONTBREEKT {f}:{n}: {p}')
    print(f'verwijzingen: {len(mis)} naar ontbrekende bestanden ({len({p for _, _, p in mis})} verschillende)')
    return 1 if mis else 0


if __name__ == '__main__':
    sys.exit(main())

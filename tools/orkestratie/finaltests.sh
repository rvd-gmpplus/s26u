#!/bin/bash
# Volledige testset op de werktak, uitvoer naar $1 (map). Draait in twee parallelle reeksen, strikt (ui_inner --strict,
# opentest --strikt-min, itest met poorten, tri --gate). Exitcode 1 zodra een test faalt; per test de duur in seconden.
# Gebruik: tools/orkestratie/finaltests.sh UITVOERMAP
# Platform (orkestrator golf 6, 2026-10-16; premortem 1 en 5): de basislijn in docs/baseline komt uit Linux. Op macOS wijkt
# de tekst af (CoreText tegen FreeType), dus daar draait visdiff wel en blijft de uitvoer bewaard, maar de status is
# 'platform, niet beoordeeld' en telt nooit als ok of FOUT. Op Linux beoordeelt visdiff zoals altijd; er is geen
# omgevingsvariabele om dat over te slaan. De beoordelende volledige set draait op Linux in CI (job 'volledig').
set -u
if [ $# -lt 1 ] || [ -z "$1" ]; then echo "gebruik: $0 UITVOERMAP" >&2; exit 2; fi
OUT="$(mkdir -p "$1" && cd "$1" && pwd)" || exit 2
R="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$R" || exit 1
# Vaste lijst: CI vergelijkt deze namen met de verwachting, zodat een test niet stil uit de set kan vallen.
TESTS="lint smoke integ sil overlap inner opentest itest tri pub stats shots visdiff"
git log --oneline -1 > "$OUT/commit.txt"
date -u +"%Y-%m-%dT%H:%M:%SZ" > "$OUT/start.txt"
# Platform via het vaste pad van uname, zodat een andere PATH de beoordeling niet kan omzetten (orkestrator golf 6, 2026-10-16)
PLATFORM="$(/usr/bin/uname -s 2>/dev/null || uname -s)"

# bron.txt: welke bron deze run testte (orkestrator golf 6, 2026-10-16). bron_sha256 is de sha256 over de regels
# "<sha256>  <pad>" van src/* (bytevolgorde), build.py en VERSION, dus gelijk aan
# LC_ALL=C sha256sum src/* build.py VERSION | sha256sum   (macOS: shasum -a 256 in plaats van sha256sum).
{
  echo "commit: $(git rev-parse HEAD 2>/dev/null || echo onbekend)"
  vuil="$(git status --porcelain src build.py VERSION tools 2>/dev/null)"
  if [ -n "$vuil" ]; then echo "werkmap_vuil: ja"; echo "$vuil" | sed 's/^/  /'; else echo "werkmap_vuil: nee"; fi
  echo "bron_sha256: $(python3 -c '
import glob, hashlib
paden = sorted(glob.glob("src/*")) + ["build.py", "VERSION"]
regels = "".join(hashlib.sha256(open(p, "rb").read()).hexdigest() + "  " + p + "\n" for p in paden)
print(hashlib.sha256(regels.encode()).hexdigest() + " (" + str(len(paden)) + " bestanden)")
' 2>&1)"
  echo "platform: $(/usr/bin/uname -sm 2>/dev/null || uname -sm)"
} > "$OUT/bron.txt"
# renderer.txt: welke WebGL-renderer de testbrowser gebruikt. Geen test, telt niet mee in de uitslag.
if [ -f tools/orkestratie/renderer.py ]; then
  python3 tools/orkestratie/renderer.py --json "$OUT/renderer.json" > "$OUT/renderer.txt" 2>&1
  echo "exit $? (geen test, telt niet mee)" >> "$OUT/renderer.txt"
fi

run() { # run NAAM COMMANDO...  : uitvoer naar NAAM.txt, laatste regel "exit N (Ns)"
  local name="$1"; shift
  local t0; t0=$(date +%s)
  "$@" > "$OUT/$name.txt" 2>&1
  local rc=$?
  echo "exit $rc ($(( $(date +%s) - t0 ))s)" >> "$OUT/$name.txt"
}

run lint python3 build.py --lint
( run smoke python3 tools/smoke.py
  run integ python3 tools/integrity.py
  run sil python3 tools/silhouette.py
  run inner python3 tools/ui_inner.py --open --strict
  run opentest python3 tools/opentest.py --strikt-min --out "$OUT/opentest" ) &
( run overlap python3 tools/overlap.py
  run itest python3 tools/itest.py
  run tri python3 tools/tri.py --gate --json "$OUT/tri.json"
  run pub python3 tools/pubsmoke.py
  run stats python3 tools/orkestratie/stats.py "$R" "$OUT/stats.json"
  run shots python3 tools/orkestratie/presetshots.py "$R" "$OUT/presets"
  run visdiff python3 tools/visdiff.py "$OUT/presets" docs/baseline --uit "$OUT/visdiff" ) &
wait
date -u +"%Y-%m-%dT%H:%M:%SZ" > "$OUT/einde.txt"
fail=0; beoordeeld=0; groen=0
for f in $TESTS; do
  last="$(tail -n 1 "$OUT/$f.txt")"
  if [ "$PLATFORM" = Darwin ] && [ "$f" = visdiff ]; then
    st="platform, niet beoordeeld"  # macOS: uitvoer bewaard, telt niet als ok of FOUT (zie kop)
  else
    beoordeeld=$((beoordeeld + 1))
    case "$last" in "exit 0 "*) st=ok; groen=$((groen + 1)) ;; *) st=FOUT; fail=1 ;; esac
  fi
  echo "== $f: $st ($last) $(tail -n 3 "$OUT/$f.txt" | head -n 2 | tr '\n' ' ' | cut -c1-200)"
done
echo "$TESTS" > "$OUT/tests.txt"
if [ "$PLATFORM" = Darwin ]; then
  echo "macOS: $groen van $beoordeeld beoordeelde tests groen (visdiff: platform, niet beoordeeld)"
  [ $fail -eq 0 ] || echo "RODE TESTS, zie $OUT"
else
  [ $fail -eq 0 ] && echo "ALLES GROEN" || echo "RODE TESTS, zie $OUT"
fi
exit $fail

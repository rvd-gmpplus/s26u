#!/bin/bash
# Volledige testset op de werktak, uitvoer naar $1 (map). Draait in twee parallelle reeksen, strikt (ui_inner --strict,
# opentest --strikt-min, itest met poorten, tri --gate). Exitcode 1 zodra een test faalt; per test de duur in seconden.
# Gebruik: tools/orkestratie/finaltests.sh UITVOERMAP
set -u
if [ $# -lt 1 ] || [ -z "$1" ]; then echo "gebruik: $0 UITVOERMAP" >&2; exit 2; fi
OUT="$(mkdir -p "$1" && cd "$1" && pwd)" || exit 2
R="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$R" || exit 1
# Vaste lijst: CI vergelijkt deze namen met de verwachting, zodat een test niet stil uit de set kan vallen.
# Komen nog: itest (golf 4, interactie op echte onderdelen), shots, visdiff en anchor (golf 6, baselines). Zie docs/testen.md.
TESTS="lint smoke integ sil overlap inner opentest tri pub stats"
git log --oneline -1 > "$OUT/commit.txt"
date -u +"%Y-%m-%dT%H:%M:%SZ" > "$OUT/start.txt"

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
  run tri python3 tools/tri.py --gate --json "$OUT/tri.json"
  run pub python3 tools/pubsmoke.py
  run stats python3 tools/orkestratie/stats.py "$R" "$OUT/stats.json" ) &
wait
date -u +"%Y-%m-%dT%H:%M:%SZ" > "$OUT/einde.txt"
fail=0
for f in $TESTS; do
  last="$(tail -n 1 "$OUT/$f.txt")"
  case "$last" in "exit 0 "*) st=ok ;; *) st=FOUT; fail=1 ;; esac
  echo "== $f: $st ($last) $(tail -n 3 "$OUT/$f.txt" | head -n 2 | tr '\n' ' ' | cut -c1-200)"
done
echo "$TESTS" > "$OUT/tests.txt"
[ $fail -eq 0 ] && echo "ALLES GROEN" || echo "RODE TESTS, zie $OUT"
exit $fail

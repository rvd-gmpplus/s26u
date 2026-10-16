#!/bin/bash
# Volledige strikte set in een Linux-VM op de Mac (Apple `container`, Ubuntu 24.04 op amd64 via Rosetta), zo dicht mogelijk
# bij de Actions-runner `ubuntu-latest`. Gemeten op 2026-10-16: visdiff 0,00 procent op alle 27 beelden tegen de basislijn
# uit Actions, dus deze run beoordeelt ook visdiff. Het oordeel voor publiceren blijft de Actions-job `volledig`.
# Gebruik: tools/linux/vmtests.sh UITVOERMAP [REF]   (REF standaard de huidige tak; getest wordt een schone clone van REF)
# Eenmalig: brew install container && container system start --enable-kernel-install
set -euo pipefail
if [ $# -lt 1 ]; then echo "gebruik: $0 UITVOERMAP [REF]" >&2; exit 2; fi
OUT="$(mkdir -p "$1" && cd "$1" && pwd)"
R="$(cd "$(dirname "$0")/../.." && pwd)"
REF="${2:-$(git -C "$R" rev-parse --abbrev-ref HEAD)}"
IMG=s26u-linux:1
command -v container >/dev/null || { echo "Apple container ontbreekt: brew install container" >&2; exit 2; }
container system status >/dev/null 2>&1 || container system start --enable-kernel-install
container image inspect "$IMG" >/dev/null 2>&1 || container build --arch amd64 -t "$IMG" -f "$R/tools/linux/Containerfile" "$R"
SRC="$(mktemp -d /tmp/s26u-vm.XXXXXX)"
trap 'rm -rf "$SRC"' EXIT
git clone -q --no-hardlinks "$R" "$SRC/repo"
git -C "$SRC/repo" checkout -q "$REF"
echo "Linux-VM: $(git -C "$SRC/repo" log --oneline -1) -> $OUT"
container run --rm --arch amd64 --cpus 8 --memory 12g -v "$SRC/repo:/repo" -v "$OUT:/out" "$IMG" \
  bash -c 'python3 tools/harness.py --ensure-three >/dev/null && tools/orkestratie/finaltests.sh /out/run'

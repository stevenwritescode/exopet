#!/bin/bash
# HAT pre-order gate: regenerates everything from source and runs every
# check. HARD-FAILS on any gate. All green before uploading fab/ to JLC.
set -e
cd "$(dirname "$0")"
ROOT="$(cd ..; pwd)"
V="${1:-std}"
export HAT_VARIANT="$V"
B="../exopet-hat-$V.kicad_pcb"
S="../exopet-hat-$V.kicad_sch"
echo "══ VARIANT: $V ══"
PY="/Applications/KiCad/KiCad.app/Contents/Frameworks/Python.framework/Versions/3.9/Resources/Python.app/Contents/MacOS/Python"
KCLI="/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli"
JAVA="/opt/homebrew/opt/openjdk/bin/java"
FR="/tmp/freerouting.jar"

gate() {  # gate <name> <required-substring> <<< "output"
  local out; out="$(cat)"
  echo "$out" | tail -2
  if ! grep -q "$2" <<< "$out"; then
    echo "✗ GATE FAILED: $1 (wanted: $2)"; exit 1
  fi
}

echo "── 1. schematic ──"
python3 gen_schematic.py "$V" >/dev/null
"$KCLI" sch export netlist --format kicadxml -o "../exopet-hat-$V.net.xml" "$S" 2>/dev/null
cp "../exopet-hat-$V.net.xml" /tmp/hat-netlist.xml
python3 check_polarity.py | gate polarity "POLARITY: ALL CORRECT"

echo "── 2. board ──"
python3 gen_board.py "$V" >/dev/null
"$PY" flip_backs.py "$B" 2>/dev/null | gate flip "flipped to back"
"$PY" check_placement.py "$B" 2>/dev/null | gate placement "PLACEMENT: CLEAN"
"$PY" verify_j3.py "$B" 2>/dev/null | gate j3 "matches official HAT template"

echo "── 3. route ──"
"$PY" export_dsn.py "$B" /tmp/hat.dsn 2>/dev/null | gate dsn "DSN export: True"
"$JAVA" -jar "$FR" -de /tmp/hat.dsn -do /tmp/hat.ses -mp 50 -dr 2>&1 | gate route "Saving"
"$PY" finish_board.py "$B" /tmp/hat.ses 2>/dev/null | gate finish "filled + saved"
"$KCLI" pcb drc --severity-error --format json -o /tmp/hat-drc.json "$B" 2>/dev/null >/dev/null
"$PY" check_drc_sanity.py "$B" /tmp/hat-drc.json 2>/dev/null | gate drc "DRC: CLEAN"

echo "── 4. golden audit (netlist + copper) ──"
"$PY" check_golden.py "$B" 2>/dev/null | gate golden "GOLDEN: PASS"

echo "── 5. fab package ──"
"$KCLI" pcb export pos -o "../fab/$V/positions-raw.csv" --format csv --units mm --side both "$B" 2>/dev/null
mkdir -p "../fab/$V"; python3 gen_fab.py "$V" | head -2
"$PY" check_fab.py 2>/dev/null | gate fab "FAB: PASS"
rm -rf /tmp/gerb-pf && mkdir -p /tmp/gerb-pf
"$KCLI" pcb export gerbers -o /tmp/gerb-pf/ "$B" 2>/dev/null >/dev/null
"$KCLI" pcb export drill -o /tmp/gerb-pf/ "$B" 2>/dev/null >/dev/null
(cd /tmp/gerb-pf && zip -q -r "$ROOT/fab/$V/exopet-hat-gerbers.zip" .)
"$KCLI" pcb render --side top --width 1400 --height 1200 -o "../exopet-hat-$V-board-top.png" "$B" 2>/dev/null >/dev/null
"$KCLI" pcb render --side bottom --width 1400 --height 1200 -o "../exopet-hat-$V-board-bottom.png" "$B" 2>/dev/null >/dev/null
echo "── ✓ ALL GATES GREEN: review renders + JLC placement preview, then order ──"

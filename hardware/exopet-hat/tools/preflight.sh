#!/bin/bash
# HAT pre-order gate: regenerates everything from source and runs every
# check. ALL gates must pass before uploading fab/ to JLCPCB.
set -e
cd "$(dirname "$0")"
ROOT="$(cd ..; pwd)"
PY="/Applications/KiCad/KiCad.app/Contents/Frameworks/Python.framework/Versions/3.9/Resources/Python.app/Contents/MacOS/Python"
KCLI="/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli"
JAVA="/opt/homebrew/opt/openjdk/bin/java"
FR="/tmp/freerouting.jar"

echo "── 1. schematic ──"
python3 gen_schematic.py
"$KCLI" sch erc ../exopet-hat.kicad_sch 2>/dev/null | grep Found
"$KCLI" sch export netlist --format kicadxml -o ../exopet-hat.net.xml ../exopet-hat.kicad_sch 2>/dev/null
cp ../exopet-hat.net.xml /tmp/hat-netlist.xml
python3 check_polarity.py | tail -1

echo "── 2. board ──"
python3 gen_board.py
"$PY" flip_backs.py ../exopet-hat.kicad_pcb 2>/dev/null | grep flipped
"$PY" check_placement.py ../exopet-hat.kicad_pcb 2>/dev/null | tail -1
"$PY" verify_j3.py ../exopet-hat.kicad_pcb 2>/dev/null | tail -1

echo "── 3. route ──"
"$PY" export_dsn.py ../exopet-hat.kicad_pcb /tmp/hat.dsn 2>/dev/null | grep export
"$JAVA" -jar "$FR" -de /tmp/hat.dsn -do /tmp/hat.ses -mp 50 -dr 2>&1 | grep -c "was completed" 
"$PY" finish_board.py ../exopet-hat.kicad_pcb /tmp/hat.ses 2>/dev/null | tail -1
"$KCLI" pcb drc --severity-error ../exopet-hat.kicad_pcb 2>/dev/null | grep Found

echo "── 4. golden audit (netlist + copper) ──"
"$PY" check_golden.py ../exopet-hat.kicad_pcb 2>/dev/null | tail -1

echo "── 5. fab package ──"
"$KCLI" pcb export pos -o ../fab/positions-raw.csv --format csv --units mm --side both ../exopet-hat.kicad_pcb 2>/dev/null
python3 gen_fab.py | head -2
"$PY" check_fab.py 2>/dev/null | tail -1
rm -rf /tmp/gerb-pf && mkdir -p /tmp/gerb-pf
"$KCLI" pcb export gerbers -o /tmp/gerb-pf/ ../exopet-hat.kicad_pcb 2>/dev/null >/dev/null
"$KCLI" pcb export drill -o /tmp/gerb-pf/ ../exopet-hat.kicad_pcb 2>/dev/null >/dev/null
(cd /tmp/gerb-pf && zip -q -r "$ROOT/fab/exopet-hat-gerbers.zip" .)
"$KCLI" pcb render --side top --width 1400 --height 1200 -o ../exopet-hat-board-top.png ../exopet-hat.kicad_pcb 2>/dev/null >/dev/null
"$KCLI" pcb render --side bottom --width 1400 --height 1200 -o ../exopet-hat-board-bottom.png ../exopet-hat.kicad_pcb 2>/dev/null >/dev/null
echo "── PREFLIGHT COMPLETE: review renders, then order ──"

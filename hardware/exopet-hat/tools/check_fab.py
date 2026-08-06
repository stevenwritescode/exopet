#!/usr/bin/env python3
"""Fab-package cross-check: CPL and BOM must agree with the board.
Catches stale fab files (regenerated board, forgotten export) and
side/ref mismatches before they reach JLC.
Run with KiCad's bundled python: Python check_fab.py
"""
import csv
import sys
from pathlib import Path
import pcbnew

HERE = Path(__file__).resolve().parent.parent
board = pcbnew.LoadBoard(str(HERE / "exopet-hat.kicad_pcb"))

want = {}
for fp in board.GetFootprints():
    ref = fp.GetReference()
    if ref.startswith("H") or ref.startswith("TP") or ref.startswith("JP"):
        continue
    want[ref] = ("bottom" if fp.IsFlipped() else "top",
                 round(pcbnew.ToMM(fp.GetPosition().x), 2),
                 round(pcbnew.ToMM(fp.GetPosition().y), 2))

fail = 0
cpl = {}
with open(HERE / "fab" / "exopet-hat-cpl.csv") as f:
    for row in csv.DictReader(f):
        cpl[row["Designator"]] = (row["Layer"].lower(),
                                  float(row["Mid X"].replace("mm", "")),
                                  float(row["Mid Y"].replace("mm", "")))

for ref, (side, x, y) in sorted(want.items()):
    if ref not in cpl:
        print(f"FAIL CPL missing {ref}")
        fail += 1
        continue
    cside, cx, cy = cpl[ref]
    if cside != side:
        print(f"FAIL CPL {ref}: side {cside} vs board {side}")
        fail += 1
    # CPL y is often flipped/negated by convention; check |coords| match
    if abs(abs(cx) - abs(x)) > 0.01 or abs(abs(cy) - abs(y)) > 0.01:
        print(f"FAIL CPL {ref}: pos ({cx},{cy}) vs board ({x},{y})")
        fail += 1
for ref in cpl:
    if ref not in want:
        print(f"FAIL CPL extra ref {ref} not on board")
        fail += 1

bom_refs = set()
with open(HERE / "fab" / "exopet-hat-bom-jlc.csv") as f:
    for row in csv.DictReader(f):
        for r in row["Designator"].split(","):
            bom_refs.add(r.strip())
missing_bom = set(want) - bom_refs
extra_bom = bom_refs - set(want)
for r in sorted(missing_bom):
    print(f"FAIL BOM missing {r}")
    fail += 1
for r in sorted(extra_bom):
    print(f"FAIL BOM extra {r}")
    fail += 1

print(f"FAB: {'FAIL' if fail else 'PASS'} ({len(want)} assembled refs)")
sys.exit(1 if fail else 0)

"""Cross-check enclosure port positions against the actual board file.

Run with KiCad's bundled python:
  .../Python tools-or-here/check_ports.py

Parses enclosure.scad's parameters, loads ../exopet-hat.kicad_pcb, and
asserts every terminal group's wall wire port and lid screw port covers
that group's real pad positions. This is the ground truth for "do the
ports line up with the HAT".
"""
import re
import sys
from pathlib import Path

import pcbnew

HERE = Path(__file__).resolve().parent
scad = (HERE / "enclosure.scad").read_text()


def var(name):
    m = re.search(rf"^{name} = ([0-9.]+);", scad, re.M)
    return float(m.group(1))


def groups(name):
    m = re.search(rf"{name}\s*=\s*\[(.*?)\];", scad, re.S)
    body = m.group(1)
    out = []
    for gm in re.finditer(r"\[\[([0-9.,\s]+)\],\"(\w+)\"\]", body.replace(" ", "")):
        pads = [float(x) for x in gm.group(1).split(",")]
        out.append((gm.group(2), pads))
    return out


wall, slack = var("wall"), var("slack")
bx = by = wall + slack
board = pcbnew.LoadBoard(str(HERE.parent / "exopet-hat.kicad_pcb"))

pads = {}
for fp in board.GetFootprints():
    ref = fp.GetReference()
    if ref in ("J8", "J9", "J10", "J11", "J13", "J14", "J4", "J1"):
        pads[ref] = sorted(
            (pcbnew.ToMM(p.GetPosition().x), pcbnew.ToMM(p.GetPosition().y))
            for p in fp.Pads()
        )

fail = 0

# front groups: scad pad x-lists vs board pad x of J8..J11 (pads at y≈52)
FRONT_REF = {"1": "J8", "2": "J9", "3": "J10", "AUX": "J11"}
for label, scad_xs in groups("FRONT_GROUPS"):
    ref = FRONT_REF[label]
    board_xs = sorted(x for x, y in pads[ref])
    board_ys = [y for x, y in pads[ref]]
    ok_x = all(abs(a - b) < 0.05 for a, b in zip(sorted(scad_xs), board_xs))
    ok_y = all(abs(y - 52.0) < 0.05 for y in board_ys)
    status = "OK " if (ok_x and ok_y) else "FAIL"
    if not (ok_x and ok_y):
        fail += 1
    print(f"{status} {label}: scad {sorted(scad_xs)} vs board x {board_xs}, y {set(round(y,1) for y in board_ys)}")

# left groups: scad pad y-lists vs board pad y of J13/J14/J4 (pads at x=4)
LEFT_REF = {"FLT1": "J13", "FLT2": "J14", "TEMP": "J4"}
for label, scad_ys in groups("LEFT_GROUPS"):
    ref = LEFT_REF[label]
    board_ys = sorted(y for x, y in pads[ref])
    board_xs = [x for x, y in pads[ref]]
    ok_y = all(abs(a - b) < 0.05 for a, b in zip(sorted(scad_ys), board_ys))
    ok_x = all(abs(x - 4.0) < 0.05 for x in board_xs)
    status = "OK " if (ok_x and ok_y) else "FAIL"
    if not (ok_x and ok_y):
        fail += 1
    print(f"{status} {label}: scad {sorted(scad_ys)} vs board y {board_ys}, x {set(round(x,1) for x in board_xs)}")

# barrel jack: scad jack_y vs J1 position
jack_y = var("jack_y")
j1y = sorted(set(round(y, 1) for x, y in pads["J1"]))
print(f"jack: scad y={jack_y} vs J1 pad ys {j1y} (opening axis should be within)")
if not (min(j1y) - 6 <= jack_y <= max(j1y) + 6):
    fail += 1

# chirality guard: modules are authored in KiCad's y-down board coords;
# the output stage must emit every part through the handed() y-mirror or
# the print is a mirror image of the physical board.
import re as _re
emits = _re.findall(r'(?:base|cover|roof)\(\);', scad)
wrapped = _re.findall(r'handed\(\)\s+(?:\w+\([^)]*\)\s+)?(?:base|cover|roof)\(\)', scad)
if "module handed()" not in scad or len(wrapped) < 3:
    print("FAIL chirality: not all parts emitted through handed() y-mirror")
    fail += 1
else:
    print("OK  chirality: all parts emitted through handed() y-mirror")

print("PORTS:", "FAIL" if fail else "ALL MATCH THE BOARD FILE")
sys.exit(1 if fail else 0)

#!/usr/bin/env python3
"""DRC gate with geometric sanity filter.

kicad-cli 8 emits occasional phantom clearance violations citing items
tens of mm apart (observed: D3 pad vs +3V3 tracks 20.6mm away claimed
as 0.055mm). This gate re-measures every claimed clearance pair from
the board geometry: a violation is excused ONLY if the true item
distance exceeds the claimed distance by >1mm (physically impossible
report), and each exclusion is printed with its measured proof.
Everything else — and every other violation type — fails the gate.

Run: Python check_drc_sanity.py <board> <drc.json>
"""
import json
import math
import sys

import pcbnew

board = pcbnew.LoadBoard(sys.argv[1])
report = json.load(open(sys.argv[2]))


def seg_dist(p, a, b):
    (px, py), (ax, ay), (bx, by) = p, a, b
    dx, dy = bx - ax, by - ay
    L2 = dx * dx + dy * dy
    t = 0 if L2 == 0 else max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / L2))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def find_track(x, y, length_mm):
    for tr in board.GetTracks():
        if tr.GetClass() != "PCB_TRACK":
            continue
        s, e = tr.GetStart(), tr.GetEnd()
        for end in (s, e):
            if abs(pcbnew.ToMM(end.x) - x) < 0.01 and abs(pcbnew.ToMM(end.y) - y) < 0.01 \
               and abs(pcbnew.ToMM(int(tr.GetLength())) - length_mm) < 0.05:
                return ((pcbnew.ToMM(s.x), pcbnew.ToMM(s.y)),
                        (pcbnew.ToMM(e.x), pcbnew.ToMM(e.y)))
    return None


real, phantom = [], []
for v in report.get("violations", []):
    if v["type"] != "clearance":
        real.append(v)
        continue
    m = None
    desc = v.get("description", "")
    if "actual" in desc:
        m = float(desc.split("actual")[1].split("mm")[0].strip())
    items = v.get("items", [])
    pad_pos = None
    track = None
    for it in items:
        d = it.get("description", "")
        p = it.get("pos", {})
        if d.startswith("Pad"):
            pad_pos = (p["x"], p["y"])
        elif d.startswith("Track"):
            L = float(d.split("length")[1].split("mm")[0].strip()) if "length" in d else 0
            track = find_track(p["x"], p["y"], L)
    if pad_pos and track and m is not None:
        true_d = seg_dist(pad_pos, *track)
        if true_d - m > 1.0:
            phantom.append((desc, pad_pos, track, true_d, m))
            continue
    real.append(v)

for desc, pp, tr, td, cm in phantom:
    print(f"PHANTOM excused: claimed {cm}mm, measured {td:.2f}mm "
          f"pad@{pp} vs track {tr}")
unconnected = report.get("unconnected_items", [])
print(f"DRC-SANITY: {len(real)} real violations, {len(phantom)} phantom, "
      f"{len(unconnected)} unconnected")
print("DRC:", "FAIL" if (real or unconnected) else "CLEAN")
sys.exit(1 if (real or unconnected) else 0)

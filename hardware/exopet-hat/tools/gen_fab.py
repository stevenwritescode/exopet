#!/usr/bin/env python3
"""Build the JLCPCB assembly files (BOM + CPL) for FULL assembly:
bottom-side SMD + top-side through-hole. Run gen_board first.
Positions come from kicad-cli pos export; run:
  kicad-cli pcb export pos -o fab/positions-raw.csv --format csv --units mm \
      --side both exopet-hat.kicad_pcb
"""
import csv
import xml.etree.ElementTree as ET
from pathlib import Path

import sys as _sys
VARIANT = _sys.argv[1] if len(_sys.argv) > 1 else "std"
HERE = Path(__file__).resolve().parent.parent
FAB = HERE / "fab" / VARIANT
FAB.mkdir(parents=True, exist_ok=True)

# Parts assembled by JLC. JP1/JP2 are bare solder-jumper pads (no part);
# H1-H4 are holes; TP1-TP4 are bare test pads.
EXCLUDE = {"JP2", "H1", "H2", "H3", "H4",
           "TP1", "TP2", "TP3", "TP4"}

# LCSC picks / search hints for through-hole lines.
THT_LCSC = {
    # leave J1 blank so the row survives as searchable/unmatched
    "K1": "C1524650", "K2": "C1524650", "K3": "C1524650", "K4": "C1524650",
    # J1 barrel jack: C20518877 exists at LCSC but NOT in JLC assembly library;
    "J3": "C35165",      # 2x20 PC104 stacking 12.3mm
    # F1 deliberately unpinned: C468988 is the 5A RGEF500 — rev 2 needs
    # the 7A RGEF700 class; hand-match it in the JLC UI (review finding)
    "F2": "C208481", "F3": "C208481", "F4": "C208481",  # Bourns MF-R110 — RXEF110 legs (0.81mm) do not fit the 0.71mm holes
    # sensor inputs: KF350-3.5 (both variants)
    "J13": "C474892", "J14": "C474892", "J18": "C474892", "J19": "C474892",  # 2P
    "J4": "C474893",                                       # 3P
    "J17": "C474882",   # CH6 dry contact (pro only): KF301-5.0 3P
    "J16": "C474881",   # CH5 (pro only): KF301-5.0 2P
}
# Relay-output terminal sizing differs by variant: pro fits 5.08mm
# (KF301) on all channels; std (compact) keeps 3.5mm (KF350) on the
# switched channels and 5.08mm only on the AUX -- but std couldn't fit
# even that, so std relay terminals are all 3.5mm. Keyed per variant:
if VARIANT == "pro":
    THT_LCSC.update({"J8": "C474881", "J9": "C474881", "J10": "C474881",
                     "J11": "C474882"})  # KF301-5.0 (5.08mm)
else:
    THT_LCSC.update({"J8": "C474892", "J9": "C474892", "J10": "C474892",
                     "J11": "C474893"})  # KF350-3.5
SEARCH_HINT = {
    "TerminalBlock_Phoenix_PT-1,5-2-3.5-H_1x02_P3.50mm_Horizontal":
        "3.5mm pitch 2P screw terminal horizontal (KF350/XY350 class)",
    "TerminalBlock_Phoenix_PT-1,5-3-3.5-H_1x03_P3.50mm_Horizontal":
        "3.5mm pitch 3P screw terminal horizontal (KF350/XY350 class)",
    "BarrelJack_CUI_PJ-102AH_Horizontal":
        "DC barrel jack 5.5x2.1 PJ-102A compatible (check pad layout!)",
    "PinSocket_2x20_P2.54mm_Vertical":
        "female header 2x20 2.54mm TALL stacking >=11mm (back-side parts need clearance)",
    "SOT-23-6":
        "TPS54302DDCR buck (search TPS54302)",
    "CP_Elec_6.3x7.7":
        "100uF 25V SMD aluminum electrolytic, 6.3mm dia, height <=7.7mm",
    "L_Vishay_IHLP-2525":
        "6.8uH shielded power inductor, Isat>=5A, 6.5x6.9mm (IHLP2525CZ-6R8 class)",
    "Fuse_Bourns_MF-RG500": "radial PTC resettable fuse 7A (RGEF700/MF-RG700; NOT 5A)",
    "Fuse_Bourns_MF-RHT100": "radial PTC resettable fuse 1A (RHT/RGEF100 class)",
}

tree = ET.parse("/tmp/hat-netlist.xml")
comp = {}
for c in tree.find("components"):
    ref = c.get("ref")
    if ref.startswith("#") or ref in EXCLUDE:
        continue
    lcsc = ""
    for field in c.iter("field"):
        if field.get("name") == "LCSC":
            lcsc = (field.text or "").strip()
    if lcsc == "VERIFY":
        lcsc = ""
    comp[ref] = {
        "value": c.findtext("value") or "",
        "fp": (c.findtext("footprint") or "").split(":")[-1],
        "lcsc": THT_LCSC.get(ref, lcsc),
    }

# CPL from raw positions
rows = []
with open(FAB / "positions-raw.csv") as f:
    for r in csv.DictReader(f):
        ref = r["Ref"]
        if ref in EXCLUDE or ref not in comp:
            continue
        rows.append({
            "Designator": ref,
            "Mid X": f'{float(r["PosX"]):.4f}mm',
            "Mid Y": f'{float(r["PosY"]):.4f}mm',
            "Layer": "Top" if r["Side"] == "top" else "Bottom",
            "Rotation": r["Rot"],
        })
with open(FAB / "exopet-hat-cpl.csv", "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=["Designator", "Mid X", "Mid Y", "Layer", "Rotation"])
    w.writeheader()
    w.writerows(rows)
top = sum(1 for r in rows if r["Layer"] == "Top")
print(f"CPL: {len(rows)} placements ({top} top THT, {len(rows)-top} bottom SMD)")

# BOM grouped by value+footprint+lcsc
groups = {}
for ref, d in comp.items():
    hint = SEARCH_HINT.get(d["fp"])
    if hint and "terminal" in hint:
        comment = hint  # identical hardware: group all channels on one line
    elif hint:
        comment = f'{d["value"]} [{hint}]'
    else:
        comment = d["value"]
    key = (comment, d["fp"], d["lcsc"])
    groups.setdefault(key, []).append(ref)
with open(FAB / "exopet-hat-bom-jlc.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["Comment", "Designator", "Footprint", "LCSC Part #"])
    for (comment, fp, lcsc), refs in sorted(groups.items()):
        w.writerow([comment, ",".join(sorted(refs)), fp, lcsc])
print(f"BOM: {len(groups)} line items")
for (comment, fp, lcsc), refs in sorted(groups.items()):
    flag = "  <-- PICK IN MATCHING UI" if not lcsc else ""
    print(f"  {comment[:58]:<58} {lcsc:<10}{flag}")

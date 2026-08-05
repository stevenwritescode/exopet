#!/usr/bin/env python3
"""Generate the real exopet-hat.kicad_pcb from the schematic netlist.

- Footprints and their per-pad net assignments come from the exported
  netlist XML (single source of truth: the verified schematic).
- Placement is engineered here (informed by the placement preview).
- Copper: full-board GND zone on B.Cu, +12V zone on F.Cu over the
  power half. Signal routing is added afterwards by freerouting.
Run: python3 tools/gen_board.py   (regenerate netlist first)
"""
import re
import uuid
import xml.etree.ElementTree as ET
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
FPDIR = Path("/Applications/KiCad/KiCad.app/Contents/SharedSupport/footprints")
NETXML = Path("/tmp/hat-netlist.xml")
OUT = HERE / "exopet-hat.kicad_pcb"

NS = uuid.UUID("87654321-4321-8765-4321-876543218765")


def uid(*parts):
    return str(uuid.uuid5(NS, ":".join(str(p) for p in parts)))


# ── engineered placement (board coords, origin top-left, mm) ────
# (x, y, rot). Rot per KiCad footprint conventions, verified by render.
PLACEMENT = {
    # ── top: through-hole ───────────────────────────────────
    "J3": (8.37, 4.77, 0),  # pre-flip; flip_backs sets B side + 270
    "J1": (14.6, 14.0, 270),
    "F1": (13.5, 28.9, 90),
    # left edge sensor stack: FLOAT1, FLOAT2, TEMP (wires exit left)
    "J13": (4.0, 26.3, 90),
    "J14": (4.0, 34.6, 90),
    "J4": (4.0, 46.5, 90),
    # relays 2x2
    "K1": (37.2, 16.2, 270),
    "K2": (60.4, 16.2, 270),
    "K3": (37.2, 33.3, 270),
    "K4": (60.4, 33.3, 270),
    # strip between relays and terminals: channel fuses
    "F2": (31.5, 43.4, 0),
    "F3": (42.0, 43.4, 0),
    "F4": (52.5, 43.4, 0),
    # front edge: CH1..CH3 switched-12V, CH4 dry contact LAST, separated
    "J8": (12.5, 52.0, 0),
    "J9": (24.5, 52.0, 0),
    "J10": (36.5, 52.0, 0),
    "J11": (49.5, 52.0, 0),
    # ── back: SMD ───────────────────────────────────────────
    # channel A corridor now hosts the buck; D1 moves to corridor C
    "D1": (54.3, 16.0, 90),
    "Q1": (23.0, 44.8, 0),
    "C2": (31.8, 40.0, 90),
    "R1": (19.0, 39.9, 0),
    # channel B (between K pin columns): EEPROM cluster + float caps
    "U4": (41.7, 20.0, 90),
    "C4": (41.7, 25.5, 0),
    "R3": (40.5, 28.5, 90),
    "R4": (43.0, 28.5, 90),
    "R9": (40.5, 32.5, 90),
    "JP2": (43.3, 33.0, 90),
    "C5": (41.7, 10.0, 0),
    "C6": (41.7, 12.5, 0),
    # channel C: LED resistors, flybacks, float resistors
    "R5": (49.5, 12.0, 0),
    "R6": (49.5, 15.0, 0),
    "R7": (49.5, 18.0, 0),
    "R8": (49.5, 21.0, 0),
    # channel indicator LEDs: TOP, in the gaps between terminal blocks
    "D5": (20.2, 50.5, 90),
    "D6": (32.2, 50.5, 90),
    "D7": (44.7, 50.5, 90),
    "D8": (61.0, 47.0, 0),
    "D9": (51.5, 25.0, 0),
    "D10": (51.5, 30.0, 0),
    "D11": (51.5, 35.0, 0),
    "R10": (50.0, 39.0, 0), "R12": (54.0, 39.0, 0),
    "R11": (50.0, 41.3, 0), "R13": (54.0, 41.3, 0),
    # back-left: driver + 1-wire conditioning under barrel/TRS-free zone
    "U2": (9.0, 41.5, 0),
    "R2": (6.3, 19.5, 90),
    "U5": (7.3, 23.0, 0),
    "C3": (10.6, 22.5, 90),
    "JP1": (14.8, 46.0, 0),
    # ── back: TPS54302 buck in the K1/K3 pad corridor (x 24.7..33.5) ──
    "C8": (27.3, 7.8, 0),
    "C10": (31.8, 7.8, 0),
    "U6": (27.5, 11.2, 0),
    "C7": (31.5, 11.2, 90),
    "L1": (28.6, 16.8, 0),
    "C11": (26.5, 30.5, 90),
    "C12": (30.5, 30.5, 90),
    "R16": (25.5, 34.0, 0),
    "R17": (31.2, 34.0, 0),
    "C16": (27.2, 36.2, 0),
    "R19": (16.0, 34.5, 90),
    "R20": (16.0, 38.5, 90),
    # ── top-left pocket: test points + rail LEDs ──
    "TP1": (11.6, 34.8, 0),
    "TP2": (11.6, 37.8, 0),
    "TP3": (11.6, 40.8, 0),
    "TP4": (11.6, 43.8, 0),
    "D12": (14.9, 35.5, 0),
    "D13": (14.9, 39.0, 0),
}

MOUNTING_HOLES = [(3.5, 3.5), (61.5, 3.5), (3.5, 52.5), (61.5, 52.5)]

# ── read netlist: components + nets ─────────────────────────────
tree = ET.parse(NETXML)
comp_fp = {}
for comp in tree.find("components"):
    ref = comp.get("ref")
    fp = comp.findtext("footprint") or ""
    if ref.startswith("#") or not fp:
        continue
    comp_fp[ref] = fp

net_names = []
pad_net = {}  # (ref, pin) -> net name
for net in tree.find("nets"):
    name = net.get("name")
    net_names.append(name)
    for node in net.findall("node"):
        pad_net[(node.get("ref"), node.get("pin"))] = name

net_num = {name: i + 1 for i, name in enumerate(sorted(net_names))}


missing = set(comp_fp) - set(PLACEMENT)
extra = set(PLACEMENT) - set(comp_fp)
assert not missing, f"unplaced components: {missing}"
assert not extra, f"placement for unknown refs: {extra}"


def embed_footprint(ref, fp_id, x, y, rot):
    lib, name = fp_id.split(":")
    text = (FPDIR / f"{lib}.pretty" / f"{name}.kicad_mod").read_text()
    text = text.replace(f'(footprint "{name}"', f'(footprint "{fp_id}"', 1)
    m = re.search(r"\(generator[^)]*\)(\s*\(generator_version[^)]*\))?", text)
    text = text[: m.end()] + f"\n  (at {x} {y} {rot})" + text[m.end() :]
    text = re.sub(
        r'\(property "Reference" "[^"]*"',
        f'(property "Reference" "{ref}"',
        text,
        count=1,
    )

    # rotate pads with the footprint: pad angles in-file are absolute
    def fix_pad(mm):
        head, num, between, at = mm.group(1), mm.group(2), mm.group(3), mm.group(4)
        parts = at.split()
        px, py = parts[0], parts[1]
        pang = float(parts[2]) if len(parts) > 2 else 0.0
        newang = (pang + rot) % 360
        net = pad_net.get((ref, num))
        netexpr = f' (net {net_num[net]} "{net}")' if net else ""
        return f'{head}"{num}"{between}(at {px} {py} {newang}){netexpr}'

    text = re.sub(
        r'(\(pad )"([^"]*)"([^(]*)\(at ([^)]*)\)',
        fix_pad,
        text,
    )
    return text


def fix_fuse_drills(ref, text):
    if ref not in ("F1", "F2", "F3", "F4"):
        return text
    def bump(m):
        return f"(drill {max(float(m.group(1)), 1.1)})"
    return re.sub(r"\(drill ([\d.]+)\)", bump, text)

parts = [
    fix_fuse_drills(ref, embed_footprint(ref, comp_fp[ref], *PLACEMENT[ref]))
    for ref in sorted(comp_fp)
]
for i, (hx, hy) in enumerate(MOUNTING_HOLES):
    lib, name = "MountingHole", "MountingHole_2.7mm_M2.5_DIN965_Pad"
    text = (FPDIR / f"{lib}.pretty" / f"{name}.kicad_mod").read_text()
    text = text.replace(f'(footprint "{name}"', f'(footprint "{lib}:{name}"', 1)
    m = re.search(r"\(generator[^)]*\)(\s*\(generator_version[^)]*\))?", text)
    text = text[: m.end()] + f"\n  (at {hx} {hy} 0)" + text[m.end() :]
    text = re.sub(
        r'\(property "Reference" "[^"]*"',
        f'(property "Reference" "H{i+1}"',
        text,
        count=1,
    )
    parts.append(text)

nets_decl = "\n".join(
    f'  (net {num} "{name}")' for name, num in sorted(net_num.items(), key=lambda kv: kv[1])
)

gnd = net_num.get("GND", 0)
p12 = net_num.get("+12V", 0)

board = f"""(kicad_pcb (version 20240108) (generator "gen_board.py") (generator_version "8.0")
  (general (thickness 1.6) (legacy_teardrops no))
  (paper "A4")
  (layers
    (0 "F.Cu" signal)
    (31 "B.Cu" signal)
    (36 "B.SilkS" user "B.Silkscreen")
    (37 "F.SilkS" user "F.Silkscreen")
    (38 "B.Mask" user)
    (39 "F.Mask" user)
    (34 "B.Paste" user)
    (35 "F.Paste" user)
    (40 "Dwgs.User" user "User.Drawings")
    (41 "Cmts.User" user "User.Comments")
    (44 "Edge.Cuts" user)
    (46 "B.CrtYd" user "B.Courtyard")
    (47 "F.CrtYd" user "F.Courtyard")
    (48 "B.Fab" user)
    (49 "F.Fab" user)
  )
  (setup
    (pad_to_mask_clearance 0)
    (allow_soldermask_bridges_in_footprints no)
  )
  (net 0 "")
{nets_decl}
  (gr_rect (start 0 0) (end 65 56) (stroke (width 0.15) (type default)) (fill none) (layer "Edge.Cuts") (uuid "{uid('edge')}"))
  (gr_text "ExoPet HAT rev2" (at 47.5 25 0) (layer "F.SilkS") (uuid "{uid('title')}") (effects (font (size 1.2 1.2) (thickness 0.25))))
"""

# rev 2: terminal polarity + channel labels + legends on the top silk
SILK = [
    # (text, x, y, rot, size)
    ("+", 12.5, 47.3, 0, 0.9), ("-", 16.0, 47.3, 0, 0.9),
    ("+", 24.5, 47.3, 0, 0.9), ("-", 28.0, 47.3, 0, 0.9),
    ("+", 36.5, 47.3, 0, 0.9), ("-", 40.0, 47.3, 0, 0.9),
    ("COM", 49.5, 47.3, 0, 0.7), ("NO", 53.0, 47.3, 0, 0.7),
    ("NC", 56.5, 47.3, 0, 0.7),
    ("12V IN 5.5x2.1 (+)ctr", 20.0, 6.3, 0, 0.7),
    ("FLT1", 10.5, 24.5, 90, 0.9), ("FLT2", 10.5, 32.8, 90, 0.9),
    ("TEMP", 9.8, 44.9, 90, 0.9),
    ("12V", 14.9, 36.9, 0, 0.6), ("5V", 14.9, 40.4, 0, 0.6),
]
for i, (txt, sx, sy, srot, ssz) in enumerate(SILK):
    board += (f'  (gr_text "{txt}" (at {sx} {sy} {srot}) (layer "F.SilkS")'
              f' (uuid "{uid("silk", i)}")'
              f' (effects (font (size {ssz} {ssz}) (thickness {round(ssz*0.18,2)}))))\n')


ZONES = f"""  (zone (net {gnd}) (net_name "GND") (layer "B.Cu") (uuid "{uid('zone-gnd')}") (name "GND_pour")
    (hatch edge 0.5)
    (connect_pads (clearance 0.3))
    (min_thickness 0.25) (filled_areas_thickness no)
    (fill yes (thermal_gap 0.5) (thermal_bridge_width 0.5))
    (polygon (pts (xy 0 0) (xy 65 0) (xy 65 56) (xy 0 56)))
  )
  (zone (net {p12}) (net_name "+12V") (layer "F.Cu") (uuid "{uid('zone-12v')}") (name "12V_pour")
    (hatch edge 0.5)
    (connect_pads (clearance 0.3))
    (min_thickness 0.25) (filled_areas_thickness no)
    (fill yes (thermal_gap 0.5) (thermal_bridge_width 0.8))
    (polygon (pts (xy 33 9) (xy 65 9) (xy 65 44) (xy 33 44)))
  )
"""

import sys
if "--zones" in sys.argv:
    board += ZONES

board += "\n".join(parts) + "\n)\n"
OUT.write_text(board)
print(
    f"wrote {OUT}: {len(comp_fp)} netlisted parts + {len(MOUNTING_HOLES)} holes, "
    f"{len(net_num)} nets"
)

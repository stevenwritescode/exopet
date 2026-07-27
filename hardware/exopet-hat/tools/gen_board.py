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
    # ── top side: through-hole ──────────────────────────────
    # GPIO socket along top edge
    "J3": (8.0, 3.2, 90),
    # left column: barrel in, buck socket, TRS jack, JST
    "J1": (14.6, 14.0, 270),
    "J2": (5.5, 22.75, 0),
    "PSU1": (13.0, 27.0, 270),
    "J4": (7.9, 34.6, 90),
    # relays 2x2, right two-thirds
    "K1": (37.2, 16.2, 270),
    "K2": (60.4, 16.2, 270),
    "K3": (37.2, 33.3, 270),
    "K4": (60.4, 33.3, 270),
    # fuse strip between relays and terminals
    "F1": (24.0, 43.4, 0),
    "F2": (34.8, 43.4, 0),
    "F3": (45.6, 43.4, 0),
    "F4": (56.4, 43.4, 0),
    # bottom edge terminals, flush-ganged (courtyards touch by design)
    "J11": (13.4, 52.0, 0),
    "J8": (28.9, 52.0, 0),
    "J9": (39.05, 52.0, 0),
    "J10": (49.2, 52.0, 0),
    # ── back side: SMD (flipped by tools/flip_backs.py) ─────
    # channel A: between K1/K3 pin columns (x 24.5-33.7)
    "Q1": (29.0, 13.0, 90),
    "D1": (29.0, 21.5, 90),
    "C1": (29.0, 32.0, 90),
    "C2": (29.0, 40.0, 90),
    "R1": (26.0, 41.2, 0),
    # channel B: between K1/K2 pin columns (x 38.9-44.6): EEPROM cluster
    "U4": (41.7, 20.0, 90),
    "C4": (41.7, 25.5, 0),
    "R3": (40.5, 28.5, 90),
    "R4": (43.0, 28.5, 90),
    "R9": (40.5, 32.5, 90),
    "JP2": (43.0, 33.0, 90),
    # channel C: between K2/K4 pin columns (x 47.8-56.9): LEDs + flybacks
    "R5": (49.5, 12.0, 0), "D5": (53.5, 12.0, 0),
    "R6": (49.5, 15.0, 0), "D6": (53.5, 15.0, 0),
    "R7": (49.5, 18.0, 0), "D7": (53.5, 18.0, 0),
    "R8": (49.5, 21.0, 0), "D8": (53.5, 21.0, 0),
    "D9": (51.5, 25.0, 0),
    "D10": (51.5, 30.0, 0),
    "D11": (51.5, 35.0, 0),
    # under the (SMD-only) TRS jack, left side
    "U2": (7.0, 42.0, 90),
    "JP1": (14.8, 44.6, 0),
    "R2": (3.5, 13.0, 90),
    "U5": (3.5, 16.5, 0),
    "C3": (6.5, 14.0, 90),
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

comp_fp["C1"] = "Capacitor_SMD:CP_Elec_8x10.5"
# J2 becomes heavy solder wire pads (no room for a 5th terminal block)
comp_fp["J2"] = "Connector_Wire:SolderWire-1.5sqmm_1x02_P6mm_D1.7mm_OD3mm"

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


parts = [
    embed_footprint(ref, comp_fp[ref], *PLACEMENT[ref]) for ref in sorted(comp_fp)
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
  (gr_text "ExoPet HAT rev1" (at 47.5 25 0) (layer "F.SilkS") (uuid "{uid('title')}") (effects (font (size 1.2 1.2) (thickness 0.25))))
"""

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

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

import sys as _sys
VARIANT = _sys.argv[1] if len(_sys.argv) > 1 else "std"
assert VARIANT in ("std", "pro"), VARIANT

HERE = Path(__file__).resolve().parent.parent
FPDIR = Path("/Applications/KiCad/KiCad.app/Contents/SharedSupport/footprints")
NETXML = Path("/tmp/hat-netlist.xml")
OUT = HERE / f"exopet-hat-{VARIANT}.kicad_pcb"
BOARD_H = 56 if VARIANT == "std" else 92

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
    "J10": (35.0, 52.0, 0),
    "J11": (44.5, 52.0, 0),
    # ── back: SMD ───────────────────────────────────────────
    # channel A corridor now hosts the buck; D1 moves to corridor C
    "D1": (18.5, 25.5, 90),
    "Q1": (24.2, 44.8, 0),
    "C2": (31.8, 40.0, 90),
    "R1": (19.0, 39.9, 0),
    # channel B (between K pin columns): EEPROM cluster + float caps
    "U4": (41.7, 20.0, 90),
    "C4": (41.7, 25.5, 0),
    "R3": (40.5, 28.5, 90),
    "R4": (43.0, 28.5, 90),
    "R9": (40.5, 32.5, 90),
    "JP2": (43.3, 33.0, 90),
    "C5": (7.6, 28.7, 0),
    "C6": (7.6, 33.0, 0),
    # channel C: LED resistors, flybacks, float resistors
    "R5": (49.0, 39.5, 90),
    "R6": (51.0, 39.5, 90),
    "R7": (53.0, 39.5, 90),
    "R8": (55.0, 39.5, 90),
    # channel indicator LEDs: TOP, in the gaps between terminal blocks
    "D5": (20.0, 50.5, 0),
    "D6": (31.5, 50.5, 0),
    "D7": (41.5, 48.5, 0),
    "D8": (56.5, 48.5, 0),
    "D9": (51.5, 25.0, 0),
    "D10": (51.5, 30.0, 0),
    "D11": (51.5, 35.0, 0),
    "R10": (17.6, 15.5, 90), "R12": (17.6, 12.0, 90),
    "R11": (17.6, 8.5, 90), "R13": (17.6, 19.0, 90),
    # back-left: driver + 1-wire conditioning under barrel/TRS-free zone
    "U2": (9.0, 41.5, 0),
    "R2": (6.3, 19.5, 90),
    "U5": (7.3, 23.0, 0),
    "C3": (10.6, 22.5, 90),
    "D3": (15.2, 46.5, 90),
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
    "C17": (26.4, 26.7, 0),
    "C1": (52.3, 16.0, 0),
    "R19": (16.0, 34.5, 90),
    "R20": (16.0, 38.5, 90),
    # ── top-left pocket: test points + rail LEDs ──
    # ── float supervision ADC (both variants; sits in the slots the
    # debounce caps vacated) ──
    "U7": (41.7, 11.0, 90),
    "C18": (37.0, 19.2, 0),
    "R22": (38.3, 8.8, 90),
    "R23": (38.3, 12.9, 90),
    "TP1": (11.6, 34.8, 0),
    "TP2": (11.6, 37.8, 0),
    "TP3": (11.6, 40.8, 0),
    "TP4": (11.6, 43.8, 0),
    "D12": (14.9, 35.5, 0),
    "D13": (14.9, 39.0, 0),
}

# ── pro: terminals migrate to the new y=66 front edge (compressed
# left to open a front-right BNC slot); channel LEDs follow; isolated
# pH island fills the freed y44-64 right-half band. ──
if VARIANT == "pro":
    PLACEMENT.update({
        # relay row 3 below the y52.5 mounting holes (2x3 grid)
        "K5": (37.2, 64.5, 270), "K6": (60.4, 64.5, 270),
        # channel fuses in the y42-56 mid-gap (top); flybacks (back)
        "F2": (20.0, 47.0, 0), "F3": (31.0, 47.0, 0),
        "F4": (42.0, 47.0, 0), "F5": (53.0, 47.0, 0),
        "D9": (20.0, 51.5, 0), "D10": (30.0, 51.5, 0),
        "D11": (40.0, 51.5, 0), "D14": (50.0, 51.5, 0),
        # ── all sensor inputs on the LEFT edge ──
        "J4": (4.0, 60.0, 90),               # temp (below y52.5 hole)
        "J18": (4.0, 71.0, 90), "J19": (4.0, 80.0, 90),  # SW3/SW4
        # SW conditioning (back) beside the SW terminals
        "R30": (10.0, 69.0, 0), "R32": (10.0, 71.0, 0), "C29": (10.0, 73.0, 0),
        "R31": (10.0, 78.0, 0), "R33": (10.0, 80.0, 0), "C30": (10.0, 82.0, 0),
        # ── front row 1 (y87): CH1-4 outputs ──
        "J8": (13.0, 87.0, 0), "J9": (25.0, 87.0, 0),
        "J10": (37.0, 87.0, 0), "J11": (48.0, 87.0, 0),
        # ── front row 2 (y76): CH5, CH6, BNC ──
        "J16": (13.0, 76.0, 0), "J17": (25.0, 76.0, 0),
        "J15": (46.0, 82.0, 180),
        # channel LEDs above their terminals (top)
        "D5": (15.5, 84.0, 0), "D6": (27.5, 84.0, 0),
        "D7": (39.5, 84.0, 0), "D8": (52.0, 84.0, 0),
        "D15": (15.5, 73.0, 0), "D16": (28.5, 73.0, 0),
        "R28": (16.0, 71.0, 0), "R29": (28.5, 71.0, 0),
        # ── pH island: PS1 top; ICs back, right of the terminals ──
        "PS1": (46.0, 70.0, 0),
        "U11": (58.0, 70.0, 0),
        "C22": (53.0, 69.0, 90), "C28": (61.0, 73.0, 90),
        "U9": (47.0, 74.0, 0),
        "C20": (42.0, 72.0, 0), "C27": (42.0, 76.0, 0),
        "C21": (52.0, 74.0, 0),
        "R26": (46.0, 78.0, 0), "R27": (50.0, 78.0, 0),
        "U8": (58.0, 78.0, 90),
        "U10": (58.0, 84.0, 0),
        "R24": (52.0, 80.0, 0), "R25": (52.0, 83.0, 0),
        "C25": (63.0, 84.0, 90), "C26": (63.0, 79.0, 90),
    })

MOUNTING_HOLES = [(3.5, 3.5), (61.5, 3.5), (3.5, 52.5), (61.5, 52.5)]
# pro's cantilevered front (y56-92) is supported by an enclosure ledge,
# not screw posts -- keeps the full front edge free for terminals.

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

# Some symbols use letters as pin "numbers" (Device:Q_PMOS = D/G/S)
# while their footprint pads are numbered. Map pad -> netlist pin.
# AOD403 DPAK: pad 1 = Gate, pad 2 = Drain (tab), pad 3 = Source.
PAD_PIN_MAP = {"Q1": {"1": "G", "2": "D", "3": "S"}}
matched_nodes = set()


missing = set(comp_fp) - set(PLACEMENT)
extra = set(PLACEMENT) - set(comp_fp)
assert not missing, f"unplaced components: {missing}"
assert not extra, f"placement for unknown refs: {extra}"


LOCAL_FPDIR = HERE / "footprints"

def embed_footprint(ref, fp_id, x, y, rot):
    lib, name = fp_id.split(":")
    local = LOCAL_FPDIR / f"{lib}.pretty" / f"{name}.kicad_mod"
    src = local if local.exists() else FPDIR / f"{lib}.pretty" / f"{name}.kicad_mod"
    text = src.read_text()
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
        nl_pin = PAD_PIN_MAP.get(ref, {}).get(num, num)
        net = pad_net.get((ref, nl_pin))
        if net:
            matched_nodes.add((ref, nl_pin))
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

# GUARD: every netlist node must have landed on a footprint pad.
# This is the bug class that shipped rev 1 with a netless Q1 (letter
# pin numbers vs numeric pads) and a permanently dead +12V rail.
unmatched = set(pad_net) - matched_nodes
assert not unmatched, f"netlist pins with no footprint pad: {sorted(unmatched)}"

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
  (gr_rect (start 0 0) (end 65 {BOARD_H}) (stroke (width 0.15) (type default)) (fill none) (layer "Edge.Cuts") (uuid "{uid('edge')}"))
  (gr_text "ExoPet HAT {VARIANT} rev3" (at 44 6.35 0) (layer "F.SilkS") (uuid "{uid('title')}") (effects (font (size 0.9 0.9) (thickness 0.18))))
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
    ("TEMP", 10.2, 35.9, 90, 0.9),
    # DS18B20 probe wire colors at the TEMP positions: R=3V3, Y=data,
    # B=GND (pads y 46.5 / 43.0 / 39.5)
    ("R", 10.1, 46.5, 0, 0.8), ("Y", 10.1, 43.0, 0, 0.8),
    ("B", 10.1, 39.5, 0, 0.8),
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

# Design rules: fine-pitch parts (MSOP-10, 0.5mm) put adjacent pads
# 0.15mm apart; JLC's 2-layer capability is 0.127mm. Write a project
# file so DRC uses 0.15 instead of KiCad's 0.2 default.
import json as _json
pro = {
    "board": {"design_settings": {"rules": {
        "min_clearance": 0.15, "min_copper_edge_clearance": 0.4,
        "min_track_width": 0.2, "min_via_diameter": 0.5,
        "min_via_annular_width": 0.1, "min_hole_clearance": 0.25,
    }}},
    "net_settings": {"classes": [{
        "name": "Default", "clearance": 0.15, "track_width": 0.25,
        "via_diameter": 0.6, "via_drill": 0.3, "uvia_diameter": 0.3,
        "uvia_drill": 0.1, "diff_pair_width": 0.2, "diff_pair_gap": 0.25,
        "bus_width": 12, "line_style": 0, "microvia_diameter": 0.3,
        "pcb_color": "rgba(0, 0, 0, 0.000)",
        "schematic_color": "rgba(0, 0, 0, 0.000)",
        "wire_width": 6,
    }]},
    "meta": {"filename": OUT.with_suffix(".kicad_pro").name, "version": 3},
}
OUT.with_suffix(".kicad_pro").write_text(_json.dumps(pro, indent=2))
print(
    f"wrote {OUT}: {len(comp_fp)} netlisted parts + {len(MOUNTING_HOLES)} holes, "
    f"{len(net_num)} nets"
)

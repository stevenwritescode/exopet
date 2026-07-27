#!/usr/bin/env python3
"""Mock placement preview of the ExoPet HAT — NOT the real layout.

Places the major physical parts on the 65x56mm HAT outline so the board
can be 3D-rendered for a look-and-feel check. No routing, no SMD detail.
"""
import re
from pathlib import Path

FPDIR = Path("/Applications/KiCad/KiCad.app/Contents/SharedSupport/footprints")
OUT = Path(__file__).resolve().parent.parent / "exopet-hat-preview.kicad_pcb"

# (lib, footprint, ref, x, y, rot)
PLACE = [
    # 40-pin GPIO socket along the top edge (HAT spec position)
    ("Connector_PinSocket_2.54mm", "PinSocket_2x20_P2.54mm_Vertical", "J3", 8.0, 6.0, 270),
    # relays: two columns x two rows, long axis horizontal
    ("Relay_THT", "Relay_SPDT_Omron-G5LE-1", "K1", 20.5, 20.0, 270),
    ("Relay_THT", "Relay_SPDT_Omron-G5LE-1", "K2", 44.5, 20.0, 270),
    ("Relay_THT", "Relay_SPDT_Omron-G5LE-1", "K3", 20.5, 38.0, 270),
    ("Relay_THT", "Relay_SPDT_Omron-G5LE-1", "K4", 44.5, 38.0, 270),
    # screw terminals along the bottom (front) edge
    ("TerminalBlock_Phoenix", "TerminalBlock_Phoenix_MKDS-1,5-2-5.08_1x02_P5.08mm_Horizontal", "J2", 4.0, 52.0, 0),
    ("TerminalBlock_Phoenix", "TerminalBlock_Phoenix_MKDS-1,5-2-5.08_1x02_P5.08mm_Horizontal", "J8", 15.5, 52.0, 0),
    ("TerminalBlock_Phoenix", "TerminalBlock_Phoenix_MKDS-1,5-2-5.08_1x02_P5.08mm_Horizontal", "J9", 27.0, 52.0, 0),
    ("TerminalBlock_Phoenix", "TerminalBlock_Phoenix_MKDS-1,5-2-5.08_1x02_P5.08mm_Horizontal", "J10", 38.5, 52.0, 0),
    ("TerminalBlock_Phoenix", "TerminalBlock_Phoenix_MKDS-1,5-3-5.08_1x03_P5.08mm_Horizontal", "J11", 50.0, 52.0, 0),
    # 12V barrel jack, right edge above BNC
    ("Connector_BarrelJack", "BarrelJack_CUI_PJ-102AH_Horizontal", "J1", 60.0, 16.0, 270),
    # buck module socket, mid-left under the header
    ("Connector_PinSocket_2.54mm", "PinSocket_1x04_P2.54mm_Vertical", "PSU1", 4.0, 26.0, 270),
    # DS18B20 TRS jack, right edge
    ("Connector_Audio", "Jack_3.5mm_CUI_SJ-3523-SMT_Horizontal", "J4", 61.0, 27.0, 90),
    # BNC + EZO socket, right edge lower
    ("Connector_Coaxial", "BNC_Amphenol_B6252HB-NPP3G-50_Horizontal", "J6", 60.0, 42.0, 90),
    ("Connector_PinSocket_2.54mm", "PinSocket_1x03_P2.54mm_Vertical", "J7", 53.0, 36.0, 270),
    ("Connector_PinSocket_2.54mm", "PinSocket_1x03_P2.54mm_Vertical", "J12", 53.0, 40.0, 270),
    # HAT mounting holes
    ("MountingHole", "MountingHole_2.7mm_M2.5_DIN965_Pad", "H1", 3.5, 3.5, 0),
    ("MountingHole", "MountingHole_2.7mm_M2.5_DIN965_Pad", "H2", 61.5, 3.5, 0),
    ("MountingHole", "MountingHole_2.7mm_M2.5_DIN965_Pad", "H3", 3.5, 52.5, 0),
    ("MountingHole", "MountingHole_2.7mm_M2.5_DIN965_Pad", "H4", 61.5, 52.5, 0),
]


def embed(lib, name, ref, x, y, rot):
    text = (FPDIR / f"{lib}.pretty" / f"{name}.kicad_mod").read_text()
    text = text.replace(f'(footprint "{name}"', f'(footprint "{lib}:{name}"', 1)
    # inject placement after the generator_version / generator header line
    m = re.search(r'\(generator[^)]*\)(\s*\(generator_version[^)]*\))?', text)
    inject_at = m.end()
    text = text[:inject_at] + f"\n  (at {x} {y} {rot})" + text[inject_at:]
    text = re.sub(r'\(property "Reference" "[^"]*"',
                  f'(property "Reference" "{ref}"', text, count=1)
    return text


parts = [embed(*p) for p in PLACE]

board = f"""(kicad_pcb (version 20240108) (generator "gen_board_preview.py") (generator_version "8.0")
  (general (thickness 1.6) (legacy_teardrops no))
  (paper "A4")
  (layers
    (0 "F.Cu" signal)
    (31 "B.Cu" signal)
    (32 "B.Adhes" user "B.Adhesive")
    (33 "F.Adhes" user "F.Adhesive")
    (34 "B.Paste" user)
    (35 "F.Paste" user)
    (36 "B.SilkS" user "B.Silkscreen")
    (37 "F.SilkS" user "F.Silkscreen")
    (38 "B.Mask" user)
    (39 "F.Mask" user)
    (40 "Dwgs.User" user "User.Drawings")
    (41 "Cmts.User" user "User.Comments")
    (44 "Edge.Cuts" user)
    (46 "B.CrtYd" user "B.Courtyard")
    (47 "F.CrtYd" user "F.Courtyard")
    (48 "B.Fab" user)
    (49 "F.Fab" user)
  )
  (setup (pad_to_mask_clearance 0))
  (net 0 "")
  (gr_rect (start 0 0) (end 65 56) (stroke (width 0.1) (type default)) (fill none) (layer "Edge.Cuts") (uuid "aaaaaaaa-0000-4000-8000-000000000001"))
  (gr_text "ExoPet HAT rev1 (placement preview)" (at 32.5 30 0) (layer "F.SilkS") (uuid "aaaaaaaa-0000-4000-8000-000000000002") (effects (font (size 1.5 1.5) (thickness 0.3))))
"""

board += "\n".join(parts) + "\n)\n"
OUT.write_text(board)
print(f"wrote {OUT} ({len(parts)} footprints)")

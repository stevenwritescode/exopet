# Hub Enclosure (Pi 4 + ExoPet HAT rev 1)

Parametric OpenSCAD. Two parts, PETG, no supports:
- `base.stl` — tray: Pi bosses (M2.5 self-tap), SD relief, keyhole wall flanges
- `cover.stl` — shell: terminal/port openings, 45° gill vents

Mount with the terminal edge DOWN (drip loops).

Assembly workflow (by design): screw the base to the wall, mount the
Pi+HAT stack, terminate ALL field wiring with the cover off, then drop
the cover on — the terminal openings are open-bottom notches so wires
pass straight through. Barrel/USB/Ethernet plug in afterward through
closed ports. Fit tolerance is the
`fit`/`slot_fit` params — first print is a fit-check; adjust and re-render:
  openscad -D 'part="base"' -o base.stl enclosure.scad
Openings are derived from connector positions measured off
`../exopet-hat.kicad_pcb` (see tools/check_placement.py --dump).
v2 backlog: separate jack port from sensor slot, fan boss, tall-relay
clearance re-measure after physical fit check.

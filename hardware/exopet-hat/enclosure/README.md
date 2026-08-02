# Hub Enclosure (Pi 4 + ExoPet HAT rev 1)

Parametric OpenSCAD. Three parts, PETG, all support-free:
- `base.stl` — tray: Pi bosses (M2.5 self-tap), SD relief, keyhole wall
  flanges, snap rim + detents. Print flat side down.
- `cover.stl` — shell: terminal/port openings, 45° gill vents, snap
  dimples. Print top-face-down (opening up); port tops are short
  bridges, no supports needed.
- `roof.stl` — OPTIONAL rain cap with drip nubs. Print sloped-face-down
  (it is planar) — nubs and pegs point up, zero supports. Attach via
  the four pegs into the cover's blind holes; a dab of CA or silicone
  makes it permanent. Skip it entirely for dry installations.

Mount with the terminal edge DOWN (drip loops). The pitched rain cap
on top sheds leak-water forward off the front edge; drip nubs under
its overhangs break surface tension so water falls clear of the walls,
vents, and wiring.

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

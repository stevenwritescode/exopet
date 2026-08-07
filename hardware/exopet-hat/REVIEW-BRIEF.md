# ExoPet HAT rev 2 — external design review brief

## What this is
A Raspberry Pi 4 HAT (65×56mm, 2-layer) for aquarium/habitat automation:
- 12V barrel input → polyfuse → reverse-polarity P-FET → +12V rail
- Integrated TPS54302 buck (12V→5V) back-powering the Pi
- 4× G5LE-1 relays via TBD62003 sink driver (3 switched-12V channels,
  1 dry contact), per-channel 1A polyfuses + flyback diodes
- 2 float-switch inputs (conditioned to GPIO16/12), 1-Wire temp input
  (GPIO4), HAT ID EEPROM (CAT24C32)
- Assembled by JLCPCB (economic parts where possible)

## What we want reviewed (priority order)
1. **Power section**: input protection chain, buck design + layout,
   back-powering safety (a prior review found the issues in
   REVIEW-FINDINGS.md — please check whether the planned fixes are
   right and whether anything else lurks)
2. Relay/driver section correctness and ratings
3. Anything that would prevent a first-spin board from working

## Package contents
- `exopet-hat-schematic.pdf` — schematic
- `exopet-hat.kicad_sch` / `exopet-hat.kicad_pcb` — KiCad 8 source
- `exopet-hat.net.xml` — netlist
- `fab/` — BOM, CPL, gerbers as they would go to JLC
- `exopet-hat-board-top.png`, `-bottom.png`, `-2d-top.png` — renders
- `REVIEW-FINDINGS.md` — 7 confirmed findings from a prior automated
  adversarial review, with datasheet citations. Fixes for these are
  planned but not yet applied; treat them as known issues.
- `docs spec` — original design spec (in repo:
  docs/superpowers/specs/2026-07-27-exopet-hat-design.md)

## Known context
- Rev 1 was built and had two fatal netlist bugs (now fixed + guarded);
  assume nothing, the generators have been wrong before.
- Board is generated programmatically; connectivity is best reviewed
  from the netlist/PDF, not by trusting comments.

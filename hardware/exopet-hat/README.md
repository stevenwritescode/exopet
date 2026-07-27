# ExoPet HAT — KiCad Project

Rev 1 hardware per `docs/superpowers/specs/2026-07-27-exopet-hat-design.md`.

- `exopet-hat.kicad_pro` — project
- `exopet-hat.kicad_sch` — schematic (stage 1: capture complete, layout not started)

## Status

- [x] Schematic capture (all blocks from the spec)
- [ ] Review pass in KiCad GUI (open it and eyeball every block)
- [ ] Footprint assignment + LCSC part numbers
- [ ] Board layout (65×56 mm HAT template)
- [ ] DRC + JLCPCB DFM
- [ ] Order prototypes

## Conventions

- Connectivity uses global labels (`+12V`, `GPIO17`, `1WIRE_DATA`, …)
  rather than long wires — check the label, not the line.
- U2 uses the ULN2003 symbol; the BOM part is **TBD62003APG**
  (pin-compatible DMOS array, 3.3 V-safe inputs).
- PSU1 is the socketed Pololu D24V50F5 5 V/5 A buck module (rev 2:
  integrate a TPS54531 circuit).
- **Verify before layout:** J7 (Atlas EZO-pH socket) pin order against
  the current Atlas Scientific EZO-pH datasheet.

## Opening

KiCad 8+. `File → Open Project → exopet-hat.kicad_pro`.
Run ERC: Inspect → Electrical Rules Checker.

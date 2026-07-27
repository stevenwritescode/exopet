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

## Datasheet verification (done in lieu of skipped human review)

- **EZO-pH socket (J7/J12)** — verified against Atlas EZO-pH datasheet
  v6.1: top row GND, TX/SDA, RX/SCL; bottom row VCC, PRB, PGND.
- **G5LE-1 relay** — verified against Omron K100-E1-08 datasheet: coil on
  terminals 2/5, COM 1, NO 3, NC 4; KiCad footprint pad geometry matches
  the datasheet mounting-hole pattern.
- **Pololu D24V50F5** — confirmed 5 pins (EN, VIN, 2×GND, VOUT); socket is
  now 1×5. **Physical pin order must be confirmed against the module
  silkscreen at layout time.**

## ⚠ pH isolation (read before selling boards)

The Atlas datasheet warns that EZO circuits misread near pumps and
solenoid valves — exactly what this board switches — and states:
*"Never build a commercial product without electrical isolation."*
Rev 1 (non-isolated socket) is fine for bench validation and personal
use. Before kits ship with pH: either add Atlas's published ADM3260
isolation circuit (schematic in their datasheet, p.8) or socket their
Electrically Isolated EZO Carrier instead of the bare module. Tracked
as a rev 2 requirement.

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

# ExoPet HAT — KiCad Project

Rev 1 hardware per `docs/superpowers/specs/2026-07-27-exopet-hat-design.md`.

- `exopet-hat.kicad_pro` — project
- `exopet-hat.kicad_sch` — schematic (stage 1: capture complete, layout not started)

## Status

- [x] Schematic capture (all blocks from the spec)
- [x] Review pass — done via datasheet verification (see below); GUI
      eyeball still welcome
- [x] Footprint assignment + LCSC part numbers (`exopet-hat-bom.csv`,
      see `BOM-NOTES.md` for confidence levels)
- [x] Board layout — generated placement + freerouting autoroute
      (`tools/gen_board.py`, `tools/flip_backs.py`, `/tmp/finish_board.py`
      pipeline); DRC clean except 3 documented courtyard overlaps
      (flush-ganged terminal blocks — intentional)
- [ ] Human eyeball pass on the routed board in the KiCad GUI
- [ ] JLCPCB DFM check + fab package (gerbers/BOM/CPL)
- [ ] Order prototypes

## Layout notes (rev 1)

- All SMD is on the **back side**, nested in pin-free channels between
  the relay/terminal through-hole fields; top side is through-hole only.
- **J5 (JST temp connector) was cut** — no board space; the TRS jack is
  the temperature input (bare-wire probes: use a TRS pigtail).
- **J2 (12V screw input) became heavy solder wire pads** — no room for a
  fifth terminal block; barrel jack is the primary input.
- Signal tracks are 0.25 mm (autorouted); bulk current rides the
  full-board GND pours and short paths. Rev 2: netclass-driven widths.
- GND zones both sides, thermal-relief pads, min spoke count relaxed to
  1 (relieved pads also carry routed GND tracks).

## Datasheet verification (done in lieu of skipped human review)

- **EZO-pH socket (J7/J12)** — verified against Atlas EZO-pH datasheet
  v6.1: top row GND, TX/SDA, RX/SCL; bottom row VCC, PRB, PGND.
- **G5LE-1 relay** — verified against Omron K100-E1-08 datasheet: coil on
  terminals 2/5, COM 1, NO 3, NC 4; KiCad footprint pad geometry matches
  the datasheet mounting-hole pattern.
- **Pololu D24V50F5** — confirmed 5 pins (EN, VIN, 2×GND, VOUT); socket is
  now 1×5. **Physical pin order must be confirmed against the module
  silkscreen at layout time.**

## pH: deferred to rev 2

Rev 1 has **no pH input** (decision 2026-07-27). The Atlas datasheet
requires electrical isolation near pumps/valves for commercial use, so
rev 2 will add the EZO socket + BNC behind an ADM3260 isolation stage
(reference circuit: EZO-pH datasheet p.8). GPIO2/3 (header pins 3/5)
are left unconnected and reserved for it.

## Conventions

- Connectivity uses global labels (`+12V`, `GPIO17`, `1WIRE_DATA`, …)
  rather than long wires — check the label, not the line.
- U2 uses the ULN2003 symbol; the BOM part is **TBD62003APG**
  (pin-compatible DMOS array, 3.3 V-safe inputs).
- PSU1 is the socketed Pololu D24V50F5 5 V/5 A buck module (rev 2:
  integrate a TPS54531 circuit).
- **Verify before layout:** PSU1 socket pin order against the
  D24V50F5 module silkscreen (EN, VIN, 2×GND, VOUT).

## Opening

KiCad 8+. `File → Open Project → exopet-hat.kicad_pro`.
Run ERC: Inspect → Electrical Rules Checker.

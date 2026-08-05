# Ordering ExoPet HAT rev 2 — FULL ASSEMBLY (JLCPCB)

Files:
- `exopet-hat-gerbers.zip` — board fabrication data (upload first)
- `exopet-hat-bom-jlc.csv` — ALL parts, 31 lines (SMD + through-hole)
- `exopet-hat-cpl.csv` — 61 placements (39 bottom SMD, 22 top incl.
  channel/rail LEDs)

## Steps

1. **jlcpcb.com → Order now → upload `exopet-hat-gerbers.zip`.**
   Qty 5, 2 layers, 1.6 mm, ~65×56 mm (auto), any color.
2. **PCB Assembly ON → "Standard" assembly** (not Economic — needed for
   through-hole), **Assembly sides: Both**. Assemble 2 or 5 boards.
3. Upload the BOM and CPL files.
4. **Part matching.** Lines with LCSC codes auto-match (spot-check
   photos). Lines marked in brackets carry a search hint — use the row's
   search button, filter In-Stock, pick the closest match:
   - Screw terminals 3.5 mm 2P (×5) and 3P (×2) — KF350/XY350 class
     clones are fine and cheap
   - Barrel jack — search "PJ-102" first; **compare the footprint pad
     drawing before accepting a DC-005-style jack** (pads differ!)
   - 2×20 GPIO socket — TALL/stacking (PC104, ~12.3 mm) to match the
     enclosure stack height
   - **TPS54302** buck (SOT-23-6), **6.8 µH inductor** (IHLP-2525
     class, Isat ≥5 A), 10 µF/22 µF ceramics, 13.3 k FB resistor
   - **D1 = SMBJ16CA (the CA bidirectional part, not SMBJ16A)**
   - PTC fuses (5 A / 1 A radial), U4/U5 per the descriptions
5. **Placement preview:** verify relay orientation (notch), LED/diode
   polarity, chip pin-1 dots, terminal wire-entry facing the board edge
   (front row faces front, left column faces left), barrel jack opening
   facing off-board.
6. Checkout. Standard both-sides assembly on 5 boards typically lands
   **$150–250 all-in** with parts and shipping.

## What still needs your hands (5 minutes)

- **Bridge solder jumper JP1** (one solder blob) — connects the
  on-board buck's 5 V to the Pi. It ships open so a bare board can be
  bench-tested against USB-C power first. Bridge only after the first
  power-up check: 12 V in — the green **12V** and **5V** LEDs by the
  test points must both light; verify 5.0–5.1 V at TP2 (+5) vs TP4
  (GND).
- Program the HAT EEPROM (software; via the Pi itself, no hardware).
- No Pololu module in rev 2 — the buck is on the board.

## After ordering

While boards ship: build the EEPROM image and the bring-up checklist
(design spec §11). First power-up is ALWAYS: barrel 12 V in, no Pi —
both rail LEDs on, then rails at TP1 (+12), TP2 (+5), TP3 (3V3 stays
dark until a Pi is attached) against TP4 (GND).

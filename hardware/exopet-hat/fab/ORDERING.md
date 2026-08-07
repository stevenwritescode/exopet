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
     class, Isat ≥5 A), 10 µF/22 µF ceramics, **12.4 k** FB resistor,
     **75 pF C0G** feedforward, **100 µF 25 V SMD electrolytic**
     (6.3 mm dia, ≤7.7 mm tall)
   - **D1 = SMBJ16CA (the CA bidirectional part, not SMBJ16A)**
   - **D3 = B550C** (5 A 30 V schottky, SMB) — the 5 V safety diode
   - **F1 = MF-RG700 (7 A)** — NOT the 5 A part; thermal derating
   - PTC fuses (1 A radial ×3), U4/U5 per the descriptions
5. **Placement preview:** verify relay orientation (notch), LED/diode
   polarity, chip pin-1 dots, terminal wire-entry facing the board edge
   (front row faces front, left column faces left), barrel jack opening
   facing off-board.
6. Checkout. Standard both-sides assembly on 5 boards typically lands
   **$150–250 all-in** with parts and shipping.

## What still needs your hands (0 minutes of soldering)

- Nothing. The 5 V link is D3, a machine-placed safety diode (per the
  Pi HAT design guide back-power rule); boards leave assembly fully
  functional. USB-C dual-supply is safe thanks to D3, though 12 V-only
  is the deployed configuration.
- Program the HAT EEPROM (software; `eeprom/provision-hat.sh`, or the
  hub's --if-blank boot hook does it automatically).
- JP2 (EEPROM write-protect) stays open unless you want to lock the
  identity after provisioning.

## After ordering

While boards ship: build the EEPROM image and the bring-up checklist
(design spec §11). First power-up is ALWAYS: barrel 12 V in, no Pi —
both rail LEDs on, then rails at TP1 (+12), TP2 (+5), TP3 (3V3 stays
dark until a Pi is attached) against TP4 (GND).

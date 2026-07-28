# Ordering ExoPet HAT rev 1 — FULL ASSEMBLY (JLCPCB)

Files:
- `exopet-hat-gerbers.zip` — board fabrication data (upload first)
- `exopet-hat-bom-jlc.csv` — ALL parts, 23 lines (SMD + through-hole)
- `exopet-hat-cpl.csv` — 49 placements (31 bottom SMD, 18 top THT)

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
   - 2×20 GPIO socket — **must be TALL/stacking ≥11 mm**: the back-side
     bulk cap (C1, 10.5 mm) hangs toward the Pi and a standard 8.5 mm
     socket will not clear it
   - 1×5 socket, PTC fuses (5 A / 1 A radial), C1/D1/U4/U5 per the
     descriptions
5. **Placement preview:** verify relay orientation (notch), LED/diode
   polarity, chip pin-1 dots, terminal wire-entry facing the board edge
   (front row faces front, left column faces left), barrel jack opening
   facing off-board.
6. Checkout. Standard both-sides assembly on 5 boards typically lands
   **$150–250 all-in** with parts and shipping.

## What still needs your hands (10 minutes, no soldering iron needed
except one blob)

- **Insert the Pololu D24V50F5 module** into its socket (buy from
  pololu.com, #2851, ~$17) — observe pin labels: EN VIN GND GND VOUT.
- **Bridge solder jumper JP1** (one solder blob) — this connects the
  buck's 5 V to the Pi. It ships open so a bare board can be bench-
  tested against USB-C power first. Bridge it only after the first
  power-up check (bring-up step 1: 12 V in, verify 5 V at the jumper).
- Program the HAT EEPROM (software; via the Pi itself, no hardware).

## After ordering

While boards ship: build the EEPROM image and the bring-up checklist
(design spec §11). First power-up is ALWAYS: barrel 12 V in, no Pi, no
module — verify rails at the jumper and PSU socket.

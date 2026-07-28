# Ordering ExoPet HAT rev 1 prototypes (JLCPCB)

Files in this directory:
- `exopet-hat-gerbers.zip` — board fabrication data (upload this)
- `exopet-hat-bom-jlc.csv` — SMD parts for assembly (15 line items)
- `exopet-hat-cpl.csv` — SMD placement positions (31 parts, bottom side)

## Steps

1. **jlcpcb.com → Order now → upload `exopet-hat-gerbers.zip`.**
   It previews the board. Settings to confirm (defaults are mostly right):
   - Layers 2, dimensions ~65×56 mm (auto-detected)
   - Quantity: **5** (minimum, plenty for testing)
   - Thickness 1.6 mm, HASL(with lead) or LeadFree HASL, green, 1 oz
2. **Toggle "PCB Assembly" ON.**
   - Assembly side: **Bottom** (all SMD is on the back)
   - Economic assembly, 2 boards assembled (cheapest) or all 5
   - Tooling holes: "Added by JLCPCB"
3. **Upload `exopet-hat-bom-jlc.csv` and `exopet-hat-cpl.csv`** when asked.
4. **Part matching page — the important step:**
   - Most lines auto-match by LCSC code.
   - Four lines say PICK AT ORDER (blank/VERIFY code). Use the search
     button on each row and pick an in-stock basic part:
     - `C1` 470 µF ≥25 V SMD electrolytic, 8×10.5 mm
     - `D1` SMBJ16A TVS (search "SMBJ16A")
     - `U4` I2C EEPROM SOIC-8: search "AT24C32" or "CAT24C32"
     - `U5` 5 V ESD diode SOD-323 (search "ESD5B5.0" or similar)
   - Spot-check the memory-sourced codes too (resistors, LEDs, SS34) —
     one click each to confirm the part photo looks right.
5. **Placement preview:** check polarized parts — LEDs (D5–D8), diodes
   (D9–D11, D1), C1 stripe, and U2/U4 pin-1 dots. JLC's viewer lets you
   rotate any part 90/180° if it looks wrong. This is the step that
   catches assembly disasters — take five minutes.
6. **Checkout.** Expect roughly $60–110 total for 5 boards / 2 assembled,
   plus shipping. Lead time ~1–2 weeks to the US.

## Through-hole parts (hand-solder when boards arrive)

Add to the same LCSC cart (lcsc.com, same login) or source locally:

| Part | Qty/board | LCSC / source |
|---|---|---|
| Omron G5LE-1-CF DC12 relay | 4 | C1524650 |
| Phoenix PT 1,5/2-3.5 terminal (or compatible 3.5 mm 2-pos) | 5 | search "3.5mm 2P terminal horizontal" |
| Phoenix PT 1,5/3-3.5 terminal (3-pos) | 2 | ditto 3P |
| Barrel jack CUI PJ-102AH | 1 | search "PJ-102A" or DigiKey |
| 2×20 stacking header (extra-tall) | 1 | search "2x20 female header 2.54 stacking" |
| 1×5 pin socket 2.54 mm | 1 | any |
| MF-RG500 5 A polyfuse | 1 | search "RGEF500" / equivalent |
| MF-RHT100 1 A polyfuse | 3 | search "RHT 1A radial PTC" |
| Pololu D24V50F5 buck module | 1 | pololu.com #2851 (~$17) |

## After ordering

While boards ship: program the HAT EEPROM image (`eepmake` — software
task, ask Claude), and prep the bring-up checklist from the design spec
§11. First power-up: **no Pi, no relays socketed** — verify 5 V rail
first.

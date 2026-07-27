# BOM Notes — ExoPet HAT rev 1

Generated BOM: `exopet-hat-bom.csv` (regenerate with
`kicad-cli sch export bom -o exopet-hat-bom.csv --fields
"Reference,Value,Footprint,LCSC" --group-by "Value,Footprint"
exopet-hat.kicad_sch`).

## LCSC numbers — confidence levels

**Web-verified (July 2026):**

| Part | LCSC | Note |
|---|---|---|
| K1–K4 G5LE-1-CF DC12 | C1524650 | CF = flux-protected variant, in stock; plain G5LE-1 DC12 is C152694 (was out of stock) |
| U2 TBD62003AFG | C163227 | SOP-16, ~$0.40, 3.3V-safe DMOS array |
| Q1 AOD403 | C28969 | 30V/15A P-FET TO-252, ~$0.18 (replaces DMP4015SK3 — not JLC-stocked) |

**From memory — confirm on LCSC before ordering (5 minutes):**
0805 passives (C49678 / C17407 / C17673 / C26010 / C17520 / C17414),
LED C2297, SS34 C8678. These are common JLCPCB basic-catalog codes but
codes do rotate.

**Marked VERIFY in the BOM — pick at order time:**

| Ref | Need | Suggestion |
|---|---|---|
| C1 | 470 µF ≥25V radial electro, 8mm/3.5mm pitch | any basic-catalog part |
| D1 | SMBJ16A TVS, SMB | search "SMBJ16A" |
| F1 | 5A radial PTC, MF-RG500 footprint | Bourns or TECHFUSE equivalent |
| F2–F4 | 1A radial PTC, MF-RHT100 footprint | ditto |
| U4 | 32 kbit I2C EEPROM, SOIC-8 | CAT24C32WI or AT24C32E (pin-compatible) |
| U5 | 5V unidirectional ESD clamp, SOD-323 | e.g. ESD5B5.0ST1G class |

**No LCSC (hand-solder / separately sourced):** J1 barrel jack, J2/J8–J11
Phoenix terminals, J3 2×20 socket, J4 TRS jack, J5 JST-XH, PSU1 socket +
the Pololu D24V50F5 module itself (buy from Pololu), JP1/JP2 (bare pads).
JLC's through-hole assembly can take the terminals/relays if preferred.

## Deliberate substitutions vs the original spec

- Relay: **G5LE-1-CF** (flux-protected) instead of plain G5LE-1
- P-FET: **AOD403** instead of DMP4015SK3
- Driver: **TBD62003AFG (SOIC-16)** instead of TBD62003APG (DIP) — SMD
  assembles at JLC; DIP would be hand-solder
- Channel fuses: **MF-RHT100 (1A hold)** instead of MF-R110 — footprint
  availability; loads are ≤0.5A so 1A hold is correct
- Terminals: Phoenix MKDS-1,5 footprints (generic 5.08mm blocks fit)

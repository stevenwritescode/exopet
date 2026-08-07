# Automated adversarial review — status after two rounds

## Round 1 (against the pre-fix design): 7 confirmed, all FIXED
1. [major] No 75pF feedforward cap → **C17 added**
2. [major] No bulk input capacitance → **C1 100uF SMD electrolytic added**
3. [major] F1 5A hold current insufficient (~4.6A load, derates 4.4A@40C) → **MF-RG700**
4. [minor] TVS D1 placed 40mm from the input → **moved to input corner**
5. [major] Back-power violates HAT guide; Pi-USB-C could energize the barrel jack → **D3 B550C safety diode; setpoint raised**
6. [major] ORDERING.md described a JP1 that no longer exists → **rewritten**
7. [major] R21 zero-ohm jumper under-rated (1206 jumpers are also 2A) → **replaced by D3**

## Round 2 (against the fixed design): 4 confirmed, all FIXED
1. [minor] 6.8uH leaves ~60mA margin to min HS current limit at worst corners → **10uH**
2. [minor] 22uF 10V X5R derates below transient minimum at 5.4V bias → **25V X7R**
3. [minor] 5.40V setpoint can exceed Pi +5% at light load at tolerance corners → **12.7k (5.29V)** + bench check added to BRINGUP Stage 2
4. [major] F1's BOM still pinned the 5A part code after the 7A value change → **unpinned, hand-match RGEF700**

## Coverage map — IMPORTANT for the human reviewer
| Lens | Round 1 | Round 2 (fixed design) |
|---|---|---|
| Buck converter | reviewed+verified | reviewed+verified |
| Power/protection | reviewed+verified | reviewed; verifier incomplete |
| Relays/driver | DID NOT RUN | DID NOT RUN |
| Pi interface | reviewed+verified | DID NOT RUN |
| BOM/fab codes | reviewed; verifier partial | reviewed; verifier partial |
| Intent audit (golden table) | DID NOT RUN | DID NOT RUN |

## Hardware validation update (2026-08-07)

A rev-1 board (same relay/driver/interface sections as rev 2, with the
netless Q1 bypassed by a bench jumper and the reversed D1 removed) is
now FULLY WORKING on a live hub: relays click on command, channels
switch, EEPROM provisioned, 1-Wire and GPIO map confirmed. This
empirically validates the relay/driver wiring (G5LE-1 coil 2/5, NO=3,
TBD62003 mapping), the hand-matched barrel jack, terminals, fusing
path, and the whole software stack.

**Human review should therefore prioritize the blocks that have NEVER
run on hardware** (all rev-2-new):
1. The TPS54302 buck section (machine-reviewed twice, never powered)
2. Q1 reverse-protection — designed in rev 1 but netless there, so
   this circuit has never functioned on a physical board
3. D3 back-power safety diode + 5.29V setpoint
4. A skeptical read of tools/check_golden.py's EXPECT table
The relay/driver lens that the automated panel never covered is now
hardware-covered instead.

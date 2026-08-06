# ExoPet HAT rev 2 — change list

Accumulated from rev 1 bring-up (2026-08). Each item cites the bench
failure that motivated it.

## Silkscreen (top side)

- **Polarity marks on relay output terminals**: `+` over the left
  position, `−` over the right position of CH1/CH2/CH3 (pad 1 =
  switched +12V, pad 2 = GND return). Rev 1 has no markings; polarity
  had to be looked up from the netlist.
- **AUX terminal legend**: `COM NO NC` over J11's three positions,
  plus a short legend block: `AUX: dry contact — COM+NO = on when
  energized, COM+NC = on when idle`.
- **Channel labels on top silk** (`CH1 CH2 CH3 AUX`) so board and
  enclosure labels agree.
- **Jack polarity symbol**: `12V ⎓ center +` at J1. A center-negative
  brick is silently blocked by Q1 and looks like a dead board.

## Diagnosability

- **Rail LEDs on the TOP side**: 12V-OK and 5V-OK. Would have reduced
  the D1 debugging session to one glance.
- **Channel indicator LEDs (D5–D8) move to the top edge** — rev 1 put
  them on the underside, invisible in the stack.
- **Test points**: 12V / 5V / 3V3 / GND on the board edge.

## Electrical

- **D1 TVS polarity bug**: rev 1 nets put the cathode on GND —
  installed unidirectional SMBJ16A forward-clamps the input rail
  (~0.7 V, F1 folds back, board looks dead; fix on rev 1 = remove D1).
  Rev 2: cathode to +12V_F **and** switch to bidirectional SMBJ16CA,
  which cannot be installed backwards.
- **Polarity lint in the pipeline**: assert cathode/positive nets for
  every polarized part (TVS, electrolytics, LEDs, rectifiers) in the
  netlist checks. Same bug class as the enclosure mirror-image: a
  hand-assigned convention no machine verified.
- **F2–F4 footprint sized to Bourns MF-R110 legs** (0.81 mm leads vs
  0.71 mm holes caused the JLC DFM stop on rev 1).

## Power / packaging

- **Integrate the 5 V buck, delete the socketed Pololu module.**
  Implemented with the **TPS54302** (synchronous, 3 A, internal
  comp/slow-start) instead of the spec's TPS54531: half the parts, no
  catch diode, and the 5 A non-sync circuit physically does not fit
  the relay-pad corridors. Pi 4's official supply is the same 3 A
  class. The 330 µF input electrolytic is also deleted (2×10 µF
  ceramics) — it was the part forcing the tall stacking GPIO socket. The standing module leans on relay K3
  (2 mm gap), overtops the relays, and forced +10 mm of enclosure
  height. If a module survives another rev: keep-out zone + horizontal
  mount.
- pH input stage (deferred from rev 1, spec §6).
- EEPROM write-protect jumper.

## Process

- 3D collision pass with real component heights (would have caught the
  Pololu/relay interference before boards shipped).
- Rendered "as-assembled" review views from the user's perspective
  (top, stacked, wired) — relationship-level bugs (mirrored enclosure,
  hidden LEDs) passed every per-feature check but were obvious in a
  physical view.

## QA gates (all must pass before ordering — run `tools/preflight.sh`)

| Gate | Kills the bug class that... |
|---|---|
| ERC + netlist export | malformed schematic |
| `check_polarity.py` | shipped D1 backwards (rev 1) |
| `check_placement.py` (+ THT-pad sweep) | Pololu/relay collision; SMD-on-pad |
| `verify_j3.py` | GPIO socket on the wrong side (rev 1, caught pre-order) |
| freerouting + DRC 0/0 | shorts, unrouted nets |
| `check_golden.py` — 208 pins vs hand-written intent, on netlist AND routed copper | shipped Q1 netless / dead 12V rail (rev 1) |
| `check_fab.py` | stale/mismatched BOM+CPL uploads |
| Rendered top/bottom review + JLC placement preview | wrong part orientation (human gate) |

Plus a permanent generator guard: build fails if any netlist pin fails
to land on a footprint pad.

### Semantic layer (pin-number → physical-function), datasheet-verified 2026-08-06

The golden table maps pins to nets; this layer confirms the pin NUMBERS
carry the right FUNCTIONS on the physical parts:

- **K1–K4 (G5LE-1)**: coil = 2 & 5, COM = 1, NO = 3, NC = 4 — confirmed
  three ways: KiCad symbol coil-box/armature geometry, footprint hole
  pattern vs the Omron drawing (12 × 12.2 mm, lone pin offset 2 mm at
  the three-pin coil end), armature drawn at rest on pin 4 (NC).
- **U2 (TBD62003 on ULN2003 symbol)**: IN1–7 = 1–7, GND = 8, COM = 9,
  OUT1 = 16 … OUT7 = 10 — symbol pin names extracted and matched.
- **U4 (CAT24C32 on 24LC16 symbol)**: A0–A2/GND = 1–4, SDA 5, SCL 6,
  WP 7, VCC 8 — matched.
- **Q1 (AOD403)**: gate 1, drain 2/tab, source 3 — encoded in
  PAD_PIN_MAP, linted.
- Known UNVERIFIABLE from the desk: the hand-matched barrel jack's
  physical pin mapping (bench: continuity plug-tip → F1) and JLC's
  part-orientation execution (placement preview + first-article bench
  check).

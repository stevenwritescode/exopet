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

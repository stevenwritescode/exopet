# ExoPet HAT rev 3 — isolated pH input + supervised float loops

Base: rev 2 as of `e23a411` (all review fixes applied), whose
relay/driver/terminal/EEPROM core is hardware-validated by the
jumpered rev-1 board running in production. Rev 3 adds the two deferred
sensing subsystems. Board stays 65×56 HAT-spec.

## 1. Isolated pH subsystem (the new analog domain)

Chain: **BNC (board right edge) → high-Z buffer → ADC → I2C isolator →
Pi I2C1**, entire analog side galvanically isolated:

- **Power**: B0505S-1WR2-class isolated DC-DC module, +5V_BUCK →
  +5V_ISO (1W, SIP-4). Separate ISO_GND island; isolation gap ≥2mm
  with no copper crossing except the isolator.
- **Buffer**: MCP6002 (dual, rail-to-rail, ~1pA bias — adequate for a
  10–100MΩ glass electrode). Unit A buffers the probe; unit B buffers
  a mid-rail bias (2.5V from a 100k/100k divider) that the BNC shield
  references, so the probe signal sits at mid-rail ±414mV (pH 0–14).
  Guard ring around the BNC center/buffer input on both layers.
- **ADC**: ADS1115 (#2, addr 0x49) on the isolated side, differential
  A0–A1 (probe vs bias) at ±512mV FSR → ~15.6µV/LSB, ~0.0003 pH.
- **Isolation crossing**: ISO1540 bidirectional I2C isolator. One
  logical bus: Pi I2C1 → main-side devices and, through the isolator,
  the pH ADC.
- Temperature compensation in software from the DS18B20; two-point
  calibration (pH 4/7 buffers) stored hub-side. No trimmers.

## 2. Supervised float loops

- **ADS1115 #1 (addr 0x48), main 3V3 domain**: A0 ← FLOAT1_SW node,
  A1 ← FLOAT2_SW node (10k series taps). A2/A3 spare (future analog
  level/pressure sensors).
- **End-of-line resistor: 100k inside each float-sensor plug**, in
  parallel with the switch. States at the ADC with the existing 10k
  pull-up:
  | State | Voltage |
  |---|---|
  | switch closed | < 0.3V |
  | sensor present, open | ≈ 3.0V |
  | no sensor connected | ≈ 3.3V |
  | wire shorted | < 0.3V (indistinguishable from closed — by design, closed is the safe reading) |
- Existing GPIO16/12 digital paths RETAINED (fast edge detection);
  the ADC adds presence/supervision on top. Software: sump lockout
  logic re-arms automatically when a sensor is detected present —
  restoring the fail-safe behavior traded away in `e23a411` without
  any config toggle.

## 3. Pi interface changes

- J3 pins 3/5 (currently NC) → SDA1/SCL1. The Pi's own 1.8k pull-ups
  serve the main-side bus; isolated side gets its own pull-ups to
  +5V_ISO per ISO1540 datasheet.
- EEPROM (i2c-0 ID bus) unchanged; product_ver → 0x0003.

## 4. Board outline: 65×70 (decision made)

The 65×56 HAT outline cannot host the isolated subsystem: the DC-DC
module (~12×10), BNC (~14mm of edge — none free), and the 2mm
isolation keepout total far more than the AUX-NC fallback's ~4mm.
Growth direction is FRONT (+14mm in y): the USB/Ethernet end is blocked
by connector cage height; the front only faces our own parametric
enclosure. Consequences:
- Terminal blocks move to the new y=66 row and COMPRESS leftward
  (J8 pads x 8/11.5, J9 18.5/22, J10 29/32.5, J11 39.5/43/46.5),
  opening a 15mm front-right slot for an edge-launch BNC (~x 50–65).
- The freed y 42–56 band hosts the isolation island (right half,
  ISO_GND zone with ≥2mm gap) and the main-side float ADC.
- One new mounting hole H5 (3.5, 66.5); the BNC corner is supported by
  an enclosure pillar instead of a screw (BNC body occupies that spot).
- The Pi's USB-C/HDMI connectors sit under the overhang with ~7mm of
  vertical clearance (HAT underside at 16.3mm vs plug boots ≤13mm) —
  enclosure port positions unchanged.
- Formal HAT-spec mechanical compliance is dropped (header, holes,
  EEPROM, back-power diode all retained); marketing copy says
  "Raspberry Pi–compatible".

## 4b. FINDING (inline review 2026-08-07): isolated rail overvoltage

The isolated pH domain draws <2mA — under 1% of a 1W (200mA) module.
An UNREGULATED B0505S is characterized only down to 10% load, where it
already outputs 5.29V (Mornsun datasheet); below that it rises further,
plausibly >6V at our near-no-load. That exceeds the ADS1115 (U8) and
ISO1540 (U9) 5.5V operating maximums, and unregulated modules inject
~100mV ripple straight into a pH front end resolving microvolts.

**Fix (apply during pro layout, with verification available):** run
the isolated ICs from a clean regulated 3.3V, not the raw module. Add a
high-Vin-max LDO (HT7333-class, Vin abs-max ~12V so the module's
no-load rise is harmless) between the module and a new +3V3_ISO rail;
move U8/U9-VCC2/U10 supplies, R26/R27 pull-ups, and R24 bias-top to
+3V3_ISO. pH bias becomes 1.65V ±0.414V — still within ADS1115 FSR and
MCP6002 common-mode range. One LDO + one cap resolves overvoltage,
ripple, AND the "which B0505S variant" matching ambiguity at once.
The MCP1700 (Vin max 6V) is NOT adequate here — the whole point is an
LDO that tolerates the unregulated module's unbounded no-load output.

**std variant is unaffected** — it has no isolated supply.

## 5. Verification additions

- Golden table: every new pin (2× ADS1115, ISO1540, MCP6002, DC-DC,
  BNC, bias network, EOL taps).
- New check: isolation-gap audit — assert no copper item bridges the
  ISO_GND/GND boundary polygon except the isolator/DC-DC footprints.
- BRINGUP stages: pH subsystem (5V_ISO present, ADC readback, buffer
  mid-rail, pH-7 buffer solution reading), float supervision states
  (all four voltages measured).
- Panel review round on the finished design (spend limits permitting)
  + SEI human review before ordering.

## 6. Software scope (hub)

- I2C service reading both ADS1115s; pH conversion + calibration
  endpoints; float supervision states (absent/open/closed) surfaced
  over WS; kiosk pH tile + sensor-presence indicators. Detailed app
  work specced separately after hardware lands.

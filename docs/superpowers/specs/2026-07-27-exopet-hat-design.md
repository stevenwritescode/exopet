# ExoPet HAT — Hardware Design Spec (Rev 1)

> **Date:** 2026-07-27
> **Status:** Approved design; schematic plan for KiCad capture
> **Target:** Raspberry Pi 4/5, official HAT mechanical spec (65 × 56 mm)

## What it is

A single board that replaces the hub's jumper-wired relay board, external
12V distribution, and breadboarded DS18B20 pull-up:

- 4 relays: **CH1–CH3 as switched-12V terminal pairs** (valves/dosing
  pumps wire straight in), **CH4 as dry SPDT contacts** (flexible load)
- **One 12V input powers everything** — onboard 5V buck back-powers the Pi
- **3.5mm jack for the DS18B20** temperature probe, pull-up onboard
- **No pH in rev 1** — deferred to rev 2 behind an isolation stage
  (see §6); GPIO2/3 reserved
- **HAT ID EEPROM** so the Pi auto-detects the board and auto-loads the
  1-Wire overlay — zero config.txt editing

Toolchain: KiCad 8. Fab + SMT assembly: JLCPCB (5-board prototype run).
Through-hole parts (relays, terminals, connectors, header) hand-soldered
or added via JLC's through-hole service.

---

## 1. Block diagram

```
 12V DC in ──[barrel J1 ∥ screw J2]──[F1 polyfuse 5A]──[Q1 reverse-pol P-FET]──┬── +12V rail
                                                        [D1 TVS SMBJ16A]      │
                                                                              ├─[PSU1 buck 5V/5A]── +5V ──[JP1]── Pi 5V pins
                                                                              │
                                                                              ├─ K1..K4 relay coils (via U3 driver ← GPIO 17/27/22/23)
                                                                              │
                                                                              └─ CH1..CH3 switched-12V screw terminals
 Pi GPIO4  ──[4.7k pull-up]── 3.5mm TRS jack (DS18B20)
 Pi ID_SC/ID_SD ── U4 HAT EEPROM
```

Board halves: **left = logic** (header, EEPROM, 1-Wire),
**right = power** (input, buck, relays, terminals). All screw terminals
on the right/front board edge for enclosure-friendly wiring.

---

## 2. Power input & protection

| Ref | Part | Notes |
|---|---|---|
| J1 | 5.5×2.1 mm barrel jack, center-positive (CUI PJ-102A) | Primary input |
| F1 | 5A resettable polyfuse (Bourns MF-R500) | Upstream of everything |
| D1 | SMBJ16A TVS, 12V line to GND | Surge/spike clamp after F1 |
| Q1 | P-MOSFET reverse-polarity protection (Diodes DMP4015SK3, DPAK) | Source→load, drain→input, gate→GND via R 100k |
| C1 | 470 µF 25V electrolytic + C2 100 nF X7R | Bulk + HF decoupling on +12V |

Net: `+12V_IN` → F1 → Q1 → `+12V` (protected rail).

## 3. 5V buck converter (Pi power)

**Rev 1 uses a socketed regulator module** to eliminate switch-mode
layout risk on the first spin: Pololu **D24V50F5** (5V, 5A) on a 5-pin
0.1" header footprint (EN, VIN, 2×GND, VOUT). `+12V` → VIN, `+5V` out → Pi header pins 2 & 4
through **JP1**, a 2-pos jumper (open it to run the Pi from USB-C while
bench-debugging the HAT).

Silkscreen next to the header: **"Do NOT connect Pi USB-C while JP1 is
closed."**

Rev 2 note: integrate TPS54531 circuit and delete the module.

## 4. Relay channels

| Ref | Part | Notes |
|---|---|---|
| K1–K4 | Omron G5LE-1 DC12 (SPDT, 10A contacts, 12V/33mA coil) | Through-hole |
| U3 | Toshiba TBD62003APG 7-ch DMOS sink driver (DIP-16) | 3.3V-logic-safe, built-in flyback diodes; COM pin → +12V |
| D5–D8 | LED (green, 0805) + 2.2 kΩ in parallel with each coil | Channel state indication |

Drive: GPIO17→U3 IN1→K1, GPIO27→IN2→K2, GPIO22→IN3→K3, GPIO23→IN4→K4.
Coils between `+12V` and U3 outputs (active-high GPIO = relay closed =
output live). All four channels identical up to the contacts.

**CH1–CH3 (switched 12V):**
- K contact COM → per-channel polyfuse **1.1A (MF-R110)** → `+12V`
- K contact NO → terminal `+`; terminal `−` → GND
- **SS34 Schottky flyback diode across each output pair** (cathode to
  `+`) — solenoid/pump coils kick back on contact opening
- Terminals: 2-pos 5.08 mm screw blocks, one per channel

**CH4 (dry contact):**
- COM / NO / NC → 3-pos 5.08 mm screw block, no connection to 12V
- Silkscreen: **"CH4 dry contact — 10A max, low-voltage DC recommended"**

Fail-safe property: with normally-closed valves wired to CH1–CH3,
power loss or Pi crash de-energizes relays → contacts open → valves
close → water stays put.

## 5. Temperature input (1-Wire)

| Ref | Part | Notes |
|---|---|---|
| J4 | 3-pos 3.5 mm screw terminal (3V3 / DATA / GND) | Bare-wire DS18B20 probes screw straight in |
| R2 | 4.7 kΩ, DATA → 3V3 | The pull-up currently on a breadboard |
| U5 | TPD1E10B06 ESD clamp on DATA | Probe cables are antennas |

DATA → **GPIO4** (header pin 7) — matches existing hub software.

## 6. pH input — DEFERRED TO REV 2

Decision (2026-07-27, after reviewing the Atlas EZO-pH datasheet): pH is
dropped from rev 1 entirely. Atlas warns the EZO misreads near pumps and
solenoid valves — this board's primary loads — and requires electrical
isolation for commercial products. Rev 2 will carry the EZO socket + BNC
behind an ADM3260-based isolation stage (Atlas publishes the reference
circuit in the EZO-pH datasheet, p.8): isolated 3.3V island, isolated
I2C, moat in the copper. GPIO2/3 (header pins 3/5) are left unconnected
in rev 1 and reserved for this.

## 6b. Float switch inputs

| Ref | Part | Notes |
|---|---|---|
| J13 / J14 | 2-pos 3.5 mm screw terminals | FLOAT1 (tank) / FLOAT2 (sump); dry-contact switch to GND, no polarity |
| R10 / R11 | 10 kΩ pull-up to 3V3 | Defines open state |
| R12 / R13 | 1 kΩ series to GPIO | Pin protection |
| C5 / C6 | 100 nF to GND | Debounce / noise filter |

FLOAT1 → GPIO16 (pin 36) — matches the hub's existing tank float code.
FLOAT2 → GPIO12 (pin 32) — reserved by the sump control spec.

## 7. HAT ID EEPROM

| Ref | Part | Notes |
|---|---|---|
| U4 | CAT24C32 (I2C, 32 kbit, SOIC-8) | Per HAT spec, on ID_SD/ID_SC (pins 27/28) |
| R3/R4 | 3.9 kΩ pull-ups to 3V3 | — |
| JP2 | Write-protect solder jumper | Closed = protected (default after programming) |

EEPROM contents (via `eepmake`): vendor `ExoPet`, product `ExoPet HAT
rev1`, GPIO map, and a device-tree fragment enabling `w1-gpio` on GPIO4 —
this is what makes setup zero-config.

## 8. 40-pin header usage

| Pin | Signal | Use |
|---|---|---|
| 2, 4 | 5V | Buck output back-powers Pi (via JP1) |
| 1, 17 | 3V3 | Pull-ups, EEPROM (≤50 mA total draw) |
| 3 / 5 | GPIO2 / GPIO3 (I2C1) | Unconnected — reserved for rev 2 pH |
| 7 | GPIO4 | 1-Wire DATA |
| 11 | GPIO17 | Relay CH1 |
| 13 | GPIO27 | Relay CH2 |
| 15 | GPIO22 | Relay CH3 |
| 16 | GPIO23 | Relay CH4 |
| 27 / 28 | ID_SD / ID_SC | HAT EEPROM only (per spec) |
| 6, 9, 14, 20, 25, 30, 34, 39 | GND | Star-tied to power ground at one point |

Header: 2×20 stacking female, extra-tall pins optional for stacking.

## 9. Layout rules

- 12V load traces ≥2 mm (or polygon pours); relay contact nets ≥2.5 mm
- Separate ground pours for logic and power, joined at one point near J1
- Relays and terminals on the board's front edge; connectors labeled on
  silkscreen with channel numbers **and** suggested use (e.g. "CH1
  DRAIN VALVE")
- Mounting holes per HAT spec; keep-out under the Pi's PoE header
- No traces under the buck module footprint

## 10. Bill of materials (budget, qty 5 prototype run)

| Block | Parts | Est. cost/board |
|---|---|---|
| Relays + driver + LEDs | K1–4, U3, D5–8 | $7.00 |
| Terminals + connectors | 6 screw blocks, J1, J4/J5, header | $5.50 |
| Power | Q1, F1, D1, caps, Pololu D24V50F5 | $11.00 |
| Logic small parts | U4, U5, R*, C*, jumpers | $1.50 |
| PCB + SMT assembly (amortized, 5 boards) | — | $8.00 |
| **Total per board** | | **≈ $33** |

At kit quantities (50+) the per-board total drops under $20.

## 11. Build & bring-up roadmap

1. **Schematic capture** in KiCad 8 — one sheet per block above; ERC clean
2. **Review pass** — verify against this spec's net list, pin by pin
3. **Layout** — 65×56 mm, rules from §9; DRC + JLCPCB DFM check
4. **Order** — 5 boards, SMT assembled; through-hole parts hand-soldered
5. **Bring-up checklist** (per board):
   - No Pi, no relays socketed: apply 12V → verify 5V rail, no heat
   - Reverse the input leads → verify nothing conducts
   - Pi mounted, JP1 closed → boots from HAT power; EEPROM detected
     (`/proc/device-tree/hat/`); 1-Wire overlay auto-loaded
   - DS18B20 in J4 → temperature readable
   - Existing ExoPet API, pins remapped to 17/27/22/23 → each channel
     clicks; CH1 terminal shows 12V when closed; LED tracks state
   - Solenoid valve on CH1 → 20 open/close cycles, no buck brown-out
     (watch `vcgencmd get_throttled`)
6. **Rev 2 backlog seeded from bring-up findings** (known candidates:
   integrated buck, discrete pH front end, DIN-rail mount holes)

## 12. Software touchpoints (small, current codebase)

- GPIO channel map becomes configurable (17/27/22/23 default for HAT)
- No other hub changes — that's the point of staying a HAT

## Out of scope (rev 1)

Mains switching on CH1–CH3, analog/discrete pH front end, ESP32
satellite bus, CM4 carrier, DIN enclosure. The enclosure-setup app flow
spec (approved separately) is documented independently.

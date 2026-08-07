# ExoPet HAT bring-up checklist

Per-board test procedure. Doubles as the validation-batch acceptance
test for rev 2. Work through the stages in order — each stage proves
the layer the next one depends on. STOP at the first failure and use the
failure branch.

Equipment: 12 V center-positive 5.5×2.1 supply, multimeter, small
screwdriver, one DS18B20 probe, a wire scrap (float test).

## Stage 0 — visual (before any power)

- [ ] Relay orientation notches match the silkscreen outlines (K1–K4)
- [ ] U2 pin-1 dot toward the board's left (matches silk dot)
- [ ] Diode cathode bands match silk (D1 input TVS, D9–D11 flybacks)
- [ ] D3 (5 V safety diode, SMB near J8 on the back) present
- [ ] No solder bridges around U6 (buck, SOT-23-6) or the terminals

## Stage 1 — bare board, 12 V, NO Pi

Apply 12 V. Expected within 2 s:

| Check | Expect | Failure branch |
|---|---|---|
| Green **12V** LED (D12) | on | supply polarity (center +!), jack solder, F1, Q1 |
| Green **5V** LED (D13) | on | buck section: U6/L1/R16/R17 |
| TP1 → TP4 (GND) | 11.5–12.5 V | as 12V LED |
| TP2 → TP4 | 5.30–5.50 V (pre-diode; Pi sees ~5.0–5.1 loaded) | buck; if ~0 V check U6 orientation |
| TP3 → TP4 | 0 V (no Pi yet) | >0 V here is a fault: investigate before attaching a Pi |
| Supply current | < 80 mA | if PSU folds back: short — do NOT attach a Pi |

**Rev 1 deltas:** no LEDs on top (they're on the underside), no test
points — probe the PSU1 socket instead (VIN pin = 2nd from relay end,
GND = middle pins). Q1 is netless on rev 1: the F1→PSU1-VIN bypass
jumper must be fitted. D1 was removed; there is NO reverse protection —
triple-check supply polarity. 5 V comes from the Pololu module (check
VOUT toward the SD edge) and reaches the Pi only after JP1 is bridged.

## Stage 2 — attach the Pi

Power OFF. Mount the Pi, seat the GPIO header fully, screw the
standoffs. Apply 12 V. (USB-C dual-supply is safe in rev 2 — D3 blocks
back-feed — but 12 V-only is the deployed configuration.) Pi boots;
TP3 now reads 3.2–3.4 V.

- [ ] Pi 5 V rail (J3 pin 2 vs TP4) reads **4.85–5.25 V** during boot
  and at idle — this validates the 5.29 V setpoint minus the D3 drop
  across the load range (tolerance-corner check from design review).

## Stage 3 — EEPROM provisioning

On the Pi (or from the hub over SSH):

    cd ~/exopet/hardware/exopet-hat/eeprom && sudo ./provision-hat.sh

The script builds the tools if needed, writes the EEPROM (WP is open
from the factory — JP2 unbridged), and verifies by readback. After the
next reboot, `/proc/device-tree/hat/product` reads `ExoPet HAT` and
the w1-gpio overlay loads automatically.

- [ ] `provision-hat.sh` reports VERIFY OK
- [ ] after reboot: `cat /proc/device-tree/hat/vendor` → `ExoPet`

## Stage 4 — relays

For each channel (GPIO 17=CH1, 27=CH2, 22=CH3, 23=AUX):

    gpioset --mode=time --sec=1 gpiochip0 <gpio>=1

- [ ] audible click + channel LED on (top side, beside the terminal)
- [ ] CH1–CH3: 12 V across the channel's +/− terminal while on
- [ ] AUX: COM↔NO closes while on (continuity), COM↔NC opens
- [ ] all four release when the pulse ends

Failure branch: no click but LED on → relay; neither → U2 input
continuity from the GPIO pin; 12 V missing at terminal → F2–F4 fuse.

## Stage 5 — float inputs

    gpioget gpiochip0 16   # FLT1, expect 1 open
    gpioget gpiochip0 12   # FLT2, expect 1 open

- [ ] short the FLT terminal with a wire scrap → reads 0

## Stage 6 — temperature

Wire a DS18B20 to TEMP by the letters: **R**ed=3V3, **Y**ellow=data,
**B**lack=GND (clones may use white/blue for data: red and black to
their letters, the remaining wire to Y).

- [ ] `ls /sys/bus/w1/devices/` shows a `28-*` entry
- [ ] `cat /sys/bus/w1/devices/28-*/w1_slave` ends `t=<plausible °C×1000>`

## Sign-off

- [ ] All stages green → label the board PASS + date, into inventory.
- Board powers a deployed hub: bridge nothing (rev 2) / bridge JP1
  (rev 1, after Stage 1 passes).

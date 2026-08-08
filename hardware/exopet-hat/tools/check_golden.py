#!/usr/bin/env python3
"""Golden connectivity audit — the deep-QA gate before ordering.

EXPECT below is the ENTIRE design intent, written out by hand from the
spec/datasheets, deliberately NOT derived from the generators. It is
verified two ways:
  1. against the exported netlist (catches schematic-generator bugs)
  2. against the ROUTED BOARD's pad nets (catches board-generator and
     pad-mapping bugs — the class that shipped rev 1 with a netless Q1
     and a dead 12V rail)
Plus a netless-pad sweep: every numbered pad on the board must carry a
net (true no-connects carry KiCad's "unconnected-..." nets, so an
empty net string always means a generator miss).

Run with KiCad's bundled python:
  Python check_golden.py ../exopet-hat.kicad_pcb
"""
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

import pcbnew

HERE = Path(__file__).resolve().parent
import os as _os
_V = _os.environ.get("HAT_VARIANT", "std")
NETXML = HERE.parent / f"exopet-hat-{_V}.net.xml"
BOARD = sys.argv[1] if len(sys.argv) > 1 else str(HERE.parent / "exopet-hat.kicad_pcb")

NC = "~NC~"  # accepts a KiCad auto "unconnected-..." net or no net

# ── design intent: every (ref, pin) -> net ──────────────────────
EXPECT = {
    # power input: jack -> 5A fuse -> reverse-protection PFET -> +12V
    "J1": {"1": "+12V_IN", "2": "GND", "3": NC},
    "F1": {"1": "+12V_IN", "2": "+12V_F"},
    "D1": {"1": "+12V_F", "2": "GND"},          # bidirectional TVS
    "Q1": {"G": "Q1_G", "D": "+12V_F", "S": "+12V"},
    "R1": {"1": "Q1_G", "2": "GND"},
    # integrated 5V buck (TPS54302): 12V in, 5.06V out, JP1 links to Pi
    "U6": {"1": "GND", "2": "BUCK_SW", "3": "+12V", "4": "BUCK_FB",
           "5": NC, "6": "BUCK_BOOT"},
    "C7": {"1": "BUCK_BOOT", "2": "BUCK_SW"},
    "L1": {"1": "BUCK_SW", "2": "+5V_BUCK"},
    "C8": {"1": "+12V", "2": "GND"},
    "C10": {"1": "+12V", "2": "GND"},
    "C2": {"1": "+12V", "2": "GND"},
    "C16": {"1": "+12V", "2": "GND"},
    "C11": {"1": "+5V_BUCK", "2": "GND"},
    "C12": {"1": "+5V_BUCK", "2": "GND"},
    "R16": {"1": "+5V_BUCK", "2": "BUCK_FB"},
    "R17": {"1": "BUCK_FB", "2": "GND"},
    "D3": {"1": "+5V", "2": "+5V_BUCK"},
    "C1": {"1": "+12V", "2": "GND"},
    "C17": {"1": "+5V_BUCK", "2": "BUCK_FB"},
    # relay driver: GPIO 17/27/22/23 in, open-drain sinks out,
    # COM (flyback) pin on +12V
    "U2": {"1": "GPIO17", "2": "GPIO27", "3": "GPIO22", "4": "GPIO23",
           "5": "GND", "6": "GND", "7": "GND", "8": "GND", "9": "+12V",
           "16": "RLY1_DRV", "15": "RLY2_DRV", "14": "RLY3_DRV",
           "13": "RLY4_DRV", "10": NC, "11": NC, "12": NC},
    # relays: coil 2/5, COM 1 fed through per-channel 1A PTC, NO 3 out
    "K1": {"2": "+12V", "5": "RLY1_DRV", "1": "CH1_FUSED",
           "3": "CH1_OUT", "4": NC},
    "K2": {"2": "+12V", "5": "RLY2_DRV", "1": "CH2_FUSED",
           "3": "CH2_OUT", "4": NC},
    "K3": {"2": "+12V", "5": "RLY3_DRV", "1": "CH3_FUSED",
           "3": "CH3_OUT", "4": NC},
    "K4": {"2": "+12V", "5": "RLY4_DRV", "1": "CH4_COM",
           "3": "CH4_NO", "4": "CH4_NC"},
    "F2": {"1": "+12V", "2": "CH1_FUSED"},
    "F3": {"1": "+12V", "2": "CH2_FUSED"},
    "F4": {"1": "+12V", "2": "CH3_FUSED"},
    # output terminals: left position + (switched 12V), right - (GND)
    "J8": {"1": "CH1_OUT", "2": "GND"},
    "J9": {"1": "CH2_OUT", "2": "GND"},
    "J10": {"1": "CH3_OUT", "2": "GND"},
    "J11": {"1": "CH4_COM", "2": "CH4_NO", "3": "CH4_NC"},
    # per-channel flyback for inductive valve/pump loads
    "D9": {"1": "CH1_OUT", "2": "GND"},
    "D10": {"1": "CH2_OUT", "2": "GND"},
    "D11": {"1": "CH3_OUT", "2": "GND"},
    # channel LEDs across the driver (light when coil energized)
    "R5": {"1": "+12V", "2": "LED1_A"},
    "R6": {"1": "+12V", "2": "LED2_A"},
    "R7": {"1": "+12V", "2": "LED3_A"},
    "R8": {"1": "+12V", "2": "LED4_A"},
    "D5": {"2": "LED1_A", "1": "RLY1_DRV"},
    "D6": {"2": "LED2_A", "1": "RLY2_DRV"},
    "D7": {"2": "LED3_A", "1": "RLY3_DRV"},
    "D8": {"2": "LED4_A", "1": "RLY4_DRV"},
    # rail LEDs
    "R19": {"1": "+12V", "2": "LED12V_A"},
    "D12": {"2": "LED12V_A", "1": "GND"},
    "R20": {"1": "+5V_BUCK", "2": "LED5V_A"},
    "D13": {"2": "LED5V_A", "1": "GND"},
    # 1-Wire temperature front end
    "J4": {"1": "+3V3", "2": "1WIRE_DATA", "3": "GND"},
    "R2": {"1": "+3V3", "2": "1WIRE_DATA"},
    "U5": {"1": "1WIRE_DATA", "2": "GND"},
    "C3": {"1": "+3V3", "2": "GND"},
    # float switches: pull-up, series R to GPIO, debounce C
    "J13": {"1": "FLOAT1_SW", "2": "GND"},
    "J14": {"1": "FLOAT2_SW", "2": "GND"},
    "R10": {"1": "+3V3", "2": "FLOAT1_SW"},
    "R11": {"1": "+3V3", "2": "FLOAT2_SW"},
    "R12": {"1": "FLOAT1_SW", "2": "FLOAT1_GPIO"},
    "R13": {"1": "FLOAT2_SW", "2": "FLOAT2_GPIO"},
    "C5": {"1": "FLOAT1_SW", "2": "GND"},
    "C6": {"1": "FLOAT2_SW", "2": "GND"},
    # HAT ID EEPROM
    "U4": {"1": "GND", "2": "GND", "3": "GND", "4": "GND",
           "5": "EEPROM_SDA", "6": "EEPROM_SCL", "7": "EEPROM_WP",
           "8": "+3V3"},
    "C4": {"1": "+3V3", "2": "GND"},
    "R3": {"1": "+3V3", "2": "EEPROM_SDA"},
    "R4": {"1": "+3V3", "2": "EEPROM_SCL"},
    "R9": {"1": "EEPROM_WP", "2": "GND"},
    "JP2": {"1": "EEPROM_WP", "2": "+3V3"},
    # test points
    "TP1": {"1": "+12V"},
    "TP2": {"1": "+5V_BUCK"},
    "TP3": {"1": "+3V3"},
    "TP4": {"1": "GND"},
    # float supervision ADC (both variants)
    "U7": {"1": "GND", "2": NC, "3": "GND", "4": "FLT1_SENSE",
           "5": "FLT2_SENSE", "6": "GND", "7": "GND", "8": "+3V3",
           "9": "I2C1_SDA", "10": "I2C1_SCL"},
    "R22": {"1": "FLOAT1_SW", "2": "FLT1_SENSE"},
    "R23": {"1": "FLOAT2_SW", "2": "FLT2_SENSE"},
    "C18": {"1": "+3V3", "2": "GND"},
    # Pi header — the HAT/Pi contract (spec §8)
    "J3": {"1": "+3V3", "17": "+3V3", "2": "+5V", "4": "+5V",
           "6": "GND", "9": "GND", "14": "GND", "20": "GND",
           "25": "GND", "30": "GND", "34": "GND", "39": "GND",
           "7": "1WIRE_DATA",
           "11": "GPIO17", "13": "GPIO27", "15": "GPIO22",
           "16": "GPIO23",
           "27": "EEPROM_SDA", "28": "EEPROM_SCL",
           "36": "FLOAT1_GPIO", "32": "FLOAT2_GPIO",
           "3": "I2C1_SDA", "5": "I2C1_SCL", "8": NC, "10": NC, "12": NC, "18": NC,
           "19": NC, "21": NC, "22": NC, "23": NC, "24": NC, "26": NC,
           "29": NC, "31": NC, "33": NC, "35": NC, "37": NC, "38": NC,
           "40": NC},
}

# pro-variant additions (isolated pH island)
EXPECT_PRO = {
    "PS1": {"1": "+5V_BUCK", "2": "GND", "3": "ISO_GND", "4": "+5V_ISO"},
    "C27": {"1": "+5V_BUCK", "2": "GND"},
    # LDO: raw +5V_ISO in -> clean +3V3_ISO out (overvoltage/ripple fix)
    "U11": {"3": "+5V_ISO", "1": "ISO_GND", "2": "+3V3_ISO"},
    "C22": {"1": "+5V_ISO", "2": "ISO_GND"},
    "C28": {"1": "+3V3_ISO", "2": "ISO_GND"},
    "U9": {"1": "+3V3", "2": "I2C1_SDA", "3": "I2C1_SCL", "4": "GND",
           "5": "ISO_GND", "6": "ISO_SCL", "7": "ISO_SDA", "8": "+3V3_ISO"},
    "C20": {"1": "+3V3", "2": "GND"},
    "C21": {"1": "+3V3_ISO", "2": "ISO_GND"},
    "R26": {"1": "+3V3_ISO", "2": "ISO_SDA"},
    "R27": {"1": "+3V3_ISO", "2": "ISO_SCL"},
    "J15": {"1": "PH_IN", "2": "PH_REF"},
    "U10": {"1": "PH_BUF", "2": "PH_BUF", "3": "PH_IN", "4": "ISO_GND",
            "5": "BIAS_MID", "6": "PH_REF", "7": "PH_REF", "8": "+3V3_ISO"},
    "R24": {"1": "+3V3_ISO", "2": "BIAS_MID"},
    "R25": {"1": "BIAS_MID", "2": "ISO_GND"},
    "C26": {"1": "BIAS_MID", "2": "ISO_GND"},
    "U8": {"1": "+3V3_ISO", "2": NC, "3": "ISO_GND", "4": "PH_BUF",
           "5": "PH_REF", "6": "ISO_GND", "7": "ISO_GND", "8": "+3V3_ISO",
           "9": "ISO_SDA", "10": "ISO_SCL"},
    "C25": {"1": "+3V3_ISO", "2": "ISO_GND"},
}
import os as _os
if _os.environ.get("HAT_VARIANT", "std") == "pro":
    EXPECT.update(EXPECT_PRO)

# footprint pad number -> netlist pin, where symbols use letters
PAD_PIN_MAP = {"Q1": {"1": "G", "2": "D", "3": "S"}}


def ok_net(want, got):
    if want == NC:
        return got is None or got == "" or got.startswith("unconnected-")
    return got == want


fail = 0

# ── 1. netlist audit ────────────────────────────────────────────
pin_net = {}
for net in ET.parse(NETXML).iter("net"):
    for node in net.iter("node"):
        pin_net[(node.get("ref"), node.get("pin"))] = net.get("name")

for ref, pins in EXPECT.items():
    for pin, want in pins.items():
        got = pin_net.get((ref, pin))
        if not ok_net(want, got):
            print(f"FAIL netlist {ref}.{pin}: want {want}, got {got}")
            fail += 1

# every netlist node must be covered by EXPECT (no unaudited pins)
for (ref, pin), net in pin_net.items():
    if ref not in EXPECT or pin not in EXPECT[ref]:
        print(f"FAIL coverage: netlist has unaudited pin {ref}.{pin} ({net})")
        fail += 1

# ── 2. routed-board pad audit + netless sweep ───────────────────
board = pcbnew.LoadBoard(BOARD)
seen = set()
for fp in board.GetFootprints():
    ref = fp.GetReference()
    if ref.startswith("H"):
        continue  # mounting holes
    for pad in fp.Pads():
        num = pad.GetNumber()
        if not num:
            continue  # unnumbered mechanical/paste pads
        nl_pin = PAD_PIN_MAP.get(ref, {}).get(num, num)
        got = pad.GetNetname()
        want = EXPECT.get(ref, {}).get(nl_pin)
        if want is None:
            print(f"FAIL coverage: board pad {ref}.{num} not in EXPECT ({got})")
            fail += 1
            continue
        seen.add((ref, nl_pin))
        if not ok_net(want, got):
            print(f"FAIL board {ref}.{num}: want {want}, got {got!r}")
            fail += 1

# every EXPECT entry must exist on the board
for ref, pins in EXPECT.items():
    for pin in pins:
        if (ref, pin) not in seen:
            print(f"FAIL board: expected pad {ref}.{pin} not found")
            fail += 1

n_pins = sum(len(p) for p in EXPECT.values())
print(f"GOLDEN: {'FAIL' if fail else 'PASS'} "
      f"({len(EXPECT)} parts, {n_pins} pins audited on netlist + board)")
sys.exit(1 if fail else 0)

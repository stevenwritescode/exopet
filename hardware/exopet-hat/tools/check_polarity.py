#!/usr/bin/env python3
"""Polarity lint: assert the cathode/positive-pin net of every polarized
part against the design's intent, straight from the exported netlist.

Motivated by rev 1's D1 bug: the TVS was net-assigned cathode-to-GND,
which forward-clamps the 12V input to ~0.7V and makes the board look
dead. Per-feature checks passed because both sides of the comparison
shared the mistake; this lint encodes the *physical* intent instead.

Convention: KiCad 2-pin diode/LED symbols and D_* footprints put the
CATHODE on pin/pad 1. Electrolytic C_Polarized puts POSITIVE on pin 1.

Run after gen_schematic.py + netlist export:
  python3 check_polarity.py
"""
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

NET = Path(__file__).resolve().parent.parent / "exopet-hat.net.xml"

# ref -> {pin: expected_net}. Pin 1 = cathode (diodes/LEDs) or + (caps).
EXPECT = {
    # input TVS: bidirectional in rev 2; cathode pad on the rail so a
    # future unidirectional substitution still ends up reverse-biased
    "D1":  {"1": "+12V_F", "2": "GND"},
    # channel flyback diodes: cathode on the switched output, anode GND
    "D9":  {"1": "CH1_OUT", "2": "GND"},
    "D10": {"1": "CH2_OUT", "2": "GND"},
    "D11": {"1": "CH3_OUT", "2": "GND"},
    # channel LEDs: cathode into the sink driver, anode via resistor
    "D5":  {"1": "RLY1_DRV"},
    "D6":  {"1": "RLY2_DRV"},
    "D7":  {"1": "RLY3_DRV"},
    "D8":  {"1": "RLY4_DRV"},
    # rail LEDs: cathode to GND
    "D12": {"1": "GND"},
    "D13": {"1": "GND"},
    # 5V safety diode: cathode to the Pi rail, anode from the buck
    "D3":  {"1": "+5V", "2": "+5V_BUCK"},
    # bulk input electrolytic: positive on +12V
    "C1":  {"1": "+12V"},
    # buck IC sanity: TPS54302 — GND 1, SW 2, VIN 3
    "U6":  {"1": "GND", "2": "BUCK_SW", "3": "+12V"},
    # input P-FET: drain from the fuse, source to the rail, gate pulled
    "Q1":  {"D": "+12V_F", "S": "+12V", "G": "Q1_G"},
}

tree = ET.parse(NET)
# node net lookup: (ref, pin) -> net name
pin_net = {}
for net in tree.iter("net"):
    name = net.get("name")
    for node in net.iter("node"):
        pin_net[(node.get("ref"), node.get("pin"))] = name

fail = 0
for ref, pins in EXPECT.items():
    for pin, want in pins.items():
        got = pin_net.get((ref, pin))
        ok = got == want
        if not ok:
            fail += 1
        print(f"{'OK ' if ok else 'FAIL'} {ref}.{pin}: want {want}, got {got}")

print("POLARITY:", "FAIL" if fail else "ALL CORRECT")
sys.exit(1 if fail else 0)

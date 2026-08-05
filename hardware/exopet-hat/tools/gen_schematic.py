#!/usr/bin/env python3
"""Generate exopet-hat.kicad_sch from the design spec's net map.

Connectivity is authoritative (global label anchored at every pin);
placement is a readable block grid meant for GUI polish later.
Verify with: kicad-cli sch erc / export netlist.
"""
import re
import uuid
from pathlib import Path

SYMDIR = Path("/Applications/KiCad/KiCad.app/Contents/SharedSupport/symbols")
OUT = Path(__file__).resolve().parent.parent / "exopet-hat.kicad_sch"
ROOT_UUID = "e0a7e100-0000-4000-8000-00000000c0de"
PROJECT = "exopet-hat"

NS = uuid.UUID("12345678-1234-5678-1234-567812345678")


def uid(*parts):
    return str(uuid.uuid5(NS, ":".join(str(p) for p in parts)))


def extract_symbol(lib, name):
    text = (SYMDIR / f"{lib}.kicad_sym").read_text()
    start = text.find(f'(symbol "{name}"')
    if start < 0:
        raise KeyError(f"{lib}:{name}")
    depth, i = 0, start
    while True:
        if text[i] == "(":
            depth += 1
        elif text[i] == ")":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]
        i += 1


def pin_map(sym_text):
    """pin number -> (x, y) connection point in lib coords."""
    pins = {}
    for m in re.finditer(
        r"\(pin\s+\w+\s+\w+\s*\n?\s*\(at\s+([-\d.]+)\s+([-\d.]+)\s+([\d.]+)\)"
        r".*?\(number\s+\"([^\"]*)\"",
        sym_text,
        re.S,
    ):
        x, y, _ang, num = m.groups()
        pins[num] = (float(x), float(y))
    return pins


# ── symbols to embed ────────────────────────────────────────────
LIBS = {
    "Connector:Barrel_Jack_Switch": None,
    "Connector:Raspberry_Pi_2_3": None,
    "Connector:Conn_Coaxial": None,
    "Connector_Audio:AudioJack3": None,
    "Connector_Generic:Conn_01x02": None,
    "Connector_Generic:Conn_01x03": None,
    "Connector_Generic:Conn_01x04": None,
    "Connector_Generic:Conn_01x05": None,
    "Device:R": None,
    "Device:C": None,
    "Device:C_Polarized": None,
    "Device:LED": None,
    "Device:D_Schottky": None,
    "Device:D_TVS": None,
    "Device:Polyfuse": None,
    "Device:Q_PMOS": None,
    "Relay:G5LE-1": None,
    "Transistor_Array:ULN2003": None,
    "Memory_EEPROM:24LC16": None,
    "Jumper:SolderJumper_2_Open": None,
    "Regulator_Switching:TPS54302": None,
    "Device:L": None,
    "Connector:TestPoint": None,
    "power:PWR_FLAG": None,
}

for key in LIBS:
    lib, name = key.split(":")
    LIBS[key] = extract_symbol(lib, name)

PINS = {key: pin_map(text) for key, text in LIBS.items()}

# ── component instances ─────────────────────────────────────────
# (ref, lib_id, value, (x, y), {pin: net}, [no_connect pins], footprint)
NC = "~NC~"  # sentinel: place a no_connect marker on this pin

C = []

def add(ref, lib_id, value, pos, nets, footprint="", lcsc=""):
    C.append((ref, lib_id, value, pos, nets, footprint, lcsc))

# — Power input block (column 1) —
add("J1", "Connector:Barrel_Jack_Switch", "12V DC in", (30, 40),
    {"1": "+12V_IN", "2": "GND", "3": NC},
    "Connector_BarrelJack:BarrelJack_CUI_PJ-102AH_Horizontal")
# J2 (aux 12V input) removed: barrel jack is the sole input.
add("F1", "Device:Polyfuse", "MF-RG500 5A", (55, 40),
    {"1": "+12V_IN", "2": "+12V_F"},
    "Fuse:Fuse_Bourns_MF-RG500", "VERIFY")
# pad 1 (cathode mark) on the rail: a unidirectional substitution
# still lands reverse-biased. Rev 1 had this swapped — the installed
# SMBJ16A forward-clamped the input and the board played dead.
add("D1", "Device:D_TVS", "SMBJ16CA bidirectional", (55, 60),
    {"1": "+12V_F", "2": "GND"},
    "Diode_SMD:D_SMB", "VERIFY")
add("Q1", "Device:Q_PMOS", "AOD403", (80, 40),
    {"D": "+12V_F", "G": "Q1_G", "S": "+12V"},
    "Package_TO_SOT_SMD:TO-252-2", "C28969")
add("R1", "Device:R", "100k", (80, 60),
    {"1": "Q1_G", "2": "GND"},
    "Resistor_SMD:R_0805_2012Metric", "C17407")
# rev 2: bulk electrolytic replaced by ceramics (C8/C16); the tall
# radial was the part that forced the >=11mm stacking GPIO socket.
add("C16", "Device:C", "10uF 25V X7R 1206", (105, 40),
    {"1": "+12V", "2": "GND"},
    "Capacitor_SMD:C_1206_3216Metric", "VERIFY")
add("C2", "Device:C", "100nF", (105, 60),
    {"1": "+12V", "2": "GND"},
    "Capacitor_SMD:C_0805_2012Metric", "C49678")

# — Integrated 5V buck: TPS54302 (synchronous, 3A, internal comp/SS).
# Chosen over the spec's TPS54531 in rev 2: half the parts, no catch
# diode, and it fits the board. Pi 4 official supply is the same 3A
# class. FB divider 100k/13.3k -> 5.06V (Vref 0.596V).
add("U6", "Regulator_Switching:TPS54302", "TPS54302DDC", (30, 90),
    {"1": "GND", "2": "BUCK_SW", "3": "+12V", "4": "BUCK_FB",
     "5": NC, "6": "BUCK_BOOT"},
    "Package_TO_SOT_SMD:SOT-23-6", "VERIFY")
add("C7", "Device:C", "100nF 16V X7R (boot)", (55, 85),
    {"1": "BUCK_BOOT", "2": "BUCK_SW"},
    "Capacitor_SMD:C_0805_2012Metric", "C49678")
add("L1", "Device:L", "6.8uH 5A+ (IHLP-2525 class)", (75, 85),
    {"1": "BUCK_SW", "2": "+5V_BUCK"},
    "Inductor_SMD:L_Vishay_IHLP-2525", "VERIFY")
add("C8", "Device:C", "10uF 25V X7R 1206", (95, 85),
    {"1": "+12V", "2": "GND"},
    "Capacitor_SMD:C_1206_3216Metric", "VERIFY")
add("C10", "Device:C", "100nF 50V (HF in)", (110, 85),
    {"1": "+12V", "2": "GND"},
    "Capacitor_SMD:C_0805_2012Metric", "C49678")
add("C11", "Device:C", "22uF 10V X5R 1210", (95, 100),
    {"1": "+5V_BUCK", "2": "GND"},
    "Capacitor_SMD:C_1210_3225Metric", "VERIFY")
add("C12", "Device:C", "22uF 10V X5R 1210", (110, 100),
    {"1": "+5V_BUCK", "2": "GND"},
    "Capacitor_SMD:C_1210_3225Metric", "VERIFY")
add("R16", "Device:R", "100k (FB hi)", (75, 110),
    {"1": "+5V_BUCK", "2": "BUCK_FB"},
    "Resistor_SMD:R_0805_2012Metric", "C17407")
add("R17", "Device:R", "13.3k (FB lo -> 5.06V)", (90, 110),
    {"1": "BUCK_FB", "2": "GND"},
    "Resistor_SMD:R_0805_2012Metric", "VERIFY")
# — Rail indicator LEDs (TOP side) + test points —
add("R19", "Device:R", "2.2k", (30, 240),
    {"1": "+12V", "2": "LED12V_A"},
    "Resistor_SMD:R_0805_2012Metric", "C17520")
add("D12", "Device:LED", "green 12V-OK", (45, 240),
    {"2": "LED12V_A", "1": "GND"},
    "LED_SMD:LED_0805_2012Metric", "C2297")
add("R20", "Device:R", "1k", (60, 240),
    {"1": "+5V_BUCK", "2": "LED5V_A"},
    "Resistor_SMD:R_0805_2012Metric", "C17513")
add("D13", "Device:LED", "green 5V-OK", (75, 240),
    {"2": "LED5V_A", "1": "GND"},
    "LED_SMD:LED_0805_2012Metric", "C2297")
for i, (tp, net) in enumerate([("TP1", "+12V"), ("TP2", "+5V_BUCK"),
                               ("TP3", "+3V3"), ("TP4", "GND")]):
    add(tp, "Connector:TestPoint", net, (95 + i * 15, 240),
        {"1": net}, "TestPoint:TestPoint_Pad_D1.5mm")
add("JP1", "Jumper:SolderJumper_2_Open", "5V link (open = USB-C debug)", (55, 90),
    {"1": "+5V_BUCK", "2": "+5V"},
    "Jumper:SolderJumper-2_P1.3mm_Open_RoundedPad1.0x1.5mm")

# — Raspberry Pi header (column 2) —
add("J3", "Connector:Raspberry_Pi_2_3", "RPi GPIO (HAT)", (170, 70),
    {
        "1": "+3V3", "17": "+3V3",
        "2": "+5V", "4": "+5V",
        "6": "GND", "9": "GND", "14": "GND", "20": "GND",
        "25": "GND", "30": "GND", "34": "GND", "39": "GND",
        "3": NC, "5": NC,
        "7": "1WIRE_DATA",
        "11": "GPIO17", "13": "GPIO27", "15": "GPIO22", "16": "GPIO23",
        "27": "EEPROM_SDA", "28": "EEPROM_SCL",
        "36": "FLOAT1_GPIO", "32": "FLOAT2_GPIO",
        "8": NC, "10": NC, "12": NC, "18": NC, "19": NC, "21": NC,
        "22": NC, "23": NC, "24": NC, "26": NC, "29": NC, "31": NC,
        "33": NC, "35": NC, "37": NC, "38": NC, "40": NC,
    }, "Connector_PinSocket_2.54mm:PinSocket_2x20_P2.54mm_Vertical")

# — Relay driver (column 3) —
add("U2", "Transistor_Array:ULN2003", "TBD62003AFG", (240, 45),
    {
        "1": "GPIO17", "2": "GPIO27", "3": "GPIO22", "4": "GPIO23",
        "5": "GND", "6": "GND", "7": "GND",
        "8": "GND", "9": "+12V",
        "16": "RLY1_DRV", "15": "RLY2_DRV", "14": "RLY3_DRV", "13": "RLY4_DRV",
        "10": NC, "11": NC, "12": NC,
    }, "Package_SO:SOIC-16_3.9x9.9mm_P1.27mm", "C163227")

# — Relays + per-channel parts (column 4) —
for n, y in ((1, 40), (2, 80), (3, 120)):
    add(f"K{n}", "Relay:G5LE-1", "G5LE-1-CF DC12", (290, y),
        {"2": "+12V", "5": f"RLY{n}_DRV",
         "1": f"CH{n}_FUSED", "3": f"CH{n}_OUT", "4": NC},
        "Relay_THT:Relay_SPDT_Omron-G5LE-1", "C1524650")
    add(f"F{n+1}", "Device:Polyfuse", "MF-RHT100 1A", (315, y),
        {"1": "+12V", "2": f"CH{n}_FUSED"},
        "Fuse:Fuse_Bourns_MF-RHT100", "VERIFY")
    add(f"D{n+8}", "Device:D_Schottky", "SS34", (340, y),
        {"1": f"CH{n}_OUT", "2": "GND"},
        "Diode_SMD:D_SMA", "C8678")
    add(f"J{n+7}", "Connector_Generic:Conn_01x02", f"CH{n} 12V OUT", (365, y),
        {"1": f"CH{n}_OUT", "2": "GND"},
        "TerminalBlock_Phoenix:TerminalBlock_Phoenix_PT-1,5-2-3.5-H_1x02_P3.50mm_Horizontal")

add("K4", "Relay:G5LE-1", "G5LE-1-CF DC12", (290, 160),
    {"2": "+12V", "5": "RLY4_DRV",
     "1": "CH4_COM", "3": "CH4_NO", "4": "CH4_NC"},
    "Relay_THT:Relay_SPDT_Omron-G5LE-1", "C1524650")
add("J11", "Connector_Generic:Conn_01x03", "CH4 dry contact", (340, 160),
    {"1": "CH4_COM", "2": "CH4_NO", "3": "CH4_NC"},
    "TerminalBlock_Phoenix:TerminalBlock_Phoenix_PT-1,5-3-3.5-H_1x03_P3.50mm_Horizontal")

# — Relay state LEDs (column 3 lower) —
for n, y in ((1, 100), (2, 120), (3, 140), (4, 160)):
    add(f"R{n+4}", "Device:R", "2.2k", (225, y),
        {"1": "+12V", "2": f"LED{n}_A"},
        "Resistor_SMD:R_0805_2012Metric", "C17520")
    add(f"D{n+4}", "Device:LED", "green", (250, y),
        {"2": f"LED{n}_A", "1": f"RLY{n}_DRV"},
        "LED_SMD:LED_0805_2012Metric", "C2297")

# — 1-Wire temperature (column 1, lower) —
add("J4", "Connector_Generic:Conn_01x03", "TEMP (3V3/DATA/GND)", (30, 130),
    {"1": "+3V3", "2": "1WIRE_DATA", "3": "GND"},
    "TerminalBlock_Phoenix:TerminalBlock_Phoenix_PT-1,5-3-3.5-H_1x03_P3.50mm_Horizontal")
# J5 (JST duplicate of the TRS jack) removed: no board space in rev 1.
add("R2", "Device:R", "4.7k", (60, 130),
    {"1": "+3V3", "2": "1WIRE_DATA"},
    "Resistor_SMD:R_0805_2012Metric", "C17673")
add("U5", "Device:D_TVS", "5V ESD clamp (SOD-323)", (60, 155),
    {"1": "1WIRE_DATA", "2": "GND"},
    "Diode_SMD:D_SOD-323", "C19224")
add("C3", "Device:C", "100nF", (85, 130),
    {"1": "+3V3", "2": "GND"},
    "Capacitor_SMD:C_0805_2012Metric", "C49678")

# pH deferred to rev 2 (isolated design). I2C1 left unconnected.

# — Float switch inputs (tank: GPIO16, sump: GPIO12) —
for n, gpio_net, y in ((1, "FLOAT1_GPIO", 185), (2, "FLOAT2_GPIO", 210)):
    add(f"J{n+12}", "Connector_Generic:Conn_01x02", f"FLOAT{n} switch", (30, y),
        {"1": f"FLOAT{n}_SW", "2": "GND"},
        "TerminalBlock_Phoenix:TerminalBlock_Phoenix_PT-1,5-2-3.5-H_1x02_P3.50mm_Horizontal")
    add(f"R{n+9}", "Device:R", "10k", (55, y),
        {"1": "+3V3", "2": f"FLOAT{n}_SW"},
        "Resistor_SMD:R_0805_2012Metric", "C17414")
    add(f"R{n+11}", "Device:R", "1k", (75, y),
        {"1": f"FLOAT{n}_SW", "2": gpio_net},
        "Resistor_SMD:R_0805_2012Metric", "C17513")
    add(f"C{n+4}", "Device:C", "100nF", (95, y),
        {"1": f"FLOAT{n}_SW", "2": "GND"},
        "Capacitor_SMD:C_0805_2012Metric", "C49678")

# — HAT ID EEPROM (column 2, lower) —
add("U4", "Memory_EEPROM:24LC16", "CAT24C32", (150, 160),
    {"1": "GND", "2": "GND", "3": "GND", "4": "GND",
     "5": "EEPROM_SDA", "6": "EEPROM_SCL", "7": "EEPROM_WP", "8": "+3V3"},
    "Package_SO:SOIC-8_3.9x4.9mm_P1.27mm", "VERIFY")
add("C4", "Device:C", "100nF", (150, 185),
    {"1": "+3V3", "2": "GND"},
    "Capacitor_SMD:C_0805_2012Metric", "C49678")
add("R3", "Device:R", "3.9k", (180, 145),
    {"1": "+3V3", "2": "EEPROM_SDA"},
    "Resistor_SMD:R_0805_2012Metric", "C26010")
add("R4", "Device:R", "3.9k", (195, 145),
    {"1": "+3V3", "2": "EEPROM_SCL"},
    "Resistor_SMD:R_0805_2012Metric", "C26010")
add("R9", "Device:R", "10k", (180, 175),
    {"1": "EEPROM_WP", "2": "GND"},
    "Resistor_SMD:R_0805_2012Metric", "C17414")
add("JP2", "Jumper:SolderJumper_2_Open", "WP (close = protect)", (195, 175),
    {"1": "EEPROM_WP", "2": "+3V3"},
    "Jumper:SolderJumper-2_P1.3mm_Open_RoundedPad1.0x1.5mm")

# — Power flags for ERC —
for i, net in enumerate(["+12V_IN", "+12V", "+5V", "+5V_BUCK", "+3V3", "GND"]):
    add(f"#FLG{i+1}", "power:PWR_FLAG", "PWR_FLAG", (30 + i * 20, 215),
        {"1": net})

# ── emit ────────────────────────────────────────────────────────
def esc(s):
    return s.replace("\\", "\\\\").replace('"', '\\"')


body = []
body.append('(kicad_sch (version 20231120) (generator "gen_schematic.py") (generator_version "8.0")')
body.append(f'  (uuid "{ROOT_UUID}")')
body.append('  (paper "A2")')

# lib_symbols with prefixed names
body.append("  (lib_symbols")
for key, text in LIBS.items():
    lib, name = key.split(":")
    renamed = text.replace(f'(symbol "{name}"', f'(symbol "{key}"', 1)
    body.append("    " + renamed)
body.append("  )")

labels = []
noconnects = []

for ref, lib_id, value, (sx, sy), nets, footprint, lcsc in C:
    su = uid("sym", ref)
    body.append(f'  (symbol (lib_id "{esc(lib_id)}") (at {sx} {sy} 0) (unit 1)')
    body.append("    (exclude_from_sim no) (in_bom yes) (on_board yes) (dnp no)")
    body.append(f'    (uuid "{su}")')
    body.append(f'    (property "Reference" "{esc(ref)}" (at {sx} {sy - 3} 0) (effects (font (size 1.27 1.27))))')
    body.append(f'    (property "Value" "{esc(value)}" (at {sx} {sy + 3} 0) (effects (font (size 1.27 1.27))))')
    body.append(f'    (property "Footprint" "{esc(footprint)}" (at {sx} {sy} 0) (effects (font (size 1.27 1.27)) hide))')
    body.append(f'    (property "LCSC" "{esc(lcsc)}" (at {sx} {sy} 0) (effects (font (size 1.27 1.27)) hide))')
    for pnum in PINS[lib_id]:
        body.append(f'    (pin "{pnum}" (uuid "{uid("pin", ref, pnum)}"))')
    body.append("    (instances")
    body.append(f'      (project "{PROJECT}"')
    body.append(f'        (path "/{ROOT_UUID}" (reference "{esc(ref)}") (unit 1))')
    body.append("      )")
    body.append("    )")
    body.append("  )")

    seen_positions = set()
    for pnum, net in nets.items():
        px, py = PINS[lib_id][pnum]
        ax, ay = round(sx + px, 2), round(sy - py, 2)
        if net == NC:
            if (ax, ay) not in seen_positions:
                noconnects.append((ax, ay, uid("nc", ref, pnum)))
            seen_positions.add((ax, ay))
        else:
            labels.append((net, ax, ay, uid("lbl", ref, pnum)))

for net, ax, ay, lu in labels:
    body.append(
        f'  (global_label "{esc(net)}" (shape input) (at {ax} {ay} 0)'
        f' (effects (font (size 1.27 1.27)) (justify left))'
        f' (uuid "{lu}"))'
    )
for ax, ay, nu in noconnects:
    body.append(f'  (no_connect (at {ax} {ay}) (uuid "{nu}"))')

body.append('  (sheet_instances (path "/" (page "1")))')
body.append(")")

OUT.write_text("\n".join(body) + "\n")
print(f"wrote {OUT} ({len(C)} components, {len(labels)} labels, {len(noconnects)} no-connects)")

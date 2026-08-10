#!/usr/bin/env python3
"""Generate exopet-hat.kicad_sch from the design spec's net map.

Connectivity is authoritative (global label anchored at every pin);
placement is a readable block grid meant for GUI polish later.
Verify with: kicad-cli sch erc / export netlist.
"""
import re
import sys
import uuid
from pathlib import Path

# Two product variants from one source:
#   std — 65x56, HAT-spec compliant: relays + supervised floats + temp
#   pro — 65x70: std + isolated pH subsystem
VARIANT = sys.argv[1] if len(sys.argv) > 1 else "std"
assert VARIANT in ("std", "pro"), VARIANT

SYMDIR = Path("/Applications/KiCad/KiCad.app/Contents/SharedSupport/symbols")
OUT = Path(__file__).resolve().parent.parent / f"exopet-hat-{VARIANT}.kicad_sch"
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
                block = text[start : i + 1]
                break
        i += 1
    # derived symbols carry no pins; resolve to the base and rename it
    m = re.search(r'\(extends "([^"]+)"\)', block[:300])
    if m:
        base = m.group(1)
        block = extract_symbol(lib, base).replace(base, name)
    return block


def pin_map(sym_text):
    """pin number -> (x, y, unit). Multi-unit symbols keep pins inside
    child blocks NAME_<unit>_<style>; unit 0 pins are common (mapped
    to unit 1)."""
    pins = {}
    for cm in re.finditer(r'\(symbol "[^"]*_(\d+)_\d+"', sym_text):
        unit = int(cm.group(1)) or 1
        start = cm.start()
        depth, i = 0, start
        while True:
            if sym_text[i] == "(":
                depth += 1
            elif sym_text[i] == ")":
                depth -= 1
                if depth == 0:
                    break
            i += 1
        child = sym_text[start:i + 1]
        for m in re.finditer(
            r"\(pin\s+\w+\s+\w+\s*\n?\s*\(at\s+([-\d.]+)\s+([-\d.]+)\s+([\d.]+)\)"
            r".*?\(number\s+\"([^\"]*)\"",
            child,
            re.S,
        ):
            x, y, _ang, num = m.groups()
            pins[num] = (float(x), float(y), unit)
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
    "Analog_ADC:ADS1115IDGS": None,
    "Isolator:ISO1540": None,
    "Amplifier_Operational:MCP6002-xSN": None,
    "Regulator_Linear:AMS1117-3.3": None,
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

# Relay-output terminals: 5.08mm pitch (KF301/DG301 class), accept up to
# ~2.5mm2 / 14 AWG, matched to the G5LE 10A contact rating. Sensor
# terminals stay 3.5mm (tiny signal wires).
TERM_2P = "TerminalBlock_CUI:TerminalBlock_CUI_TB007-508-02_1x02_P5.08mm_Horizontal"
TERM_3P = "TerminalBlock_CUI:TerminalBlock_CUI_TB007-508-03_1x03_P5.08mm_Horizontal"
# 3.5mm (KF350) — sensors, and std's switched-12V channels (compact
# board can't fit four 5.08mm blocks; only the AUX gets the big one).
SENS_2P = "TerminalBlock_Phoenix:TerminalBlock_Phoenix_PT-1,5-2-3.5-H_1x02_P3.50mm_Horizontal"
CH_2P = TERM_2P if VARIANT == "pro" else SENS_2P
SENS_3P = "TerminalBlock_Phoenix:TerminalBlock_Phoenix_PT-1,5-3-3.5-H_1x03_P3.50mm_Horizontal"
CH_3P = TERM_3P if VARIANT == "pro" else SENS_3P

C = []

def add(ref, lib_id, value, pos, nets, footprint="", lcsc=""):
    C.append((ref, lib_id, value, pos, nets, footprint, lcsc))

def add_pro(*args, **kw):
    """add() only on the pro variant (pH island + 6-relay extras)."""
    if VARIANT == "pro":
        add(*args, **kw)

# — Power input block (column 1) —
add("J1", "Connector:Barrel_Jack_Switch", "12V DC in", (30, 40),
    {"1": "+12V_IN", "2": "GND", "3": NC},
    "Connector_BarrelJack:BarrelJack_CUI_PJ-102AH_Horizontal")
# J2 (aux 12V input) removed: barrel jack is the sole input.
# review finding: RG500's 5A hold derates to 4.4A@40C, below the ~4.6A
# sanctioned full load. RG700 holds 6.2A@40C; same 5.2mm lead pitch.
add("F1", "Device:Polyfuse", "MF-RG700 7A", (55, 40),
    {"1": "+12V_IN", "2": "+12V_F"},
    "Fuse:Fuse_Bourns_MF-RG500", "VERIFY")
# pad 1 (cathode mark) on the rail: a unidirectional substitution
# still lands reverse-biased. Rev 1 had this swapped — the installed
# SMBJ16A forward-clamped the input and the board played dead.
add("D1", "Device:D_TVS", "SMBJ16CA bidirectional", (55, 60),
    {"1": "+12V_F", "2": "GND"},
    "Diode_SMD:D_SMB", "C71870")
add("Q1", "Device:Q_PMOS", "AOD403", (80, 40),
    {"D": "+12V_F", "G": "Q1_G", "S": "+12V"},
    "Package_TO_SOT_SMD:TO-252-2", "C28969")
add("R1", "Device:R", "100k", (80, 60),
    {"1": "Q1_G", "2": "GND"},
    "Resistor_SMD:R_0805_2012Metric", "C17407")
add("C16", "Device:C", "10uF 25V X7R 1206", (105, 40),
    {"1": "+12V", "2": "GND"},
    "Capacitor_SMD:C_1206_3216Metric", "C14860")
# review finding: ceramics alone (~13uF derated) are not bulk; TI 7.3
# requires bulk for a remote (wall-adapter) supply and the rail also
# feeds four relay coils. 6.3x7.7 SMD electrolytic fits the stack.
add("C1", "Device:C_Polarized", "100uF 25V SMD electrolytic 6.3x7.7", (120, 40),
    {"1": "+12V", "2": "GND"},
    "Capacitor_SMD:CP_Elec_6.3x7.7", "C3338")
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
    "Package_TO_SOT_SMD:SOT-23-6", "C311983")
add("C7", "Device:C", "100nF 16V X7R (boot)", (55, 85),
    {"1": "BUCK_BOOT", "2": "BUCK_SW"},
    "Capacitor_SMD:C_0805_2012Metric", "C49678")
add("L1", "Device:L", "10uH Isat>=4.5A (IHLP-2525 class)", (75, 85),
    {"1": "BUCK_SW", "2": "+5V_BUCK"},
    "Inductor_SMD:L_Vishay_IHLP-2525", "VERIFY")
add("C8", "Device:C", "10uF 25V X7R 1206", (95, 85),
    {"1": "+12V", "2": "GND"},
    "Capacitor_SMD:C_1206_3216Metric", "C14860")
add("C10", "Device:C", "100nF 50V (HF in)", (110, 85),
    {"1": "+12V", "2": "GND"},
    "Capacitor_SMD:C_0805_2012Metric", "C49678")
add("C11", "Device:C", "22uF 25V X7R 1210", (95, 100),
    {"1": "+5V_BUCK", "2": "GND"},
    "Capacitor_SMD:C_1210_3225Metric", "C309062")
add("C12", "Device:C", "22uF 25V X7R 1210", (110, 100),
    {"1": "+5V_BUCK", "2": "GND"},
    "Capacitor_SMD:C_1210_3225Metric", "C309062")
add("R16", "Device:R", "100k (FB hi)", (75, 110),
    {"1": "+5V_BUCK", "2": "BUCK_FB"},
    "Resistor_SMD:R_0805_2012Metric", "C17407")
add("R17", "Device:R", "12.7k (FB lo -> 5.29V pre-diode)", (90, 110),
    {"1": "BUCK_FB", "2": "GND"},
    "Resistor_SMD:R_0805_2012Metric", "C17434")
add("C17", "Device:C", "75pF C0G (feedforward, TI Table 7-2)", (105, 110),
    {"1": "+5V_BUCK", "2": "BUCK_FB"},
    "Capacitor_SMD:C_0805_2012Metric", "C113832")
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
# rev 2: machine-placed 0R replaces the hand-soldered JP1 so boards
# leave assembly fully powered (production: no per-board hand step).
# Remove it with an iron to isolate the buck from the Pi rail.
# review findings: zero-ohm jumpers (0805 AND 1206) are 2A-rated, and
# the HAT design guide REQUIRES a power safety diode when back-powering.
# B550C: 5A 30V schottky, SMB. Buck runs 5.40V; Pi sees ~5.0-5.1V.
# Also kills the back-feed path (Pi USB-C could energize the barrel
# jack through the buck body diode + Q1). USB-C dual-supply now safe.
# SS56(LOWVF): 5A 60V schottky in SMB (DO-214AA), JLC Basic. The
# originally-specced "B550C" is SMC (DO-214AB) and would NOT fit this
# SMB footprint — package-verified swap to a genuine SMB 5A part.
add("D3", "Device:D_Schottky", "SS56 5A 60V (5V safety diode, SMB)", (55, 90),
    {"1": "+5V", "2": "+5V_BUCK"},
    "Diode_SMD:D_SMB", "C2891311")

# — Raspberry Pi header (column 2) —
add("J3", "Connector:Raspberry_Pi_2_3", "RPi GPIO (HAT)", (170, 70),
    {
        "1": "+3V3", "17": "+3V3",
        "2": "+5V", "4": "+5V",
        "6": "GND", "9": "GND", "14": "GND", "20": "GND",
        "25": "GND", "30": "GND", "34": "GND", "39": "GND",
        "3": "I2C1_SDA", "5": "I2C1_SCL",
        "7": "1WIRE_DATA",
        "11": "GPIO17", "13": "GPIO27", "15": "GPIO22", "16": "GPIO23",
        "27": "EEPROM_SDA", "28": "EEPROM_SCL",
        "36": "FLOAT1_GPIO", "32": "FLOAT2_GPIO",
        "8": NC, "10": NC, "12": NC, "19": NC, "21": NC,
        "23": NC, "24": NC, "26": NC, "29": NC, "31": NC,
        "33": NC, "35": NC, "37": NC, "38": NC, "40": NC,
        # pro adds two more relays -> GPIO24 (pin18), GPIO25 (pin22)
        "18": "GPIO24" if VARIANT == "pro" else NC,
        "22": "GPIO25" if VARIANT == "pro" else NC,
    }, "Connector_PinSocket_2.54mm:PinSocket_2x20_P2.54mm_Vertical")

# — Relay driver (column 3) —
# inputs 5/6 and outputs 12/11 drive CH5/CH6 on pro; grounded/NC on std
_drv5 = "GPIO24" if VARIANT == "pro" else "GND"
_drv6 = "GPIO25" if VARIANT == "pro" else "GND"
_out5 = "RLY5_DRV" if VARIANT == "pro" else NC
_out6 = "RLY6_DRV" if VARIANT == "pro" else NC
add("U2", "Transistor_Array:ULN2003", "TBD62003AFG", (240, 45),
    {
        "1": "GPIO17", "2": "GPIO27", "3": "GPIO22", "4": "GPIO23",
        "5": _drv5, "6": _drv6, "7": "GND",
        "8": "GND", "9": "+12V",
        "16": "RLY1_DRV", "15": "RLY2_DRV", "14": "RLY3_DRV", "13": "RLY4_DRV",
        "12": _out5, "11": _out6, "10": NC,
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
        CH_2P)

add("K4", "Relay:G5LE-1", "G5LE-1-CF DC12", (290, 160),
    {"2": "+12V", "5": "RLY4_DRV",
     "1": "CH4_COM", "3": "CH4_NO", "4": "CH4_NC"},
    "Relay_THT:Relay_SPDT_Omron-G5LE-1", "C1524650")
add("J11", "Connector_Generic:Conn_01x03", "CH4 dry contact", (340, 160),
    {"1": "CH4_COM", "2": "CH4_NO", "3": "CH4_NC"},
    CH_3P)

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
    "Package_SO:SOIC-8_3.9x4.9mm_P1.27mm", "C511262")
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

# ══ rev 3: supervised floats (main ADC) + isolated pH ══════════
# Main-side ADS1115 (addr 0x48): A0/A1 tap the float nets through 10k;
# EOL 100k resistors live INSIDE the sensor plugs (states: <0.3V
# closed, ~3.0V present+open, ~3.3V no sensor).
# A2/A3 (pins 6/7): grounded on std, general supervised switch inputs
# SW3/SW4 on pro.
_a2 = "SW3_SENSE" if VARIANT == "pro" else "GND"
_a3 = "SW4_SENSE" if VARIANT == "pro" else "GND"
add("U7", "Analog_ADC:ADS1115IDGS", "ADS1115 (sensors, 0x48)", (240, 200),
    {"1": "GND", "2": NC, "3": "GND", "4": "FLT1_SENSE", "5": "FLT2_SENSE",
     "6": _a2, "7": _a3, "8": "+3V3", "9": "I2C1_SDA", "10": "I2C1_SCL"},
    "Package_SO:MSOP-10_3x3mm_P0.5mm", "C37593")
add("R22", "Device:R", "10k", (215, 195),
    {"1": "FLOAT1_SW", "2": "FLT1_SENSE"},
    "Resistor_SMD:R_0805_2012Metric", "C17414")
add("R23", "Device:R", "10k", (215, 205),
    {"1": "FLOAT2_SW", "2": "FLT2_SENSE"},
    "Resistor_SMD:R_0805_2012Metric", "C17414")
add("C18", "Device:C", "100nF", (240, 220),
    {"1": "+3V3", "2": "GND"},
    "Capacitor_SMD:C_0805_2012Metric", "C49678")
# — pro: two general supervised switch inputs SW3/SW4 (ADC-only, via
# U7 A2/A3). Same 3-state EOL scheme as the floats; 100k EOL in plug. —
for n, sense, y in ((3, "SW3", 250), (4, "SW4", 275)):
    add_pro(f"J{n+15}", "Connector_Generic:Conn_01x02", f"{sense} switch", (30, y),
        {"1": f"{sense}_SW", "2": "GND"},
        "TerminalBlock_Phoenix:TerminalBlock_Phoenix_PT-1,5-2-3.5-H_1x02_P3.50mm_Horizontal")
    add_pro(f"R{n+27}", "Device:R", "10k (pullup)", (55, y),
        {"1": "+3V3", "2": f"{sense}_SW"},
        "Resistor_SMD:R_0805_2012Metric", "C17414")
    add_pro(f"R{n+29}", "Device:R", "10k (ADC tap)", (75, y),
        {"1": f"{sense}_SW", "2": f"{sense}_SENSE"},
        "Resistor_SMD:R_0805_2012Metric", "C17414")
    add_pro(f"C{n+26}", "Device:C", "100nF (filter)", (95, y),
        {"1": f"{sense}_SW", "2": "GND"},
        "Capacitor_SMD:C_0805_2012Metric", "C49678")

# ══ pro variant only: isolated pH domain ═══════════════════════
# Isolated pH domain. The 1W DC-DC feeds a raw +5V_ISO rail; because
# the island draws <2mA (<1% of 200mA) an unregulated module rises well
# above 5V at that near-no-load. So +5V_ISO is NOT used by the ICs — an
# AMS1117-3.3 LDO (U11, ~15V Vin tolerance absorbs the module's
# unbounded no-load rise; ~5mA Iq also partially preloads it) derives a
# clean +3V3_ISO that every isolated IC, pull-up and the bias divider
# runs from. Kills overvoltage AND the DC-DC's ripple into the pH ADC.
# — pro relays CH5 (switched 12V) + CH6 (dry contact) —
add_pro("K5", "Relay:G5LE-1", "G5LE-1-CF DC12", (290, 200),
    {"2": "+12V", "5": "RLY5_DRV",
     "1": "CH5_FUSED", "3": "CH5_OUT", "4": NC},
    "Relay_THT:Relay_SPDT_Omron-G5LE-1", "C1524650")
add_pro("F5", "Device:Polyfuse", "MF-RHT100 1A", (315, 200),
    {"1": "+12V", "2": "CH5_FUSED"},
    "Fuse:Fuse_Bourns_MF-RHT100", "VERIFY")
add_pro("D14", "Device:D_Schottky", "SS34", (340, 200),
    {"1": "CH5_OUT", "2": "GND"}, "Diode_SMD:D_SMA", "C8678")
add_pro("J16", "Connector_Generic:Conn_01x02", "CH5 12V OUT", (365, 200),
    {"1": "CH5_OUT", "2": "GND"},
    TERM_2P)
add_pro("K6", "Relay:G5LE-1", "G5LE-1-CF DC12", (290, 240),
    {"2": "+12V", "5": "RLY6_DRV",
     "1": "CH6_COM", "3": "CH6_NO", "4": "CH6_NC"},
    "Relay_THT:Relay_SPDT_Omron-G5LE-1", "C1524650")
add_pro("J17", "Connector_Generic:Conn_01x03", "CH6 dry contact", (340, 240),
    {"1": "CH6_COM", "2": "CH6_NO", "3": "CH6_NC"},
    TERM_3P)
# CH5/CH6 indicator LEDs (mirror the CH1-4 pattern)
add_pro("R28", "Device:R", "2.2k", (225, 200),
    {"1": "+12V", "2": "LED5_A"}, "Resistor_SMD:R_0805_2012Metric", "C17520")
add_pro("D15", "Device:LED", "green", (250, 200),
    {"2": "LED5_A", "1": "RLY5_DRV"}, "LED_SMD:LED_0805_2012Metric", "C2297")
add_pro("R29", "Device:R", "2.2k", (225, 240),
    {"1": "+12V", "2": "LED6_A"}, "Resistor_SMD:R_0805_2012Metric", "C17520")
add_pro("D16", "Device:LED", "green", (250, 240),
    {"2": "LED6_A", "1": "RLY6_DRV"}, "LED_SMD:LED_0805_2012Metric", "C2297")

add_pro("PS1", "Connector_Generic:Conn_01x04", "1W iso DC-DC 5Vout SIP-4 (reg or unreg OK; LDO follows)", (280, 90),
    {"1": "+5V_BUCK", "2": "GND", "3": "ISO_GND", "4": "+5V_ISO"},
    "ExoPet:Converter_DCDC_B0505S-1W_SIP4", "VERIFY")
add_pro("C27", "Device:C", "4.7uF 25V", (280, 110),
    {"1": "+5V_BUCK", "2": "GND"},
    "Capacitor_SMD:C_1206_3216Metric", "VERIFY")
# — isolated LDO: raw +5V_ISO -> clean +3V3_ISO —
add_pro("U11", "Regulator_Linear:AMS1117-3.3", "AMS1117-3.3 (iso rail)", (300, 115),
    {"3": "+5V_ISO", "1": "ISO_GND", "2": "+3V3_ISO"},
    "Package_TO_SOT_SMD:SOT-223-3_TabPin2", "VERIFY")
add_pro("C22", "Device:C", "10uF 25V (LDO in bulk)", (350, 110),
    {"1": "+5V_ISO", "2": "ISO_GND"},
    "Capacitor_SMD:C_1206_3216Metric", "VERIFY")
add_pro("C28", "Device:C", "22uF 10V (LDO out)", (300, 135),
    {"1": "+3V3_ISO", "2": "ISO_GND"},
    "Capacitor_SMD:C_1210_3225Metric", "VERIFY")
add_pro("U9", "Isolator:ISO1540", "ISO1540 I2C isolator", (310, 90),
    {"1": "+3V3", "2": "I2C1_SDA", "3": "I2C1_SCL", "4": "GND",
     "5": "ISO_GND", "6": "ISO_SCL", "7": "ISO_SDA", "8": "+3V3_ISO"},
    "Package_SO:SOIC-8_3.9x4.9mm_P1.27mm", "VERIFY")
add_pro("C20", "Device:C", "100nF", (310, 110),
    {"1": "+3V3", "2": "GND"},
    "Capacitor_SMD:C_0805_2012Metric", "C49678")
add_pro("C21", "Device:C", "100nF", (330, 110),
    {"1": "+3V3_ISO", "2": "ISO_GND"},
    "Capacitor_SMD:C_0805_2012Metric", "C49678")
add_pro("R26", "Device:R", "4.7k (iso SDA pullup)", (330, 70),
    {"1": "+3V3_ISO", "2": "ISO_SDA"},
    "Resistor_SMD:R_0805_2012Metric", "C17673")
add_pro("R27", "Device:R", "4.7k (iso SCL pullup)", (345, 70),
    {"1": "+3V3_ISO", "2": "ISO_SCL"},
    "Resistor_SMD:R_0805_2012Metric", "C17673")

# pH front end on the island: BNC -> 1pA follower; reference/shield
# rides a buffered mid-rail so the probe signal sits at BIAS +/-414mV.
add_pro("J15", "Connector:Conn_Coaxial", "pH probe BNC", (280, 150),
    {"1": "PH_IN", "2": "PH_REF"},
    "ExoPet:BNC_Edge_ExoPet", "VERIFY")
add_pro("U10", "Amplifier_Operational:MCP6002-xSN", "MCP6002 (pH buffers)", (310, 150),
    {"1": "PH_BUF", "2": "PH_BUF", "3": "PH_IN",
     "5": "BIAS_MID", "6": "PH_REF", "7": "PH_REF",
     "4": "ISO_GND", "8": "+3V3_ISO"},
    "Package_SO:SOIC-8_3.9x4.9mm_P1.27mm", "VERIFY")
add_pro("R24", "Device:R", "100k (bias hi -> 1.65V mid)", (340, 140),
    {"1": "+3V3_ISO", "2": "BIAS_MID"},
    "Resistor_SMD:R_0805_2012Metric", "C17407")
add_pro("R25", "Device:R", "100k (bias lo)", (340, 160),
    {"1": "BIAS_MID", "2": "ISO_GND"},
    "Resistor_SMD:R_0805_2012Metric", "C17407")
add_pro("C26", "Device:C", "100nF (bias)", (355, 150),
    {"1": "BIAS_MID", "2": "ISO_GND"},
    "Capacitor_SMD:C_0805_2012Metric", "C49678")
add_pro("U8", "Analog_ADC:ADS1115IDGS", "ADS1115 (pH, 0x49)", (380, 150),
    {"1": "+3V3_ISO", "2": NC, "3": "ISO_GND", "4": "PH_BUF", "5": "PH_REF",
     "6": "ISO_GND", "7": "ISO_GND", "8": "+3V3_ISO",
     "9": "ISO_SDA", "10": "ISO_SCL"},
    "Package_SO:MSOP-10_3x3mm_P0.5mm", "VERIFY")
add_pro("C25", "Device:C", "100nF", (380, 170),
    {"1": "+3V3_ISO", "2": "ISO_GND"},
    "Capacitor_SMD:C_0805_2012Metric", "C49678")

# — Power flags for ERC —
PWR_NETS = ["+12V_IN", "+12V", "+5V", "+5V_BUCK", "+3V3", "GND"]
if VARIANT == "pro":
    PWR_NETS += ["+5V_ISO", "+3V3_ISO", "ISO_GND"]
for i, net in enumerate(PWR_NETS):
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

UNIT_DX = 40  # x offset between placed units of one symbol

for ref, lib_id, value, (sx, sy), nets, footprint, lcsc in C:
    units = sorted({u for (_, _, u) in PINS[lib_id].values()}) or [1]
    for unit in units:
        ux = sx + (units.index(unit)) * UNIT_DX
        su = uid("sym", ref, unit)
        body.append(f'  (symbol (lib_id "{esc(lib_id)}") (at {ux} {sy} 0) (unit {unit})')
        body.append("    (exclude_from_sim no) (in_bom yes) (on_board yes) (dnp no)")
        body.append(f'    (uuid "{su}")')
        body.append(f'    (property "Reference" "{esc(ref)}" (at {ux} {sy - 3} 0) (effects (font (size 1.27 1.27))))')
        body.append(f'    (property "Value" "{esc(value)}" (at {ux} {sy + 3} 0) (effects (font (size 1.27 1.27))))')
        body.append(f'    (property "Footprint" "{esc(footprint)}" (at {ux} {sy} 0) (effects (font (size 1.27 1.27)) hide))')
        body.append(f'    (property "LCSC" "{esc(lcsc)}" (at {ux} {sy} 0) (effects (font (size 1.27 1.27)) hide))')
        for pnum, (_, _, pu) in PINS[lib_id].items():
            if pu == unit:
                body.append(f'    (pin "{pnum}" (uuid "{uid("pin", ref, pnum)}"))')
        body.append("    (instances")
        body.append(f'      (project "{PROJECT}"')
        body.append(f'        (path "/{ROOT_UUID}" (reference "{esc(ref)}") (unit {unit}))')
        body.append("      )")
        body.append("    )")
        body.append("  )")

    seen_positions = set()
    for pnum, net in nets.items():
        px, py, pu = PINS[lib_id][pnum]
        ax = round(sx + units.index(pu) * UNIT_DX + px, 2)
        ay = round(sy - py, 2)
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

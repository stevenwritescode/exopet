# Prior automated review findings (confirmed by adversarial verification)

## [major] Missing feedforward capacitor across R16 with all-ceramic output caps

**Claim:** The BUCK_FB net contains only R16, R17, and U6 pin 4 — there is no feedforward capacitor in parallel with the 100k upper divider resistor. The TI TPS54302 datasheet's 5V/3A reference design (Figure 7-1) includes C6=75pF across R2=100k, and Table 7-2 'Recommended Component Values' lists 75pF for the Vout=5V row. Section 7.2.3.5.3 states that when Cout is dominated by low-ESR ceramic capacitors (exactly this design: 2x22uF X5R), the result 'could be low phase margin' and the feedforward cap is added to boost phase at crossover. Computed crossover fo = 5.1/(Vout*Co) is 34-39kHz for 26-30uF effective Cout, right at the datasheet's 40kHz stability guideline, so the omitted 75pF is load-bearing, not optional.

**Evidence:** Netlist /Users/unknower/Git/exopet/hardware/exopet-hat/exopet-hat.net.xml net code 9 BUCK_FB (nodes: R16.2, R17.1, U6.4 only); TPS54302 datasheet SLVSDG6C Figure 7-1 (C6 75pF), Table 7-2 (5V row: C8=75pF), section 7.2.3.5.3, Eq. 14; gen_schematic.py lines 146-156 (no Cff component exists).

## [major] No bulk input capacitance on +12V — spec's 470uF electrolytic (C1) was dropped in rev 2

**Claim:** The +12V rail feeding U6 VIN has only 2x10uF 25V X7R 1206 ceramics (C8, C16) plus 100nF (C2, C10) — roughly 12-13uF effective after DC bias at 12V. There is no electrolytic/bulk capacitor anywhere in the netlist or BOM. The datasheet (section 7.3) states that when the input supply is located more than a few inches from the converter, additional bulk capacitance is required, with 47uF electrolytic as a typical choice — this board is fed by a wall adapter through a barrel jack (J1), a 5A PTC (F1), and a reverse-protection FET (Q1), i.e. a remote, impedance-laden source. The project's own design spec calls for 'C1 470uF 25V electrolytic + C2 100nF' as bulk on +12V; C1 does not exist in the rev-2 netlist (C2 was demoted to a bare 100nF). The same thin rail also carries all four 12V relay coils, so buck input ripple (Icin_rms = Iout/2 = 1.5A per Eq. 5) and coil switching transients share ~13uF.

**Evidence:** Netlist net code 4 '+12V' members (C10, C16, C2, C8, F2-F4, K1-K4 coils, TP1, U2.9, U6.3 — no bulk cap); BOM /Users/unknower/Git/exopet/hardware/exopet-hat/fab/exopet-hat-bom-jlc.csv (no electrolytic line, C2 listed under '100nF'); spec /Users/unknower/Git/exopet/docs/superpowers/specs/2026-07-27-exopet-hat-design.md section 2 table row 'C1 | 470 uF 25V electrolytic'; TPS54302 datasheet section 7.3 and Eq. 4/5.

## [major] F1 (MF-RG500) hold current has essentially no margin over realistic load and derates below load at warm ambient

**Claim:** The 5A polyfuse will nuisance-trip (or sit at the trip boundary) under the board's own specified full load once local ambient exceeds roughly 35-40C, which is expected in an enclosure containing a Pi, a buck converter, and 4 energized relays. Realistic total 12V-side load is ~4.6A: Pi 3A@5V through the buck at 85% = 15W/0.85/12V = 1.47A; four G5LE relay coils ~0.13A; three switched channel loads at 1A each = 3.0A; indicator LEDs ~0.03A. MF-RG500 Ihold is 5.0A only at 23C and derates to 4.4A@40C, 4.0A@50C, 3.6A@60C — below the 4.6A load. A MF-RG700 (Ihold 7.0A@23C, 6.2A@40C, same 16V/radial family, and the footprint pad pitch is identical 5.2mm C dimension) would restore margin; alternatively derate the allowed channel loads.

**Evidence:** Netlist/generator: F1 'MF-RG500 5A' in series J1(+12V_IN)->F1->(+12V_F) (gen_schematic.py lines 98-104; /Users/unknower/Git/exopet/hardware/exopet-hat/exopet-hat.net.xml comp F1). Bourns MF-RG datasheet (media.digikey.com MF-RG_Series.pdf): MF-RG500 Ihold 5.00A/Itrip 8.50A at 23C; thermal derating chart Ihold = 4.4A@40C, 4.0A@50C, 3.6A@60C, 3.1A@70C. Load figures per design spec lens: 4x~33mA relay coils + Pi 3A@5V at 85% buck efficiency (1.47A@12V) + 3x1A channel loads = ~4.6A.

## [minor] TVS D1 is placed ~40mm away from the input connector and fuse it protects

**Claim:** D1 sits at the far right edge of the board on the bottom side while J1/F1/Q1 are clustered at the top-left/left; the +12V_F net must run ~40mm to reach the TVS and back, adding loop inductance that raises the effective let-through voltage for fast transients (L*di/dt overshoot on top of the 26V clamp) and makes the clamp much less effective exactly where it matters (at Q1's drain and the downstream rail). The TVS should sit adjacent to F1/Q1 near the input corner.

**Evidence:** /tmp/rev2-padnets.csv: D1 pads at (54.3, 13.85) and (54.3, 18.15) on bottom; J1 pin1 at (14.6, 14.0) top, F1 pad2 (+12V_F) at (14.7, 23.8) top, Q1 drain pad at (24.26, 44.8) bottom. Straight-line distance D1-to-F1 approx 40.7mm on a 65x56mm board.

## [major] Back-powering the Pi with no safety diode/mechanism, violating the HAT design guide dual-supply requirement

**Claim:** The buck output is hard-wired to the Pi 5V pins with a 0R resistor and nothing else — no ORing diode, no ideal-diode/power-mux, no fuse in the 5V path. The official HAT design guide (raspberrypi/hats designguide.md, back-powering section) requires a back-powering board to 'implement a duplicate power safety diode before the HAT 5V net ... or otherwise provide some mechanism to guarantee that it is safe if both the Pi PSU and add-on board PSU are connected', and for Pi 3B+/4/Zero permits back-power only from 'a power source that does not try to sink current'. Additionally, when the Pi alone is powered by USB-C (12V absent), 5V from the Pi flows backwards through R21 and L1 to the TPS54302 SW pin, and the integrated high-side FET body diode (SW→VIN) pulls the entire +12V net up to ~4.3V; R1 then holds Q1's gate low so the PMOS turns on and presents ~4.3V at the unpowered barrel jack, and the ULN2003 COM pin/relay coils/LED strings are all back-driven.

**Evidence:** Netlist /Users/unknower/Git/exopet/hardware/exopet-hat/exopet-hat.net.xml: net '+5V' (code 2) = {J3.2, J3.4, R21.2} only; net '+5V_BUCK' (code 3) = {L1.2, R21.1, C11, C12, R16, R20, TP2} — no diode or protection element between +5V_BUCK and the Pi 5V pins. Q1 gate net Q1_G has only R1 100k to GND (net code 4/+12V includes Q1.S, U6.3 VIN). HAT designguide.md back-powering text quoted above; TPS54302 is a synchronous buck with integrated high-side FET (body diode SW→VIN per TI datasheet).

## [major] ORDERING.md bring-up procedure references a JP1 that no longer exists; boards actually ship with the 5V link populated

**Claim:** The ordering guide instructs the builder that solder jumper JP1 'ships open so a bare board can be bench-tested against USB-C power first' and to bridge it only after a 12V power-up check. But rev 2 deleted JP1 and replaced it with machine-placed 0R resistor R21 (per the schematic generator comment: 'machine-placed 0R replaces the hand-soldered JP1 so boards leave assembly fully powered'), and R21 appears in both the BOM and the CPL. There is no JP1 anywhere in the netlist. Boards therefore arrive from JLCPCB with the buck output hard-wired to the Pi 5V pins, the documented USB-C-first bench test is impossible as written, and following the guide's assumption ('ships open') leads directly to the unprotected dual-supply/back-feed condition of finding 1 on first power-up.

**Evidence:** /Users/unknower/Git/exopet/hardware/exopet-hat/fab/ORDERING.md lines 38-43 ('Bridge solder jumper JP1 ... It ships open...'); /Users/unknower/Git/exopet/hardware/exopet-hat/fab/exopet-hat-cpl.csv line 37 ('R21,14.0000mm,-48.9000mm,Bottom,0.000000'); BOM row 2 (R21 0R jumper); netlist contains JP2 only, no JP1; /Users/unknower/Git/exopet/hardware/exopet-hat/tools/gen_schematic.py lines 175-182.

## [major] R21 — the sole conductor feeding the Pi's entire 5V current — has no part selected and generic 1206 0R jumpers are rated below the required current

**Claim:** All Pi supply current (up to 3A for a Pi 4, per the design's own comment and the official 3A PSU class; the HAT design guide's back-power example supply is 2.5A) passes through the single 0R jumper R21. The BOM ships to JLCPCB with the LCSC field for R21 blank and only a free-text warning 'rated current >=3A (check datasheet rating!)', so the JLC operator will hand-match an arbitrary in-stock 1206 zero-ohm part. Common 1206 zero-ohm jumpers (e.g., Yageo RC/AC1206 series 'jumper criteria') are rated 2A max, below both the 3A requirement the BOM itself states and the Pi 4's peak draw — risking an overheating/failing series element in the Pi's only power feed. The part must be pinned to a verified >=3A jumper (or replaced by a wide trace/net-tie) before ordering.

**Evidence:** /Users/unknower/Git/exopet/hardware/exopet-hat/fab/exopet-hat-bom-jlc.csv line 2: '"0R jumper (5V link; remove to isolate buck) [0 ohm jumper 1206, rated current >=3A (check datasheet rating!)]",R21,R_1206_3216Metric,' (empty LCSC column); gen_schematic.py lines 178-179 acknowledge '0805 zero-ohm jumpers are typically rated only ~2A' and that the Pi 4 5V rail specs 3A peaks; netlist net '+5V' shows R21 is the only element between +5V_BUCK and J3 pins 2/4; Yageo thick-film 1206 jumper datasheet rating is 2A.


# Refuted claims (for reference)

- Entire buck power stage has no LCSC part numbers — JLCPCB cannot assemble it — The factual observation is correct (LCSC column blank for U6/L1/C11,C12/C8,C16/R17/R21 in fab/exopet-hat-bom-jlc.csv; netlist U6 LCSC='VERIFY'), but the claim m

- Q1 gate-source can exceed AOD403 +/-25V abs max during a full-power TVS clamp event; no gate zener fitted — Every individual fact in the claim checks out against primary sources — Q1=AOD403 (Vgs abs max +/-25V, pinout G/D-tab/S per AOS datasheet rev 10.1), D1=SMBJ16CA

- TVS let-through (26V) exceeds the 25V rating of the 12V-rail input capacitors C8/C16 — The claim's raw facts check out — topology (J1 -> F1 -> +12V_F with SMBJ16CA D1; Q1 AOD403 passes to +12V where C8/C16 10uF 25V X7R sit) is confirmed in tools/g

- 9 BOM lines (12 components) have no LCSC part number — including the entire 12V->5V buck and the HAT ID EEPROM — The raw observation is correct — 9 BOM lines (though 11 components, not the claimed 12: R21, C16, C8, J1, R17, C11, C12, L1, U4, D1, U6) have a blank LCSC Part 

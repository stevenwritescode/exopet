# ExoPet Hub Enclosure (Pi 4 + HAT) — Design Spec

> **Date:** 2026-08-02
> **Status:** Approved
> **Deliverable:** parametric OpenSCAD source + STLs (base, cover) +
> renders, in `hardware/exopet-hat/enclosure/`

## Decisions

- Wall/cabinet mount via two keyhole flanges on the base.
- Mounted orientation: **HAT terminal edge faces down** → natural drip
  loops on all field wiring.
- Drip-shielded ventilation: 45° louvers on both side faces (low intake
  / high exhaust), solid top face when mounted. PETG, no supports.

## Geometry (shared frame: HAT top-left = origin, x→right, y→down)

- Pi 4: 85×56 board, holes (3.5,3.5)+(58×49); HAT 65×56 stacked above
  it at 12.3 mm board-to-board (PC104 socket).
- Z stack from case floor: bosses 4 → Pi PCB → HAT PCB bottom at 17.9 →
  HAT top 19.5 → relay tops ≈35.2. Internal clear height 38.
- Internal cavity ≈ 89×60 (Pi + 2 mm slack each side + wall clearance).

## Openings (positions derive from the .kicad_pcb / Pi 4 drawing)

| Face (mounted) | Opening | Level |
|---|---|---|
| Bottom (y=56 edge) | CH1–CH4 terminal slot, x≈8–61 | HAT top, h≈12 |
| Bottom | Pi USB-C (x≈11.2) + 2× microHDMI (x≈26, 39.5) slots | Pi level |
| Left side (x=0) | FLOAT1/FLOAT2/TEMP terminal slot y≈20–50 | HAT top |
| Left side | Barrel jack round port at y=14 | HAT top +5.5 |
| Left side | microSD finger slot (card is under the Pi PCB) | below Pi |
| Right side (x=85 end) | one rectangular USB×4 + Ethernet cutout | Pi level |
| Both sides | louver banks (45° overhung blades) | mid/high |

Note (corrects the discussion draft): the Pi's USB-C/HDMI share the
same edge as the HAT terminals, so they exit the *bottom* face beside
the wiring — fine, since the HAT normally powers the Pi and these are
debug-only.

## Parts & fastening

- **Base tray:** floor + 4 Pi bosses (M2.5 self-tap, 4 mm tall), SD
  relief pocket in floor, two keyhole flanges beyond the short ends.
- **Cover:** walls + top, all port cutouts, louvers; fastens with 4
  self-tapping screws into corner posts of the base. Wall 2.4 mm
  (3 perimeters), fits a 220 mm bed diagonal-free.
- All key dims exposed as OpenSCAD parameters, incl. global `fit`
  tolerance (default 0.3 per side; slots +0.6).

## Verification

- `openscad` CLI renders both STLs without CGAL errors; file sizes
  sane; PNG renders reviewed visually.
- A check script asserts cutout centers against connector coordinates
  extracted from `exopet-hat.kicad_pcb` (single source of truth).
- First physical print is a fit-check; tolerance iteration expected —
  that is what the parameters are for.

## Out of scope (v1)

Fan mount, light pipes, touchscreen-Pi enclosure, DIN-rail adapter.

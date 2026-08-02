// ExoPet Hub Enclosure — Raspberry Pi 4 + ExoPet HAT rev 1
// Parametric. Render:  openscad -D 'part="base"'  -o base.stl  enclosure.scad
//                      openscad -D 'part="cover"' -o cover.stl enclosure.scad
//
// Frame: HAT board top-left = origin, x→right, y→down (matches the
// KiCad board file). Pi 4 sits under the HAT, extends to x=85.
// Mounted orientation: y=56 edge (terminals) faces DOWN.

part = "both"; // "base" | "cover" | "both"

/* ── boards & stack ─────────────────────────────────────── */
pi_l = 85;      pi_w = 56;      pcb_t = 1.6;
hat_l = 65;
hole_off = 3.5;                    // holes inset from board edges
hole_dx = 58;   hole_dy = 49;      // hole pattern
boss_h = 4;                        // Pi PCB sits this far above floor
stack = 12.3;                      // HAT board-to-board (PC104 socket)
z_pi = boss_h + pcb_t;             // top of Pi PCB
z_hat = boss_h + stack + pcb_t;    // top of HAT PCB  (≈17.9+1.6)
relay_h = 15.7;
inner_h = z_hat + relay_h + 4;     // headroom above relays

/* ── case shell ─────────────────────────────────────────── */
wall = 2.4;     floor_t = 3;      top_t = 2.4;
slack = 2;                         // board-to-wall clearance each side
fit = 0.3;                         // per-side print tolerance
inx = pi_l + 2*slack;              // inner cavity x
iny = pi_w + 2*slack;              // inner cavity y
ox = inx + 2*wall;  oy = iny + 2*wall;  oz = floor_t + inner_h + top_t;
// board origin offset inside cavity
bx = wall + slack;  by = wall + slack;

/* ── connector cutouts (from exopet-hat.kicad_pcb dump) ──── */
slot_fit = 0.6;
// front terminals CH1..CH4 (y=56 face): x extents from board dump
front_x0 = 10.2 - 2;   front_x1 = 58.8 + 2;
term_h = 12;                      // opening height above HAT top
// left face sensor stack J13/J14/J4: y 20.5..48.8
// notch starts at the terminal screw-access line (pads from y=22.8),
// not the body edge, to keep a solid bridge to the jack port
left_y0 = 21.5;        left_y1 = 48.8 + 2;
// barrel jack J1: body y 9.0..20.5, opening center y≈14.0 (per J1 at
// (14.6,14) rot270); center z ≈ HAT top + 5.5, Ø ~9 opening
jack_y = 14.0;  jack_z = 5.5;  jack_d = 10;
// Pi right edge (x=85): USB/Eth block
pi_port_y0 = 1.5;  pi_port_y1 = 54.5;  pi_port_h = 17;
// Pi bottom edge (y=56): USB-C + 2x microHDMI (Pi4 drawing, x from Pi origin)
usbc_x = 3.5 + 7.7;   hdmi0_x = 3.5 + 22.1;   hdmi1_x = 3.5 + 35.6;
usbc_w = 10;  hdmi_w = 8;  pi_edge_h = 8;
// microSD on Pi left edge (x=0), card under the PCB, centered y≈28
sd_y = 28;  sd_w = 14;  sd_h = 4;

/* ── mounting flanges (keyholes) ────────────────────────── */
flange_w = 14;  flange_t = 4;  key_d1 = 8;  key_d2 = 4;  key_l = 6;

/* ── louvers ────────────────────────────────────────────── */
louver_p = 6;          // pitch
louver_n = 8;          // blades per bank
louver_len = 34;

$fn = 48;

/* ════════ modules ═══════════════════════════════════════ */

module keyhole() {
    hull() { circle(d=key_d2); translate([0, key_l]) circle(d=key_d2); }
    circle(d=key_d1);
}

module base() {
    difference() {
        union() {
            // floor
            cube([ox, oy, floor_t]);
            // Pi bosses
            for (h = [[hole_off, hole_off], [hole_off+hole_dx, hole_off],
                      [hole_off, hole_off+hole_dy], [hole_off+hole_dx, hole_off+hole_dy]])
                translate([bx + h[0], by + h[1], 0])
                    cylinder(h=floor_t + boss_h, d=6);
            // wall-mount flanges beyond the x extents (mounted: left/right ears)
            for (fx = [-flange_w, ox])
                translate([fx, oy/2 - 14, 0]) cube([flange_w, 28, flange_t]);
            // cover-fastening lugs on solid faces (top face + bottom-right band)
            for (lg = [[15, -8], [69, -8], [74, oy]])
                translate([lg[0], lg[1], 0]) cube([10, 8, flange_t]);
        }
        // boss screw pilots (M2.5 self-tap)
        for (h = [[hole_off, hole_off], [hole_off+hole_dx, hole_off],
                  [hole_off, hole_off+hole_dy], [hole_off+hole_dx, hole_off+hole_dy]])
            translate([bx + h[0], by + h[1], floor_t - 1])
                cylinder(h=boss_h + 2, d=2.1);
        // pilots in the fastening lugs (M2.5 self-tap)
        for (lp = [[20, -4], [74, -4], [79, oy + 4]])
            translate([lp[0], lp[1], -1]) cylinder(h=flange_t + 2, d=2.1);
        // keyholes in flanges
        for (fx = [-flange_w/2, ox + flange_w/2])
            translate([fx, oy/2, -1]) linear_extrude(flange_t + 2) keyhole();
        // SD relief pocket in floor (card sits below Pi PCB at left edge)
        translate([bx - slack - 1, by + sd_y - sd_w/2, floor_t - 1])
            cube([slack + 6, sd_w, boss_h + 1]);
    }
}

// 45-degree gill vents: outside opening lower than inside -> drips shed
module gills_x(x0, y0, z0, n, slot_l) {
    for (i = [0:n-1])
        translate([x0, y0, z0 + i*louver_p])
            rotate([0, 45, 0])
                cube([wall*3, slot_l, 2.2], center=true);
}

module cover() {
    // external ears land on the base lugs (solid-wall faces only)
    for (lg = [[15, -8, -4], [69, -8, -4], [74, oy - 0.01, oy + 4]])
        translate([lg[0], lg[1] + (lg[1] < 0 ? 0.01 : 0), flange_t])
            difference() {
                cube([10, 8, 3]);
                translate([5, lg[2] - lg[1], -1]) cylinder(h=5, d=2.8);
            }
    difference() {
        // shell: walls + top (open bottom mates onto base floor)
        translate([0, 0, floor_t]) difference() {
            cube([ox, oy, inner_h + top_t]);
            translate([wall, wall, -1]) cube([inx, iny, inner_h + 1]);
        }
        /* openings — all positions from board frame + (bx,by) offset */
        // front terminal notch: open to the cover rim so pre-wired
        // terminals pass through as the cover drops on
        translate([bx + front_x0 - slot_fit, oy - wall - 1, floor_t - 1])
            cube([front_x1 - front_x0 + 2*slot_fit, wall + 2, z_hat + term_h + 1]);
        // Pi USB-C + HDMI slots (same face, Pi level)
        for (c = [[usbc_x, usbc_w], [hdmi0_x, hdmi_w], [hdmi1_x, hdmi_w]])
            translate([bx + c[0] - c[1]/2 - slot_fit, oy - wall - 1, floor_t + boss_h - 0.5])
                cube([c[1] + 2*slot_fit, wall + 2, pi_edge_h]);
        // left sensor terminal notch: open to the rim (same reason)
        translate([-1, by + left_y0 - slot_fit, floor_t - 1])
            cube([wall + 2, left_y1 - left_y0 + 2*slot_fit, z_hat + term_h + 1]);
        // left face: barrel jack round port
        translate([-1, by + jack_y, floor_t + z_hat + jack_z])
            rotate([0, 90, 0]) cylinder(h=wall + 2, d=jack_d);
        // left face: SD finger slot (below Pi PCB level)
        translate([-1, by + sd_y - sd_w/2, floor_t + 1])
            cube([wall + 2, sd_w, boss_h + sd_h]);
        // right face (x=ox): Pi USB/Ethernet block
        translate([ox - wall - 1, by + pi_port_y0, floor_t + boss_h - 0.5])
            cube([wall + 2, pi_port_y1 - pi_port_y0, pi_port_h]);
        // exhaust gills high on the right face only; intake is the two
        // open-bottom terminal notches (low, when wall-mounted)
        gills_x(ox - wall/2, by + 28, floor_t + inner_h - 13, 3, 40);
    }
}

/* ════════ output ════════════════════════════════════════ */
if (part == "base" || part == "both") base();
if (part == "cover" || part == "both")
    color("steelblue", 0.5) cover();

// dimension echoes for the verification script
echo("DIM ox", ox); echo("DIM oy", oy); echo("DIM oz", oz);
echo("DIM z_hat", z_hat); echo("DIM front_x0", front_x0);
echo("DIM front_x1", front_x1); echo("DIM left_y0", left_y0);
echo("DIM left_y1", left_y1); echo("DIM jack_y", jack_y);

// ExoPet Hub Enclosure — Raspberry Pi 4 + ExoPet HAT rev 1
// Parametric. Render:  openscad -D 'part="base"'  -o base.stl  enclosure.scad
//                      openscad -D 'part="cover"' -o cover.stl enclosure.scad
//
// Frame: HAT board top-left = origin, x→right, y→down (matches the
// KiCad board file). Pi 4 sits under the HAT, extends to x=85.
// Mounted orientation: y=56 edge (terminals) faces DOWN.

part = "both"; // "base" | "cover" | "roof" | "both" (all three)

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
slack = 3;                         // board-to-wall clearance each side (rim lives in it)
fit = 0.3;                         // per-side print tolerance
inx = pi_l + 2*slack;              // inner cavity x
iny = pi_w + 2*slack;              // inner cavity y
ox = inx + 2*wall;  oy = iny + 2*wall;  oz = floor_t + inner_h + top_t;
// board origin offset inside cavity
bx = wall + slack;  by = wall + slack;

/* ── connector cutouts (from exopet-hat.kicad_pcb dump) ──── */
slot_fit = 0.6;
// terminal groups (board coords of each screw/wire position + label).
// Wires enter through wall ports; screws are tightened through lid
// ports directly above each position.
FRONT_GROUPS = [ [[12.5,16],"1"], [[24.5,28],"2"],
                 [[36.5,40],"3"], [[49.5,53,56.5],"AUX"] ];
LEFT_GROUPS  = [ [[22.8,26.3],"FLT1"], [[31.1,34.6],"FLT2"],
                 [[39.5,43,46.5],"TEMP"] ];
wire_slot_h = 5.5;   wire_z = 4.5;   // entry height above HAT top
screw_slot_w = 4.2;  label_depth = 0.6;
term_h = 12;                      // opening height above HAT top
// left face sensor stack J13/J14/J4: y 20.5..48.8

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

/* snap-fit: rim segments on the base (clear of SD path, Pi port
   overhangs, and the wire notches), each carrying a detent bump that
   clicks into a dimple inside the cover wall. */
rim_h = 7;  rim_t = 1.2;  rim_gap = 0.15;  bump_d = 2.4;  bump_proud = 0.7;
// board edge to rim inner face: slack - rim_gap - rim_t = 1.65mm clear
rim_z0 = floor_t;
// segments: [face, from, to] — face: 0=y0(back) 1=y=oy(front) 2=x0(left)
RIM = [
    [0,  4, 90],          // back face: fully solid
    [1, 60, 90],          // front face right of the notch/ports
    [1,  3,  9],          // front face left sliver
    [2,  4, 19],          // left face below the SD/notch zone
    [2, 51, 61],          // left face above the notch
];
BUMPS = [[0, 25], [0, 70], [1, 75], [2, 11], [2, 56]];

module rim_seg(face, a, b, h, th) {
    if (face == 0) translate([a, wall + rim_gap, rim_z0]) cube([b - a, th, h]);
    if (face == 1) translate([a, oy - wall - rim_gap - th, rim_z0]) cube([b - a, th, h]);
    if (face == 2) translate([wall + rim_gap, a, rim_z0]) cube([th, b - a, h]);
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
            // snap rim segments + detent bumps
            for (s = RIM) rim_seg(s[0], s[1], s[2], rim_h, rim_t);
            for (bp = BUMPS) {
                // center sits inside the rim so the sphere protrudes
                // bump_proud from the OUTER face (toward the cover) and
                // its backside stays well clear of the board zone
                bz = rim_z0 + rim_h - 2.5;
                bo = bump_d/2 - bump_proud;   // center inset from outer face
                if (bp[0] == 0)
                    translate([bp[1], wall + rim_gap + bo, bz])
                        sphere(d=bump_d);
                if (bp[0] == 1)
                    translate([bp[1], oy - wall - rim_gap - bo, bz])
                        sphere(d=bump_d);
                if (bp[0] == 2)
                    translate([wall + rim_gap + bo, bp[1], bz])
                        sphere(d=bump_d);
            }

        }
        // boss screw pilots (M2.5 self-tap)
        for (h = [[hole_off, hole_off], [hole_off+hole_dx, hole_off],
                  [hole_off, hole_off+hole_dy], [hole_off+hole_dx, hole_off+hole_dy]])
            translate([bx + h[0], by + h[1], floor_t - 1])
                cylinder(h=boss_h + 2, d=2.1);
        // keyholes in flanges — narrow slot points UP (toward y=0/roof):
        // screw enters the big hole, case drops, shank locks in the slot
        for (fx = [-flange_w/2, ox + flange_w/2])
            translate([fx, oy/2, -1])
                linear_extrude(flange_t + 2) rotate(180) keyhole();
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

/* rain cap: pitched roof over the mounted-top (y=0) face. High edge at
   the wall (z=0), sloping ~5deg toward the front, overhanging the front
   and both sides by 5mm. Drip nubs under the overhangs break surface
   tension so leak water falls clear of the walls and vents. */
eave_over = 5;   cap_high = 6;   cap_low = 1.5;

module roof_cap() {
    // wedge: tall edge at the wall (z=0), thin edge past the front,
    // built as a hull between the two edge slabs — unambiguous geometry
    hull() {
        translate([-eave_over, -cap_high, 0])
            cube([ox + 2*eave_over, cap_high, 0.1]);
        translate([-eave_over, -cap_low, oz + eave_over - 0.1])
            cube([ox + 2*eave_over, cap_low, 0.1]);
    }
    // drip nubs: under the front overhang lip...
    for (xi = [6 : 12 : ox])
        translate([xi, 0, oz + eave_over - 2])
            rotate([-90, 0, 0]) cylinder(h = 2.2, d1 = 3, d2 = 0.6);
    // ...and under each side overhang
    for (sx = [-eave_over/2, ox + eave_over/2])
        for (zi = [12, 26, 40])
            translate([sx, 0, zi])
                rotate([-90, 0, 0]) cylinder(h = 2.2, d1 = 3, d2 = 0.6);
}

// peg positions shared by roof underside and cover top face
PEGS = [[15, 12], [15, 32], [78, 12], [78, 32]];

module roof() {
    roof_cap();
    // pegs on the underside: mate blind holes in the cover's top face
    for (pg = PEGS)
        translate([pg[0], -0.01, pg[1]])
            rotate([-90, 0, 0]) cylinder(h = 1.8, d = 2.8);
}

module cover() {

    difference() {
        // shell: walls + top (open bottom mates onto base floor)
        translate([0, 0, floor_t]) difference() {
            cube([ox, oy, inner_h + top_t]);
            translate([wall, wall, -1]) cube([inx, iny, inner_h + 1]);
        }
        /* openings — all positions from board frame + (bx,by) offset */
        // front groups: wall wire ports + lid screw ports + labels
        for (g = FRONT_GROUPS) {
            gx0 = min(g[0]) - 2.75;  gx1 = max(g[0]) + 2.75;
            // wire port through the y=oy wall at entry height
            translate([bx + gx0, oy - wall - 1, floor_t + z_hat + wire_z - wire_slot_h/2])
                cube([gx1 - gx0, wall + 2, wire_slot_h]);
            // screw port through the lid above the screws
            translate([bx + gx0, by + 52 - screw_slot_w/2, floor_t + inner_h - 1])
                cube([gx1 - gx0, screw_slot_w, top_t + 2]);
            // debossed numeral between the screw port and the front edge
            translate([bx + (gx0+gx1)/2, by + 56.5, oz - label_depth])
                linear_extrude(label_depth + 1)
                    rotate(180) text(g[1], size = 4.4, halign = "center",
                                     valign = "center", font = "Liberation Sans:style=Bold");
        }
        // legend + 12V jack label in open lid space
        translate([bx + 40, by + 24, oz - label_depth])
            linear_extrude(label_depth + 1)
                rotate(180) text("RELAY OUT", size = 3.2, halign = "center",
                                 valign = "center", font = "Liberation Sans:style=Bold");
        translate([bx + 17, by + 14, oz - label_depth])
            linear_extrude(label_depth + 1)
                rotate(180) text("12V", size = 3.6, halign = "center",
                                 valign = "center", font = "Liberation Sans:style=Bold");
        // left groups: same treatment through the x=0 wall
        for (g = LEFT_GROUPS) {
            gy0 = min(g[0]) - 2.75;  gy1 = max(g[0]) + 2.75;
            translate([-1, by + gy0, floor_t + z_hat + wire_z - wire_slot_h/2])
                cube([wall + 2, gy1 - gy0, wire_slot_h]);
            translate([bx + 4 - screw_slot_w/2, by + gy0, floor_t + inner_h - 1])
                cube([screw_slot_w, gy1 - gy0, top_t + 2]);
            // horizontal label beside the slot; groups stack cleanly in y
            translate([bx + 17, by + (gy0+gy1)/2, oz - label_depth])
                linear_extrude(label_depth + 1)
                    rotate(180) text(g[1], size = 3.6, halign = "center",
                                     valign = "center", font = "Liberation Sans:style=Bold");
        }
        // Pi USB-C + HDMI slots (same face, Pi level)
        for (c = [[usbc_x, usbc_w], [hdmi0_x, hdmi_w], [hdmi1_x, hdmi_w]])
            translate([bx + c[0] - c[1]/2 - slot_fit, oy - wall - 1, floor_t + boss_h - 0.5])
                cube([c[1] + 2*slot_fit, wall + 2, pi_edge_h]);

        // left face: barrel jack round port
        translate([-1, by + jack_y, floor_t + z_hat + jack_z])
            rotate([0, 90, 0]) cylinder(h=wall + 2, d=jack_d);
        // left face: SD finger slot (below Pi PCB level)
        translate([-1, by + sd_y - sd_w/2, floor_t + 1])
            cube([wall + 2, sd_w, boss_h + sd_h]);
        // right face (x=ox): Pi USB/Ethernet block
        translate([ox - wall - 1, by + pi_port_y0, floor_t + boss_h - 0.5])
            cube([wall + 2, pi_port_y1 - pi_port_y0, pi_port_h]);
        // blind holes for the optional roof's pegs (y=0 face)
        for (pg = PEGS)
            translate([pg[0], -0.5, pg[1]])
                rotate([-90, 0, 0]) cylinder(h = 2.5, d = 3.2);
        // snap dimples on the cover's inner faces (mate the rim bumps)
        for (bp = BUMPS) {
            bz = rim_z0 + rim_h - 2.5;
            if (bp[0] == 0)
                translate([bp[1], wall, bz]) sphere(d=bump_d + 0.6);
            if (bp[0] == 1)
                translate([bp[1], oy - wall, bz]) sphere(d=bump_d + 0.6);
            if (bp[0] == 2)
                translate([wall, bp[1], bz]) sphere(d=bump_d + 0.6);
        }
        // exhaust gills high on the right face only; intake is the two
        // open-bottom terminal notches (low, when wall-mounted)
        gills_x(ox - wall/2, by + 28, floor_t + inner_h - 13, 3, 40);
    }
}

/* ════════ output ════════════════════════════════════════ */
if (part == "base" || part == "both") base();
if (part == "cover" || part == "both")
    color("steelblue", 0.5) cover();
if (part == "roof" || part == "both")
    color("tomato", 0.7) roof();

// dimension echoes for the verification script
echo("DIM ox", ox); echo("DIM oy", oy); echo("DIM oz", oz);
echo("DIM z_hat", z_hat); echo("DIM jack_y", jack_y);

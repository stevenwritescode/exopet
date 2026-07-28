"""Assert the GPIO socket matches the official RaspberryPi-HAT template:
body on B.Cu, pin pads at the spec positions (holes at 3.5/61.5 datum).
Regression guard for the pin-1 orientation bug found 2026-07-28."""
import sys
import pcbnew

EXPECT = {
    "1": (8.37, 4.77),
    "2": (8.37, 2.23),
    "3": (10.91, 4.77),
    "39": (56.63, 4.77),
    "40": (56.63, 2.23),
}

board = pcbnew.LoadBoard(sys.argv[1])
j3 = next(fp for fp in board.GetFootprints() if fp.GetReference() == "J3")
assert j3.GetLayer() == pcbnew.B_Cu, "J3 body must be on the BOTTOM (B.Cu)"

fail = 0
for pad in j3.Pads():
    num = pad.GetNumber()
    if num in EXPECT:
        x = pcbnew.ToMM(pad.GetPosition().x)
        y = pcbnew.ToMM(pad.GetPosition().y)
        ex, ey = EXPECT[num]
        if abs(x - ex) > 0.05 or abs(y - ey) > 0.05:
            print(f"PAD {num}: at ({x:.2f},{y:.2f}) want ({ex},{ey})")
            fail += 1
print("J3:", "FAIL" if fail else "matches official HAT template (B side, pin1 @ 8.37,4.77)")
sys.exit(1 if fail else 0)

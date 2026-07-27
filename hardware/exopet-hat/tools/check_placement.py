import sys
import pcbnew

board = pcbnew.LoadBoard(sys.argv[1])
boxes = {}
sides = {}
for fp in board.GetFootprints():
    ref = fp.GetReference()
    sides[ref] = "B" if fp.GetLayer() == pcbnew.B_Cu else "F"
    bb = fp.GetBoundingBox(False)  # no text
    boxes[ref] = (
        pcbnew.ToMM(bb.GetLeft()), pcbnew.ToMM(bb.GetTop()),
        pcbnew.ToMM(bb.GetRight()), pcbnew.ToMM(bb.GetBottom()),
    )

if "--dump" in sys.argv:
    for ref, (l, t, r, b) in sorted(boxes.items()):
        print(f"{ref:5s} {sides[ref]} x[{l:6.1f},{r:6.1f}] y[{t:6.1f},{b:6.1f}]  ({r-l:.1f} x {b-t:.1f})")

# intentional: flush-ganged terminal blocks, connector noses over the edge,
# terminal wire-entry overhang past the front edge
ALLOW_PAIRS = {frozenset(x) for x in [
    ("J11","J8"),("J8","J9"),("J9","J10"),
]}
ALLOW_OFFBOARD = {"J1","J4","J8","J9","J10","J11"}

refs = sorted(boxes)
bad = 0
for i, a in enumerate(refs):
    la, ta, ra, ba = boxes[a]
    if (la < 0.3 or ta < 0.3 or ra > 64.7 or ba > 55.7) and a not in ALLOW_OFFBOARD:
        print(f"OFFBOARD {a}: x[{la:.1f},{ra:.1f}] y[{ta:.1f},{ba:.1f}]")
        bad += 1
    for b in refs[i + 1:]:
        lb, tb, rb, bb2 = boxes[b]
        if sides[a] != sides[b]:
            continue
        if la < rb and lb < ra and ta < bb2 and tb < ba:
            if frozenset((a, b)) in ALLOW_PAIRS:
                continue
            print(f"OVERLAP {a} <-> {b}")
            bad += 1
print("PLACEMENT:", "FAIL" if bad else "CLEAN")

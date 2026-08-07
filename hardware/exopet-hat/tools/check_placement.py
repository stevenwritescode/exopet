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
]}
ALLOW_OFFBOARD = {"J1","J4","J8","J9","J10","J11"}

refs = sorted(boxes)
bad = 0
for i, a in enumerate(refs):
    la, ta, ra, ba = boxes[a]
    bbb = board.GetBoardEdgesBoundingBox()
    BH = pcbnew.ToMM(bbb.GetBottom())
    if (la < 0.3 or ta < 0.3 or ra > 64.7 or ba > BH - 0.3) and a not in ALLOW_OFFBOARD:
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
# THT pads exist on BOTH sides: check SMD courtyards against them.
# (Rev 2 packs the buck into the relay-pad corridors on the back; this
# was the checker's blind spot when that packing was first attempted.)
tht_pads = []
for fp in board.GetFootprints():
    for pad in fp.Pads():
        if pad.GetAttribute() == pcbnew.PAD_ATTRIB_PTH:
            pos = pad.GetPosition()
            r = max(pcbnew.ToMM(pad.GetSizeX()), pcbnew.ToMM(pad.GetSizeY())) / 2
            tht_pads.append((fp.GetReference(), pad.GetNumber(),
                             pcbnew.ToMM(pos.x), pcbnew.ToMM(pos.y), r))

smd_refs = [r for r in refs
            if not any(pp.GetAttribute() == pcbnew.PAD_ATTRIB_PTH
                       for f in board.GetFootprints() if f.GetReference() == r
                       for pp in f.Pads())]
CLEAR = 0.0
for ref in smd_refs:
    l, tt, r, b = boxes[ref]
    for pref, pnum, px, py, pr in tht_pads:
        if pref == ref:
            continue
        if l - CLEAR < px + pr and px - pr < r + CLEAR and \
           tt - CLEAR < py + pr and py - pr < b + CLEAR:
            print(f"SMD-vs-PAD {ref} <-> {pref}.{pnum} at ({px:.1f},{py:.1f})")
            bad += 1

print("PLACEMENT:", "FAIL" if bad else "CLEAN")

import sys
import pcbnew

# rev 2: D5-D8 (channel LEDs) moved to TOP for visibility; buck parts
# (U6/L1/D2/C7-C15/R14-R18) join the back; D12/D13/R19/R20/TP1-4 are TOP.
BACK = {
    "Q1","D1","C2","R1","U2","R21","R5","R6","R7",
    "R8","D9","D10","D11","R2","U5","C3","U4","C4","R3","R4","R9","JP2",
    "R10","R11","R12","R13","C5","C6",
    "U6","L1","C7","C8","C10","C11","C12","C16","R16","R17",
    "R19","R20",
}
board = pcbnew.LoadBoard(sys.argv[1])
n = 0
for fp in board.GetFootprints():
    if fp.GetReference() in BACK and fp.GetLayer() == pcbnew.F_Cu:
        fp.Flip(fp.GetPosition(), True)
        n += 1
    if fp.GetReference() == "J3" and fp.GetLayer() == pcbnew.F_Cu:
        # official HAT template: socket body on B.Cu, rot 270 at (8.37,4.77)
        fp.Flip(fp.GetPosition(), True)
        fp.SetOrientationDegrees(270)
        n += 1
# rev 2: freerouting reliably strands the +3V3 island feeding the
# EEPROM cluster. Pre-place a LOCKED bridge (J3.17 -> C4.1) so the DSN
# export marks it fixed and the router works around it.
def pad_pos(ref, num):
    for fp in board.GetFootprints():
        if fp.GetReference() == ref:
            for pad in fp.Pads():
                if pad.GetNumber() == num:
                    pos = pad.GetPosition()
                    return (pcbnew.ToMM(pos.x), pcbnew.ToMM(pos.y))
    raise KeyError(f"{ref}.{num}")

j17 = pad_pos("J3", "17")
c41 = pad_pos("C4", "1")
r31 = pad_pos("R3", "1")
r41 = pad_pos("R4", "1")
pts = [j17, (j17[0], 3.45), (19.83, 3.45), (19.83, 24.3),
       (c41[0], 24.3), c41,
       # EEPROM-cluster spine: tie all +3V3 arms so the router never
       # strands one (it reliably did, on varying seeds)
       r31, r41]
net = board.FindNet("+3V3")
for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
    tr = pcbnew.PCB_TRACK(board)
    tr.SetStart(pcbnew.VECTOR2I(pcbnew.FromMM(x1), pcbnew.FromMM(y1)))
    tr.SetEnd(pcbnew.VECTOR2I(pcbnew.FromMM(x2), pcbnew.FromMM(y2)))
    tr.SetLayer(pcbnew.B_Cu)
    tr.SetWidth(pcbnew.FromMM(0.25))
    tr.SetNetCode(net.GetNetCode())
    tr.SetLocked(True)
    board.Add(tr)
print("locked +3V3 bridge placed")

pcbnew.SaveBoard(sys.argv[1], board)
print("flipped to back:", n)

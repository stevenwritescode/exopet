import sys
import pcbnew

# rev 2: D5-D8 (channel LEDs) moved to TOP for visibility; buck parts
# (U6/L1/D2/C7-C15/R14-R18) join the back; D12/D13/R19/R20/TP1-4 are TOP.
BACK = {
    "Q1","D1","C2","R1","U2","D3","C1","C17","R5","R6","R7",
    "R8","D9","D10","D11","R2","U5","C3","U4","C4","R3","R4","R9","JP2",
    "R10","R11","R12","R13","C5","C6",
    "U6","L1","C7","C8","C10","C11","C12","C16","R16","R17",
    "U7","C18","R22","R23",
    "R19","R20",
    "U8","U9","U10","U11","C20","C21","C22","C25","C26","C27","C28",
    "R24","R25","R26","R27",
}
VARIANT = sys.argv[2] if len(sys.argv) > 2 else "std"
if VARIANT == "std":
    BACK |= {"D5", "D6", "D7", "D8"}  # all channel LEDs to back on std
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

# GPIO23 (J3.16 -> U2.4) also strands on varying seeds now that the
# left side is dense. Locked pre-route: F.Cu down the pin-16 column and
# across at y=40.5, via, short B.Cu escape into U2 pad 4.
j316 = pad_pos("J3", "16")
u24 = pad_pos("U2", "4")
via_pt = (8.3, 42.0)
net23 = board.FindNet("GPIO23")
def add_seg(p1, p2, layer):
    tr = pcbnew.PCB_TRACK(board)
    tr.SetStart(pcbnew.VECTOR2I(pcbnew.FromMM(p1[0]), pcbnew.FromMM(p1[1])))
    tr.SetEnd(pcbnew.VECTOR2I(pcbnew.FromMM(p2[0]), pcbnew.FromMM(p2[1])))
    tr.SetLayer(layer)
    tr.SetWidth(pcbnew.FromMM(0.25))
    tr.SetNetCode(net23.GetNetCode())
    tr.SetLocked(True)
    board.Add(tr)
# descend the column MIDLINE (pins 15/16 share x; straight down hits
# GPIO22), jog across at y=41.3 (clear of K3.4 annulus at y=39.3)
mid_x = j316[0] + 1.285
add_seg(j316, (mid_x, 3.9), pcbnew.F_Cu)
add_seg((mid_x, 3.9), (mid_x, 42.0), pcbnew.F_Cu)
add_seg((mid_x, 42.0), via_pt, pcbnew.F_Cu)
via = pcbnew.PCB_VIA(board)
via.SetPosition(pcbnew.VECTOR2I(pcbnew.FromMM(via_pt[0]), pcbnew.FromMM(via_pt[1])))
via.SetDrill(pcbnew.FromMM(0.3))
via.SetWidth(pcbnew.FromMM(0.6))
via.SetNetCode(net23.GetNetCode())
via.SetLocked(True)
board.Add(via)
add_seg(via_pt, (via_pt[0], u24[1]), pcbnew.B_Cu)
add_seg((via_pt[0], u24[1]), u24, pcbnew.B_Cu)
print("locked GPIO23 bridge placed")

pcbnew.SaveBoard(sys.argv[1], board)
print("flipped to back:", n)

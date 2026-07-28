import sys
import pcbnew

BACK = {
    "Q1","D1","C1","C2","R1","U2","JP1","R5","D5","R6","D6","R7","D7",
    "R8","D8","D9","D10","D11","R2","U5","C3","U4","C4","R3","R4","R9","JP2",
    "R10","R11","R12","R13","C5","C6",
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
pcbnew.SaveBoard(sys.argv[1], board)
print("flipped to back:", n)

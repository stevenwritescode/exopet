import sys
import pcbnew

# rev 2: D5-D8 (channel LEDs) moved to TOP for visibility; buck parts
# (U6/L1/D2/C7-C15/R14-R18) join the back; D12/D13/R19/R20/TP1-4 are TOP.
BACK = {
    "Q1","D1","C2","R1","U2","JP1","R5","R6","R7",
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
pcbnew.SaveBoard(sys.argv[1], board)
print("flipped to back:", n)

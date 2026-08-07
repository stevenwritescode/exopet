import sys
import pcbnew

board = pcbnew.LoadBoard(sys.argv[1])
print("loaded:", board.GetFileName())
print("footprints:", len(board.GetFootprints()))
print("nets:", board.GetNetCount())

# Inset the Edge.Cuts rect 0.2mm IN MEMORY (never saved): the router
# then keeps copper >=0.2mm inside the true edge, clearing the 0.4mm
# copper-to-edge DRC rule without seed lottery.
inset = pcbnew.FromMM(0.45)
n = 0
for d in board.GetDrawings():
    if d.GetLayer() == pcbnew.Edge_Cuts and d.GetClass() == "PCB_SHAPE":
        s, e = d.GetStart(), d.GetEnd()
        d.SetStart(pcbnew.VECTOR2I(s.x + inset, s.y + inset))
        d.SetEnd(pcbnew.VECTOR2I(e.x - inset, e.y - inset))
        n += 1
print("edge shapes inset:", n)
assert n, "no Edge.Cuts rect found"

ok = pcbnew.ExportSpecctraDSN(board, sys.argv[2])
print("DSN export:", ok)

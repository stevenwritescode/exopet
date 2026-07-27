import sys
import pcbnew
board = pcbnew.LoadBoard(sys.argv[1])
print("loaded:", board.GetFileName())
print("footprints:", len(board.GetFootprints()))
print("nets:", board.GetNetCount())
# fill zones so the exporter and DRC see real copper
filler = pcbnew.ZONE_FILLER(board)
filler.Fill(board.Zones())
pcbnew.SaveBoard(sys.argv[1], board)
ok = pcbnew.ExportSpecctraDSN(board, sys.argv[2])
print("DSN export:", ok)

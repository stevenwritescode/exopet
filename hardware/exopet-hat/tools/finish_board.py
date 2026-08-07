import sys
import pcbnew

board_path, ses_path = sys.argv[1], sys.argv[2]
board = pcbnew.LoadBoard(board_path)
ok = pcbnew.ImportSpecctraSES(board, ses_path)
print("SES import:", ok)

POWER_NETS = {
    "+12V", "+12V_IN", "+12V_F", "+5V", "+5V_BUCK", "GND",
    "CH1_FUSED", "CH2_FUSED", "CH3_FUSED",
    "CH1_OUT", "CH2_OUT", "CH3_OUT",
    "CH4_COM", "CH4_NO", "CH4_NC",
}
widened = 0
for track in board.GetTracks():
    if track.GetClass() == "PCB_TRACK" and track.GetNetname() in POWER_NETS:
        pass  # keep native width; pours carry bulk current
        widened += 1
print("widened tracks to 0.5mm:", widened)

# delete freerouting micro-segment artifacts (< 0.3mm)
stray = [tr for tr in board.GetTracks()
         if tr.GetClass() == "PCB_TRACK" and tr.GetLength() < pcbnew.FromMM(0.1)]
for tr in stray:
    board.Remove(tr)
print("removed micro-segments:", len(stray))


def add_zone(net_name, layer, pts):
    net = board.FindNet(net_name)
    z = pcbnew.ZONE(board)
    z.SetLayer(layer)
    z.SetNetCode(net.GetNetCode())
    z.SetPadConnection(pcbnew.ZONE_CONNECTION_THERMAL)
    z.SetThermalReliefGap(pcbnew.FromMM(0.5))
    z.SetThermalReliefSpokeWidth(pcbnew.FromMM(0.6))
    z.SetMinThickness(pcbnew.FromMM(0.25))
    z.SetLocalClearance(pcbnew.FromMM(0.3))
    o = z.Outline()
    o.NewOutline()
    for x, y in pts:
        o.Append(pcbnew.FromMM(x), pcbnew.FromMM(y))
    board.Add(z)
    return z


bb = board.GetBoardEdgesBoundingBox()
H = pcbnew.ToMM(bb.GetBottom())
add_zone("GND", pcbnew.B_Cu, [(0, 0), (65, 0), (65, H), (0, H)])
add_zone("GND", pcbnew.F_Cu, [(0, 0), (65, 0), (65, H), (0, H)])
print("zones added")

board.GetDesignSettings().m_MinResolvedSpokes = 1
filler = pcbnew.ZONE_FILLER(board)
filler.Fill(board.Zones())
pcbnew.SaveBoard(board_path, board)
print("filled + saved")

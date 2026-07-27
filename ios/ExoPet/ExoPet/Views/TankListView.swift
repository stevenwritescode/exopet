import SwiftUI

struct TankListView: View {
    let api: APIService
    let ws: WebSocketService
    @StateObject private var vm: TankListViewModel
    @Binding var navigationPath: NavigationPath

    init(api: APIService, ws: WebSocketService, navigationPath: Binding<NavigationPath>) {
        self.api = api
        self.ws = ws
        self._navigationPath = navigationPath
        _vm = StateObject(wrappedValue: TankListViewModel(api: api))
    }

    var body: some View {
        VStack(spacing: 0) {
            AppBarView(title: "Tanks") {
                Button(action: { navigationPath = NavigationPath() }) {
                    HStack(spacing: 4) {
                        Image(systemName: "house.fill")
                            .foregroundColor(.white)
                    }
                }
            }

            ScrollView {
                LazyVStack(spacing: 8) {
                    ForEach(vm.tanks.filter { !$0.isSump }) { tank in
                        TankCardView(tank: tank)
                        if let sump = vm.tanks.first(where: {
                            $0.isSump && $0.parent_tank_id == tank.id
                        }) {
                            HStack(spacing: 8) {
                                Image(systemName: "arrow.turn.down.right")
                                    .foregroundColor(.gray)
                                Text(sump.name ?? "Sump")
                                    .foregroundColor(.white)
                                Text("SUMP")
                                    .font(.caption2)
                                    .fontWeight(.bold)
                                    .foregroundColor(.gray)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 4)
                                            .stroke(Color.gray, lineWidth: 1)
                                    )
                                Spacer()
                            }
                            .padding(.horizontal, 24)
                            .padding(.vertical, 6)
                        }
                    }
                }
                .padding()
            }
            .refreshable { vm.loadTanks() }
        }
        .background(ExoPetColors.background)
        .navigationBarHidden(true)
        .onAppear { vm.loadTanks() }
    }
}

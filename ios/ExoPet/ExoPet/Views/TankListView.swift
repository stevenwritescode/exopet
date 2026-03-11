import SwiftUI

struct TankListView: View {
    let api: APIService
    let ws: WebSocketService
    @StateObject private var vm: TankListViewModel

    init(api: APIService, ws: WebSocketService) {
        self.api = api
        self.ws = ws
        _vm = StateObject(wrappedValue: TankListViewModel(api: api))
    }

    var body: some View {
        VStack(spacing: 0) {
            AppBarView(title: "Tanks") {
                NavigationLink(value: Route.tanks) {
                    // Empty — we're already on this screen
                }
                .hidden()
                HStack(spacing: 4) {
                    Image(systemName: "house.fill")
                        .foregroundColor(.white)
                }
            }

            ScrollView {
                LazyVStack(spacing: 8) {
                    ForEach(vm.tanks) { tank in
                        TankCardView(tank: tank)
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

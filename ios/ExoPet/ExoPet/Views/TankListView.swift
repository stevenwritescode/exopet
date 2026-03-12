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

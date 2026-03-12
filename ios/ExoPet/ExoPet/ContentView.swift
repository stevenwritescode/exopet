import SwiftUI

struct ContentView: View {
    @StateObject private var serverSelection = ServerSelectionViewModel()
    @State private var navigationPath = NavigationPath()

    var body: some View {
        Group {
            if let api = serverSelection.apiService,
               let ws = serverSelection.webSocketService {
                NavigationStack(path: $navigationPath) {
                    HomeView(api: api, ws: ws, navigationPath: $navigationPath)
                }
            } else {
                ServerSelectionView(viewModel: serverSelection)
            }
        }
        .background(ExoPetColors.background)
    }
}

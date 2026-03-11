import SwiftUI

struct ContentView: View {
    @StateObject private var serverSelection = ServerSelectionViewModel()

    var body: some View {
        Group {
            if let api = serverSelection.apiService,
               let ws = serverSelection.webSocketService {
                NavigationStack {
                    HomeView(api: api, ws: ws)
                }
            } else {
                ServerSelectionView(viewModel: serverSelection)
            }
        }
        .background(ExoPetColors.background)
    }
}

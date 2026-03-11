import Foundation

@MainActor
class TankListViewModel: ObservableObject {
    @Published var tanks: [Tank] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let api: APIService

    init(api: APIService) {
        self.api = api
    }

    func loadTanks() {
        Task {
            isLoading = true
            errorMessage = nil
            do {
                tanks = try await api.getAllTanks()
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }
}

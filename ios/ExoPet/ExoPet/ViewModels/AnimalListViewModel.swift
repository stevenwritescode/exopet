import Foundation

@MainActor
class AnimalListViewModel: ObservableObject {
    @Published var animals: [Animal] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let api: APIService

    init(api: APIService) {
        self.api = api
    }

    func loadAnimals() {
        Task {
            isLoading = true
            errorMessage = nil
            do {
                animals = try await api.getAllAnimals()
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }
}

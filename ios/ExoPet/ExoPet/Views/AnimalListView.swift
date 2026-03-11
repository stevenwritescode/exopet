import SwiftUI

struct AnimalListView: View {
    let api: APIService
    let ws: WebSocketService
    @StateObject private var vm: AnimalListViewModel
    @State private var feedAnimal: Animal?

    init(api: APIService, ws: WebSocketService) {
        self.api = api
        self.ws = ws
        _vm = StateObject(wrappedValue: AnimalListViewModel(api: api))
    }

    var body: some View {
        VStack(spacing: 0) {
            AppBarView(title: "Animals") {
                HStack(spacing: 4) {
                    Image(systemName: "house.fill")
                        .foregroundColor(.white)
                }
            }

            ScrollView {
                LazyVStack(spacing: 8) {
                    ForEach(vm.animals) { animal in
                        AnimalCardView(
                            animal: animal,
                            onFeed: { feedAnimal = animal }
                        )
                    }
                }
                .padding()
            }
            .refreshable { vm.loadAnimals() }
        }
        .background(ExoPetColors.background)
        .navigationBarHidden(true)
        .onAppear { vm.loadAnimals() }
        .fullScreenCover(item: $feedAnimal) { animal in
            FeedingDialogView(
                animalName: animal.name ?? "Animal",
                onSave: { logJson in
                    let request = FeedingLogRequest(
                        animal_id: animal.id,
                        action_type: "Feeding",
                        container_id: animal.enclosure_id,
                        log_json: logJson
                    )
                    Task {
                        let _ = try? await api.addFeedingLog(request: request)
                    }
                    feedAnimal = nil
                },
                onClose: { feedAnimal = nil }
            )
        }
    }
}

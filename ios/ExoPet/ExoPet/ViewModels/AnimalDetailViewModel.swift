import Foundation

@MainActor
class AnimalDetailViewModel: ObservableObject {
    @Published var animal: Animal
    @Published var logs: [Log] = []
    @Published var latestFeeding: Log?
    @Published var tankDetails: Tank?
    @Published var currentTemp: Double?
    @Published var feedingDialogOpen = false
    @Published var feedingLogsOpen = false
    @Published var editDialogOpen = false

    let animalId: String
    private let api: APIService
    private let ws: WebSocketService

    static let feedingOKHours: Double = 48
    static let feedingUrgentHours: Double = 72

    init(animalId: String, api: APIService, ws: WebSocketService) {
        self.animalId = animalId
        self.api = api
        self.ws = ws
        self.animal = Animal(id: animalId)
    }

    var feedingDiffHours: Double {
        guard let feeding = latestFeeding else { return .infinity }
        return DateUtils.hoursSince(feeding.timestamp)
    }

    var canFeed: Bool { feedingDiffHours >= Self.feedingOKHours }
    var urgentToFeed: Bool { feedingDiffHours >= Self.feedingUrgentHours }

    var feedLabel: String {
        if latestFeeding == nil || feedingDiffHours >= Self.feedingOKHours {
            return "FEED!"
        }
        return "FED"
    }

    var feedingStatusText: String {
        if latestFeeding == nil {
            return "\(animal.name ?? "Animal") has not been fed yet."
        }
        if urgentToFeed {
            return "Needs to be fed ASAP!"
        }
        if canFeed {
            return "Ready for feeding."
        }
        return "Recently fed."
    }

    var feedingDetailText: String? {
        guard let feeding = latestFeeding, let logJson = feeding.log_json else { return nil }
        let qty = logJson.quantity ?? 0
        let food = logJson.food_type ?? "unknown"
        let plural = qty > 1 ? "s" : ""
        guard let date = feeding.parsedDate else { return nil }
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        formatter.doesRelativeDateFormatting = false
        let dateStr = formatter.string(from: date)
        return "Ate \(qty) \(food)\(plural) at \(dateStr)"
    }

    func onAppear() {
        fetchAnimal()
        setupWebSocket()
    }

    func fetchAnimal() {
        Task {
            do {
                let data = try await api.getAnimalDetails(animalId: animalId)
                self.animal = data.animal
                self.logs = data.logs
                self.latestFeeding = data.logs.first

                if let enclosureId = data.animal.enclosure_id, !enclosureId.isEmpty {
                    let tank = try await api.getTankDetails(tankId: enclosureId)
                    self.tankDetails = tank
                }
            } catch {
                print("Error fetching animal: \(error)")
            }
        }
    }

    private func setupWebSocket() {
        ws.onMessage { [weak self] msg in
            Task { @MainActor [weak self] in
                guard let action = msg.action else { return }
                if action == ParameterAction.temperature.rawValue {
                    if let avg = msg.data?["average"] as? Double {
                        self?.currentTemp = avg
                    }
                }
            }
        }
    }

    func addFeedingLog(logJson: String) {
        Task {
            do {
                let request = FeedingLogRequest(
                    animal_id: animalId,
                    action_type: "Feeding",
                    container_id: animal.tank_id,
                    log_json: logJson
                )
                let _ = try await api.addFeedingLog(request: request)
                fetchAnimal()
            } catch {
                print("Error adding feeding log: \(error)")
            }
        }
    }

    func saveEdit(fields: AnimalUpdateFields) {
        Task {
            do {
                try await api.updateAnimal(animalId: animalId, fields: fields)
            } catch {
                print("Error updating animal: \(error)")
            }
            fetchAnimal()
        }
    }

    func deleteLog(logId: String) {
        Task {
            do {
                try await api.deleteFeedingLog(logId: logId)
                fetchAnimal()
            } catch {
                print("Error deleting log: \(error)")
            }
        }
    }
}

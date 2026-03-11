import Foundation

@MainActor
class FeedingLogsViewModel: ObservableObject {
    @Published var showDeleteConfirmation = false
    @Published var logToDelete: Log?

    func confirmDelete(log: Log) {
        logToDelete = log
        showDeleteConfirmation = true
    }
}

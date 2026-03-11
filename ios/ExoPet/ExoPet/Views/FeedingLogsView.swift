import SwiftUI

struct FeedingLogsView: View {
    let animalName: String
    let logs: [Log]
    let onDelete: (String) -> Void
    let onClose: () -> Void

    @StateObject private var vm = FeedingLogsViewModel()
    @State private var currentTime = Date()
    private let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    var body: some View {
        VStack(spacing: 0) {
            // App bar
            HStack {
                Button(action: onClose) {
                    Image(systemName: "xmark")
                        .font(.title3)
                        .foregroundColor(.white)
                }
                .frame(minWidth: 80, alignment: .leading)

                Spacer()

                Text("Feeding Logs")
                    .font(.headline)
                    .foregroundColor(.white)

                Spacer()

                Text(currentTime, style: .time)
                    .font(.subheadline)
                    .foregroundColor(.white)
                    .frame(minWidth: 80, alignment: .trailing)
            }
            .padding()
            .background(Color.accentColor)

            Text(animalName)
                .font(.title3)
                .foregroundColor(.white)
                .padding(.top, 12)
                .padding(.bottom, 8)

            ScrollView {
                LazyVStack(spacing: 8) {
                    ForEach(logs) { log in
                        logCard(log)
                    }
                }
                .padding(.horizontal)
            }

            Spacer()
        }
        .background(ExoPetColors.background)
        .onReceive(timer) { currentTime = $0 }
        .alert("Delete Log", isPresented: $vm.showDeleteConfirmation) {
            Button("Delete", role: .destructive) {
                if let log = vm.logToDelete {
                    onDelete(log.id)
                }
                vm.logToDelete = nil
            }
            Button("Cancel", role: .cancel) {
                vm.logToDelete = nil
            }
        } message: {
            Text("Are you sure you want to delete this feeding log?")
        }
    }

    @ViewBuilder
    private func logCard(_ log: Log) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            // Delete button row
            HStack {
                Spacer()
                Button(action: { vm.confirmDelete(log: log) }) {
                    Image(systemName: "trash")
                        .font(.caption)
                        .foregroundColor(.red)
                }
            }

            // Action type
            Text(log.action_type)
                .font(.subheadline)
                .fontWeight(.bold)
                .frame(maxWidth: .infinity, alignment: .center)

            // Details
            HStack(alignment: .top) {
                // Date/Time
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 4) {
                        Text("Date:")
                            .font(.caption)
                            .foregroundColor(Color(white: 0.67))
                        Text(log.localDateString)
                            .font(.caption)
                            .foregroundColor(.white)
                    }
                    HStack(spacing: 4) {
                        Text("Time:")
                            .font(.caption)
                            .foregroundColor(Color(white: 0.67))
                        Text(log.localTimeString)
                            .font(.caption)
                            .foregroundColor(.white)
                    }
                }

                Spacer()

                // Food details
                VStack(alignment: .trailing, spacing: 4) {
                    HStack(spacing: 4) {
                        Text("Food Type:")
                            .font(.caption)
                            .foregroundColor(Color(white: 0.67))
                        Text(log.log_json?.food_type ?? "N/A")
                            .font(.caption)
                            .foregroundColor(.white)
                    }
                    HStack(spacing: 4) {
                        Text("Quantity:")
                            .font(.caption)
                            .foregroundColor(Color(white: 0.67))
                        Text(log.log_json?.quantity.map { "\($0)" } ?? "N/A")
                            .font(.caption)
                            .foregroundColor(.white)
                    }
                }
            }
        }
        .padding()
        .background(ExoPetColors.cardSurface)
        .cornerRadius(8)
    }
}

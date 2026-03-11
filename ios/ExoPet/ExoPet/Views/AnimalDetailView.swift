import SwiftUI

struct AnimalDetailView: View {
    let animalId: String
    let api: APIService
    let ws: WebSocketService
    @StateObject private var vm: AnimalDetailViewModel
    @Environment(\.horizontalSizeClass) var sizeClass

    init(animalId: String, api: APIService, ws: WebSocketService) {
        self.animalId = animalId
        self.api = api
        self.ws = ws
        _vm = StateObject(wrappedValue: AnimalDetailViewModel(animalId: animalId, api: api, ws: ws))
    }

    var body: some View {
        VStack(spacing: 0) {
            // App bar
            AppBarView(title: vm.animal.name ?? "Animal") {
                NavigationLink(value: Route.animals) {
                    HStack(spacing: 4) {
                        Image(systemName: "chevron.left")
                        Text("Animals")
                    }
                    .foregroundColor(.white)
                }
            }

            ScrollView {
                if sizeClass == .regular {
                    // iPad: two columns side by side
                    HStack(alignment: .top, spacing: 24) {
                        animalInfoColumn
                        actionsColumn
                    }
                    .padding()
                } else {
                    // iPhone: stacked
                    VStack(spacing: 20) {
                        animalInfoColumn
                        actionsColumn
                    }
                    .padding()
                }
            }
            .refreshable { vm.fetchAnimal() }
        }
        .background(ExoPetColors.background)
        .navigationBarHidden(true)
        .safeAreaInset(edge: .bottom) {
            if let tank = vm.tankDetails, !tank.id.isEmpty {
                TemperatureBarView(
                    tankId: tank.id,
                    tankSettings: tank.settings,
                    ws: ws
                )
            }
        }
        .fullScreenCover(isPresented: $vm.feedingDialogOpen) {
            FeedingDialogView(
                animalName: vm.animal.name ?? "Animal",
                onSave: { logJson in
                    vm.addFeedingLog(logJson: logJson)
                    vm.feedingDialogOpen = false
                },
                onClose: { vm.feedingDialogOpen = false }
            )
        }
        .fullScreenCover(isPresented: $vm.feedingLogsOpen) {
            FeedingLogsView(
                animalName: vm.animal.name ?? "Animal",
                logs: vm.logs,
                onDelete: { logId in vm.deleteLog(logId: logId) },
                onClose: { vm.feedingLogsOpen = false }
            )
        }
        .fullScreenCover(isPresented: $vm.editDialogOpen) {
            AnimalEditView(
                animal: vm.animal,
                onSave: { fields in
                    vm.saveEdit(fields: fields)
                    vm.editDialogOpen = false
                },
                onClose: { vm.editDialogOpen = false }
            )
        }
        .onAppear { vm.onAppear() }
    }

    // MARK: - Left Column: Animal Info

    @ViewBuilder
    private var animalInfoColumn: some View {
        VStack(spacing: 12) {
            HStack {
                Text(vm.animal.name ?? "")
                    .font(.system(size: 28, weight: .bold))
                    .textCase(.uppercase)
                    .foregroundColor(.white)

                Button(action: { vm.editDialogOpen = true }) {
                    Image(systemName: "pencil")
                        .foregroundColor(.gray)
                }
            }

            // Avatar
            Image(systemName: "pawprint.circle.fill")
                .font(.system(size: 80))
                .foregroundColor(.accentColor)
                .frame(width: 128, height: 128)

            Text(vm.animal.species ?? "")
                .font(.title3)
                .textCase(.uppercase)
                .foregroundColor(.gray)

            if let latin = vm.animal.species_latin, !latin.isEmpty {
                Text(latin)
                    .font(.body)
                    .italic()
                    .foregroundColor(.gray)
            }

            if let notes = vm.animal.notes, !notes.isEmpty {
                Text(notes)
                    .font(.subheadline)
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)
                    .padding(.top, 4)
            }
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Right Column: Actions

    @ViewBuilder
    private var actionsColumn: some View {
        VStack(spacing: 12) {
            // Tank Maintenance link
            if let enclosureId = vm.animal.enclosure_id, !enclosureId.isEmpty {
                NavigationLink(value: Tank(id: enclosureId, service_status: 0, settings: TankSettings())) {
                    HStack(spacing: 8) {
                        Image(systemName: "wrench.and.screwdriver.fill")
                        Text("Tank Maintenance")
                            .font(.caption)
                            .textCase(.uppercase)
                    }
                    .frame(maxWidth: 200)
                    .padding()
                    .background(ExoPetColors.cardSurface)
                    .foregroundColor(.white)
                    .cornerRadius(8)
                }
            }

            // View Feeding Logs
            Button(action: { vm.feedingLogsOpen = true }) {
                HStack(spacing: 8) {
                    Image(systemName: "doc.text.fill")
                    Text("View Feeding Logs")
                        .font(.caption)
                        .textCase(.uppercase)
                }
                .frame(maxWidth: 200)
                .padding()
                .background(ExoPetColors.cardSurface)
                .foregroundColor(.white)
                .cornerRadius(8)
            }

            // Feed button
            FeedButtonView(
                canFeed: vm.canFeed,
                urgentToFeed: vm.urgentToFeed,
                feedLabel: vm.feedLabel,
                action: { vm.feedingDialogOpen = true }
            )
            .frame(maxWidth: 200)

            // Feeding status text
            Button(action: { vm.feedingDialogOpen = true }) {
                VStack(spacing: 4) {
                    HStack(spacing: 4) {
                        Image(systemName: "clock.fill")
                            .font(.caption)
                        Text(vm.feedingStatusText)
                            .font(.caption)
                            .textCase(.uppercase)
                            .multilineTextAlignment(.center)
                    }
                    if let detail = vm.feedingDetailText {
                        Text(detail)
                            .font(.caption2)
                            .multilineTextAlignment(.center)
                    }
                }
                .foregroundColor(
                    vm.urgentToFeed ? ExoPetColors.feedUrgent :
                    vm.canFeed ? ExoPetColors.feedReady :
                    ExoPetColors.feedRecent
                )
                .frame(maxWidth: 200)
            }
        }
        .frame(maxWidth: .infinity)
    }
}

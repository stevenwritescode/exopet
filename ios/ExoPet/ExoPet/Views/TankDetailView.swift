import SwiftUI

struct TankDetailView: View {
    let tankId: String
    let api: APIService
    @ObservedObject var ws: WebSocketService
    @StateObject private var vm: TankDetailViewModel
    @State private var showAddSump = false
    @State private var showDisconnectConfirm = false
    @State private var newSumpName = ""

    init(tankId: String, api: APIService, ws: WebSocketService) {
        self.tankId = tankId
        self.api = api
        self.ws = ws
        _vm = StateObject(wrappedValue: TankDetailViewModel(tankId: tankId, api: api, ws: ws))
    }

    var body: some View {
        VStack(spacing: 0) {
            // App bar
            AppBarView(title: vm.tank.name ?? "Tank") {
                NavigationLink(value: Route.tanks) {
                    HStack(spacing: 4) {
                        Image(systemName: "chevron.left")
                        Text("Tanks")
                    }
                    .foregroundColor(.white)
                }
            }

            ScrollView {
                VStack(spacing: 20) {
                    // Connection indicator
                    ConnectionIndicatorView(isConnected: ws.isConnected)

                    // Animals section
                    animalsSection

                    // Sump section
                    sumpSection

                    // Maintenance controls
                    MaintenanceControlsView(vm: vm)

                    // Water level
                    WaterLevelIndicatorView(
                        waterFull: vm.waterFull,
                        onCheck: vm.handleCheckWaterLevel
                    )
                }
                .padding()
            }
            .refreshable { vm.refreshData() }
        }
        .background(ExoPetColors.background)
        .navigationBarHidden(true)
        .safeAreaInset(edge: .bottom) {
            if !vm.tank.id.isEmpty {
                TemperatureBarView(
                    tankId: tankId,
                    tankSettings: vm.tank.settings,
                    ws: ws
                )
            }
        }
        .fullScreenCover(isPresented: $vm.settingsOpen) {
            SettingsView(
                settings: vm.tank.effectiveSettings,
                onSave: { settings in
                    vm.saveSettings(settings)
                },
                onClose: { vm.settingsOpen = false }
            )
        }
        .onAppear { vm.onAppear() }
        .onDisappear { vm.onDisappear() }
    }

    @ViewBuilder
    private var sumpSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Sump")
                .font(.headline)
                .textCase(.uppercase)
                .foregroundColor(.white)

            if let sump = vm.sump {
                VStack(spacing: 0) {
                    HStack {
                        Image(systemName: "water.waves")
                            .foregroundColor(.accentColor)
                        Text(sump.name ?? "Sump")
                            .foregroundColor(.white)
                        Spacer()
                        Button("Disconnect") {
                            showDisconnectConfirm = true
                        }
                        .font(.subheadline)
                        .foregroundColor(.red)
                    }
                    .padding()
                    .background(ExoPetColors.cardSurface)
                    .cornerRadius(8)

                    HStack {
                        Circle()
                            .fill(sumpStatusColor)
                            .frame(width: 10, height: 10)
                        Text(sumpStatusLabel)
                            .font(.subheadline)
                            .foregroundColor(vm.sumpState == .lockedOut ? .red : .white)
                        Spacer()
                        if vm.sumpState == .lockedOut {
                            Button("Reset Lockout") { vm.handleResetSumpLockout() }
                                .font(.subheadline)
                                .foregroundColor(.red)
                        } else if vm.sumpState == .stopped {
                            Button("Start") { vm.handleStartSump() }
                                .font(.subheadline)
                                .disabled(vm.serviceStatus > .idle)
                        } else {
                            Button("Stop") { vm.handleStopSump() }
                                .font(.subheadline)
                        }
                    }
                    .padding()
                    .background(ExoPetColors.cardSurface)
                    .cornerRadius(8)
                }
                .alert("Disconnect sump?", isPresented: $showDisconnectConfirm) {
                    Button("Disconnect", role: .destructive) { vm.disconnectSump() }
                    Button("Cancel", role: .cancel) {}
                } message: {
                    Text("\(sump.name ?? "The sump") will become a standalone tank.")
                }
            } else {
                HStack(spacing: 8) {
                    Button {
                        newSumpName = ""
                        showAddSump = true
                    } label: {
                        Label("Add Sump", systemImage: "plus")
                            .font(.subheadline)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 10)
                    }
                    .background(ExoPetColors.cardSurface)
                    .foregroundColor(.white)
                    .cornerRadius(8)

                    Menu {
                        if vm.eligibleSumps.isEmpty {
                            Text("No eligible tanks")
                        } else {
                            ForEach(vm.eligibleSumps) { candidate in
                                Button(candidate.name ?? "Unnamed") {
                                    vm.connectSump(candidate)
                                }
                            }
                        }
                    } label: {
                        Label("Connect Existing", systemImage: "link")
                            .font(.subheadline)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 10)
                    }
                    .background(ExoPetColors.cardSurface)
                    .foregroundColor(.white)
                    .cornerRadius(8)
                }
                .alert("Add Sump", isPresented: $showAddSump) {
                    TextField("Sump name", text: $newSumpName)
                    Button("Create") {
                        let name = newSumpName.trimmingCharacters(in: .whitespaces)
                        if !name.isEmpty { vm.addSump(named: name) }
                    }
                    Button("Cancel", role: .cancel) {}
                } message: {
                    Text("Creates a sump tank connected to \(vm.tank.name ?? "this tank").")
                }
            }
        }
    }

    private var sumpStatusLabel: String {
        switch vm.sumpState {
        case .stopped: return "Stopped"
        case .openingValve: return "Opening Valve…"
        case .running: return "Running"
        case .stopping: return "Stopping…"
        case .lockedOut: return vm.sumpFull ? "LOCKED OUT — Sump Full" : "LOCKED OUT"
        }
    }

    private var sumpStatusColor: Color {
        switch vm.sumpState {
        case .running: return .green
        case .openingValve, .stopping: return .yellow
        case .stopped: return .gray
        case .lockedOut: return .red
        }
    }

    @ViewBuilder
    private var animalsSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Animals")
                .font(.headline)
                .textCase(.uppercase)
                .foregroundColor(.white)

            if vm.animals.isEmpty {
                Text("No animals in this tank")
                    .font(.subheadline)
                    .foregroundColor(.gray)
                    .frame(maxWidth: .infinity)
                    .padding()
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(vm.animals) { animal in
                            NavigationLink(value: animal) {
                                HStack(spacing: 8) {
                                    Image(systemName: "pawprint.circle.fill")
                                        .font(.title2)
                                        .foregroundColor(ExoPetColors.animalSection)
                                    Text(animal.name ?? "")
                                        .foregroundColor(ExoPetColors.animalSection)
                                }
                                .padding(.horizontal, 16)
                                .padding(.vertical, 10)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(ExoPetColors.animalSection, lineWidth: 1)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

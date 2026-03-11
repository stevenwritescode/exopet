import SwiftUI

struct TankDetailView: View {
    let tankId: String
    let api: APIService
    @ObservedObject var ws: WebSocketService
    @StateObject private var vm: TankDetailViewModel

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

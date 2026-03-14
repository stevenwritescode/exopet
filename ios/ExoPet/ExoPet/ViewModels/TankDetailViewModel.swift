import Foundation
import Combine

@MainActor
class TankDetailViewModel: ObservableObject {
    @Published var tank: Tank = .empty
    @Published var animals: [Animal] = []
    @Published var logs: [Log] = []
    @Published var serviceStatus: ServiceState = .idle
    @Published var currentTemp: Double?
    @Published var waterFull = false
    @Published var waterChangeInProgress = false
    @Published var waterChangeProgress: Double = 0
    @Published var drainProgress: Double = 0
    @Published var fillProgress: Double = 0
    @Published var cancelInProgress = false
    @Published var settingsOpen = false

    let tankId: String
    private let api: APIService
    private let ws: WebSocketService
    private var progressTimer: Timer?
    private var waterLevelTimer: Timer?

    init(tankId: String, api: APIService, ws: WebSocketService) {
        self.tankId = tankId
        self.api = api
        self.ws = ws
    }

    func onAppear() {
        loadData()
        setupWebSocket()
        startPolling()
        startProgressSimulation()
    }

    func onDisappear() {
        progressTimer?.invalidate()
        progressTimer = nil
        waterLevelTimer?.invalidate()
        waterLevelTimer = nil
    }

    // MARK: - Data Loading

    private func loadData() {
        Task {
            do {
                let t = try await api.getTankDetails(tankId: tankId)
                self.tank = t
                self.serviceStatus = t.serviceState
            } catch {
                print("Error loading tank: \(error)")
            }

            do {
                let a = try await api.getAnimalsForTank(tankId: tankId)
                self.animals = a
            } catch {
                print("Error loading animals: \(error)")
            }

            do {
                let l = try await api.getLogsForTank(tankId: tankId)
                self.logs = l
            } catch {
                print("Error loading logs: \(error)")
            }
        }
    }

    func refreshData() {
        loadData()
    }

    // MARK: - WebSocket

    private func setupWebSocket() {
        ws.onMessage { [weak self] msg in
            Task { @MainActor [weak self] in
                self?.handleWSMessage(msg)
            }
        }
    }

    private func handleWSMessage(_ msg: WebSocketMessage) {
        guard let action = msg.action else { return }
        let data = msg.data

        switch action {
        case ParameterAction.temperature.rawValue:
            if let avg = data?["average"] as? Double {
                currentTemp = avg
            }

        case ParameterAction.waterLevel.rawValue:
            if let full = data?["waterFull"] as? Bool {
                waterFull = full
            }

        case ServiceUpdate.waterChangeComplete.rawValue:
            serviceStatus = .idle
            waterChangeInProgress = false
            waterChangeProgress = 100

        case ServiceUpdate.fillComplete.rawValue:
            serviceStatus = .idle

        case ServiceUpdate.drainComplete.rawValue:
            serviceStatus = .idle

        case ServiceUpdate.waterChangeBegan.rawValue:
            waterChangeInProgress = true
            waterChangeProgress = 0

        case ServiceUpdate.fillBegan.rawValue:
            serviceStatus = waterChangeInProgress ? .waterChangeFillingTank : .fillingTank
            fillProgress = 0

        case ServiceUpdate.drainBegan.rawValue:
            serviceStatus = waterChangeInProgress ? .waterChangeDraining : .draining
            drainProgress = 100

        case ServiceUpdate.stateReset.rawValue:
            serviceStatus = .idle
            cancelInProgress = false
            waterChangeInProgress = false
            drainProgress = 0
            fillProgress = 0
            waterChangeProgress = 0

        default:
            break
        }
    }

    // MARK: - Polling

    private func startPolling() {
        ws.requestWaterLevel(tankId: tankId)
        waterLevelTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in
                guard let self else { return }
                self.ws.requestWaterLevel(tankId: self.tankId)
            }
        }
    }

    // MARK: - Progress Simulation (matches TankDetail.tsx lines 166-185)

    private func startProgressSimulation() {
        progressTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in
                self?.tickProgress()
            }
        }
    }

    private func tickProgress() {
        let drainTime = tank.effectiveSettings.effectiveDrainTime
        let fillTime = tank.effectiveSettings.effectiveFillTime

        switch serviceStatus {
        case .waterChangeDraining, .draining:
            if drainTime > 0 {
                drainProgress = max(0, drainProgress - (100.0 / drainTime) * 0.5)
            }
            if waterChangeInProgress {
                waterChangeProgress = min(50, (100 - drainProgress) / 2)
            }

        case .waterChangeFillingTank, .fillingTank:
            if fillTime > 0 {
                fillProgress = min(100, fillProgress + (100.0 / fillTime) * 0.5)
            }
            if waterChangeInProgress {
                waterChangeProgress = min(100, 50 + fillProgress / 2)
            }

        default:
            if serviceStatus == .idle {
                waterChangeInProgress = false
                drainProgress = 0
                fillProgress = 0
            }
        }
    }

    // MARK: - Actions

    func handleWaterChange() {
        ws.startWaterChange(tankId: tankId)
    }

    func handleFillTank() {
        ws.startFillTank(tankId: tankId)
    }

    func handleDrainTank() {
        ws.startDrainTank(tankId: tankId)
    }

    func handleCancel() {
        cancelInProgress = true
        ws.cancelOperation(tankId: tankId)
    }

    func handleCheckWaterLevel() {
        ws.requestWaterLevel(tankId: tankId)
    }

    // MARK: - Settings

    func saveSettings(_ settings: TankSettings) {
        Task {
            do {
                var merged = tank.effectiveSettings
                merged.drain_time = settings.drain_time
                merged.fill_time = settings.fill_time
                merged.has_reservoir = settings.has_reservoir
                merged.schedule_enabled = settings.schedule_enabled
                merged.schedule_days = settings.schedule_days
                merged.schedule_time = settings.schedule_time
                let _ = try await api.updateTankSettings(tankId: tankId, settings: merged)
                loadData()
            } catch {
                print("Error saving settings: \(error)")
            }
        }
    }
}

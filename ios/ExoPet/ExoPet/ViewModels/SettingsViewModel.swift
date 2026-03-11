import Foundation

@MainActor
class SettingsViewModel: ObservableObject {
    @Published var drainTime: Double
    @Published var fillTime: Double
    @Published var hasReservoir: Bool

    init(settings: TankSettings) {
        self.drainTime = settings.drain_time ?? 0
        self.fillTime = settings.fill_time ?? 0
        self.hasReservoir = settings.has_reservoir ?? false
    }

    var drainTimeFormatted: String {
        DateUtils.formatDuration(seconds: drainTime)
    }

    var fillTimeFormatted: String {
        DateUtils.formatDuration(seconds: fillTime)
    }

    func buildSettings() -> TankSettings {
        TankSettings(
            drain_time: drainTime,
            fill_time: fillTime,
            has_reservoir: hasReservoir
        )
    }
}

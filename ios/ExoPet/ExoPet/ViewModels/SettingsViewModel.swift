import Foundation

@MainActor
class SettingsViewModel: ObservableObject {
    @Published var drainTime: Double
    @Published var fillTime: Double
    @Published var hasReservoir: Bool
    @Published var scheduleEnabled: Bool
    @Published var scheduleDays: Set<Int>
    @Published var scheduleTime: Date

    static let dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    init(settings: TankSettings) {
        self.drainTime = settings.drain_time ?? 0
        self.fillTime = settings.fill_time ?? 0
        self.hasReservoir = settings.has_reservoir ?? false
        self.scheduleEnabled = settings.schedule_enabled ?? false

        if let daysStr = settings.schedule_days, !daysStr.isEmpty {
            self.scheduleDays = Set(daysStr.split(separator: ",").compactMap { Int($0.trimmingCharacters(in: .whitespaces)) })
        } else {
            self.scheduleDays = []
        }

        if let timeStr = settings.schedule_time, !timeStr.isEmpty {
            let parts = timeStr.split(separator: ":")
            if parts.count == 2, let h = Int(parts[0]), let m = Int(parts[1]) {
                var comps = DateComponents()
                comps.hour = h
                comps.minute = m
                self.scheduleTime = Calendar.current.date(from: comps) ?? Date()
            } else {
                self.scheduleTime = Date()
            }
        } else {
            self.scheduleTime = Date()
        }
    }

    var drainTimeFormatted: String {
        DateUtils.formatDuration(seconds: drainTime)
    }

    var fillTimeFormatted: String {
        DateUtils.formatDuration(seconds: fillTime)
    }

    var scheduleTimeString: String {
        let comps = Calendar.current.dateComponents([.hour, .minute], from: scheduleTime)
        let h = String(format: "%02d", comps.hour ?? 0)
        let m = String(format: "%02d", comps.minute ?? 0)
        return "\(h):\(m)"
    }

    var scheduleDaysString: String {
        scheduleDays.sorted().map(String.init).joined(separator: ",")
    }

    func toggleDay(_ day: Int) {
        if scheduleDays.contains(day) {
            scheduleDays.remove(day)
        } else {
            scheduleDays.insert(day)
        }
    }

    func buildSettings() -> TankSettings {
        TankSettings(
            drain_time: drainTime,
            fill_time: fillTime,
            has_reservoir: hasReservoir,
            schedule_enabled: scheduleEnabled,
            schedule_days: scheduleDaysString,
            schedule_time: scheduleTimeString
        )
    }
}

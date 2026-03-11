import Foundation

struct Tank: Codable, Identifiable, Hashable {
    let id: String
    var name: String?
    var type: String?
    var service_status: Int?
    var settings: TankSettings?

    var serviceState: ServiceState {
        ServiceState(rawValue: service_status ?? 0) ?? .idle
    }

    var effectiveSettings: TankSettings {
        settings ?? TankSettings()
    }

    static let empty = Tank(
        id: "",
        name: nil,
        type: nil,
        service_status: 0,
        settings: TankSettings()
    )
}

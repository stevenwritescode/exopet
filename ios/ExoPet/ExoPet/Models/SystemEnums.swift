import Foundation

// MARK: - Service State Machine (matches System.State in aquario-models)
enum ServiceState: Int, Codable, Comparable {
    case idle = 0
    case draining = 1
    case fillingTank = 2
    case fillingReservoir = 3
    case waterChangeDraining = 4
    case waterChangeFillingTank = 5
    case waterChangeFillingReservoir = 6

    static func < (lhs: ServiceState, rhs: ServiceState) -> Bool {
        lhs.rawValue < rhs.rawValue
    }
}

// MARK: - Parameter Check / Update (matches System.ParameterCheck / ParameterUpdate)
enum ParameterAction: String {
    case temperature = "temperature"
    case ph = "ph"
    case oxygen = "oxygen"
    case waterLevel = "water_level"
}

// MARK: - Service Requests (client → server)
enum ServiceRequest: String {
    case resetState = "reset_state"
    case startWaterChange = "start_water_change"
    case startFillTank = "start_fill_tank"
    case startFillReservoir = "start_fill_reservoir"
    case startDrainTank = "start_drain_tank"
    case cancelWaterChange = "cancel_water_change"
    case cancelFillTank = "cancel_fill_tank"
    case cancelFillReservoir = "cancel_fill_reservoir"
    case cancelDrainTank = "cancel_drain_tank"
}

// MARK: - Service Updates (server → client)
enum ServiceUpdate: String {
    case stateReset = "state_reset"
    case waterChangeBegan = "water_change_began"
    case waterChangeComplete = "water_change_complete"
    case drainBegan = "water_drain_began"
    case drainComplete = "water_drain_complete"
    case fillBegan = "water_fill_began"
    case fillComplete = "water_fill_complete"
    case fillReservoirBegan = "fill_reservoir_began"
    case fillReservoirComplete = "fill_reservoir_complete"
}

// MARK: - Food Types (Feeding Dialog)
enum FoodType: String, CaseIterable, Identifiable {
    case pellet = "Pellet"
    case bloodworm = "Bloodworm"
    case earthworm = "Earthworm"

    var id: String { rawValue }
}

// MARK: - Food Quantities (Feeding Dialog)
enum FoodQuantity: Int, CaseIterable, Identifiable {
    case one = 1
    case two = 2
    case three = 3
    case fourPlus = 4

    var id: Int { rawValue }

    var displayLabel: String {
        self == .fourPlus ? "4+" : "\(rawValue)"
    }
}

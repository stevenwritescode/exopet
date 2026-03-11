import Foundation

struct TankSettings: Codable, Hashable {
    var volume: Double?
    var vol_unit: String?
    var drain_time: Double?
    var fill_time: Double?
    var res_fill_time: Double?
    var has_reservoir: Bool?
    var lower_temp_limit: Double?
    var upper_temp_limit: Double?
    var tank_id: String?

    var effectiveLowerTempLimit: Double { lower_temp_limit ?? 25.0 }
    var effectiveUpperTempLimit: Double { upper_temp_limit ?? 30.0 }
    var effectiveDrainTime: Double { drain_time ?? 0 }
    var effectiveFillTime: Double { fill_time ?? 0 }
}

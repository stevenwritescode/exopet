import Foundation

struct AnimalPreview {
    static let sample = Animal(
        id: "1",
        tank_id: "tank-1",
        name: "Cakepop",
        species: "Axolotl",
        species_latin: "Ambystoma mexicanum",
        notes: "Loves bloodworms",
        enclosure_id: "tank-1"
    )

    static let samples = [
        sample,
        Animal(id: "2", name: "Bubbles", species: "Axolotl", species_latin: "Ambystoma mexicanum", enclosure_id: "tank-1"),
        Animal(id: "3", name: "Nemo", species: "Clownfish", species_latin: "Amphiprioninae", enclosure_id: "tank-2"),
    ]
}

struct TankPreview {
    static let sample = Tank(
        id: "tank-1",
        name: "Main Tank",
        type: "Freshwater",
        service_status: 0,
        settings: TankSettings(
            volume: 40,
            vol_unit: "gallons",
            drain_time: 300,
            fill_time: 600,
            res_fill_time: 120,
            has_reservoir: true,
            lower_temp_limit: 16,
            upper_temp_limit: 20
        )
    )

    static let samples = [
        sample,
        Tank(id: "tank-2", name: "Reef Tank", type: "Saltwater", service_status: 0, settings: TankSettings()),
    ]
}

struct LogPreview {
    static let sample = Log(
        id: "log-1",
        action_type: "Feeding",
        animal_id: .string("1"),
        container_id: .string("tank-1"),
        timestamp: "2026-03-09 14:30:00",
        log_json: FeedingLogJSON(food_type: "Pellet", quantity: 2)
    )

    static let samples = [
        sample,
        Log(id: "log-2", action_type: "Feeding", animal_id: .string("1"), container_id: .string("tank-1"), timestamp: "2026-03-07 10:00:00", log_json: FeedingLogJSON(food_type: "Bloodworm", quantity: 3)),
        Log(id: "log-3", action_type: "Feeding", animal_id: .string("1"), container_id: .string("tank-1"), timestamp: "2026-03-05 08:15:00", log_json: FeedingLogJSON(food_type: "Earthworm", quantity: 1)),
    ]
}

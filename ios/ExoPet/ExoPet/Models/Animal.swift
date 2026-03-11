import Foundation

struct Animal: Codable, Identifiable, Hashable {
    let id: String
    var tank_id: String?
    var name: String?
    var species: String?
    var species_latin: String?
    var notes: String?
    var enclosure_id: String?
    var enclosure_type: String?
    var last_feeding_log: LastFeedingLog?

    static func == (lhs: Animal, rhs: Animal) -> Bool {
        lhs.id == rhs.id
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}

struct LastFeedingLog: Codable, Hashable {
    var log_type: String?
    var timestamp: String?
    var food_type: String?
    var food_quantity: Double?
    var log_json: String?
}

struct AnimalDetailResponse: Codable {
    let animal: Animal
    let logs: [Log]
}

struct AnimalUpdateFields: Codable {
    var name: String?
    var species: String?
    var species_latin: String?
    var notes: String?
}

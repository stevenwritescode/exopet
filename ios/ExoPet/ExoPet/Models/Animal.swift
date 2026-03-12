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

    private enum CodingKeys: String, CodingKey {
        case id, tank_id, name, species, species_latin, notes
        case enclosure_id, enclosure_type, last_feeding_log
    }

    init(id: String, tank_id: String? = nil, name: String? = nil, species: String? = nil, species_latin: String? = nil, notes: String? = nil, enclosure_id: String? = nil, enclosure_type: String? = nil, last_feeding_log: LastFeedingLog? = nil) {
        self.id = id
        self.tank_id = tank_id
        self.name = name
        self.species = species
        self.species_latin = species_latin
        self.notes = notes
        self.enclosure_id = enclosure_id
        self.enclosure_type = enclosure_type
        self.last_feeding_log = last_feeding_log
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        // id may be an Int (SQLite autoincrement) or String (UUID)
        if let intId = try? container.decode(Int.self, forKey: .id) {
            id = String(intId)
        } else {
            id = try container.decode(String.self, forKey: .id)
        }
        tank_id = try Self.decodeOptionalStringOrInt(container, forKey: .tank_id)
        name = try container.decodeIfPresent(String.self, forKey: .name)
        species = try container.decodeIfPresent(String.self, forKey: .species)
        species_latin = try container.decodeIfPresent(String.self, forKey: .species_latin)
        notes = try container.decodeIfPresent(String.self, forKey: .notes)
        enclosure_id = try Self.decodeOptionalStringOrInt(container, forKey: .enclosure_id)
        enclosure_type = try container.decodeIfPresent(String.self, forKey: .enclosure_type)
        last_feeding_log = try container.decodeIfPresent(LastFeedingLog.self, forKey: .last_feeding_log)
    }

    private static func decodeOptionalStringOrInt(_ container: KeyedDecodingContainer<CodingKeys>, forKey key: CodingKeys) throws -> String? {
        if let intVal = try? container.decode(Int.self, forKey: key) {
            return String(intVal)
        }
        return try container.decodeIfPresent(String.self, forKey: key)
    }

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

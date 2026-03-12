import Foundation

struct FeedingLogJSON: Codable, Hashable {
    var food_type: String?
    var quantity: Int?

    init(food_type: String? = nil, quantity: Int? = nil) {
        self.food_type = food_type
        self.quantity = quantity
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        // log_json may arrive as a JSON string or as an object
        if let jsonString = try? container.decode(String.self),
           let data = jsonString.data(using: .utf8) {
            let parsed = try JSONDecoder().decode(FeedingLogJSON.RawFields.self, from: data)
            self.food_type = parsed.food_type
            self.quantity = parsed.quantity
        } else {
            let keyed = try FeedingLogJSON.RawFields(from: decoder)
            self.food_type = keyed.food_type
            self.quantity = keyed.quantity
        }
    }

    private struct RawFields: Codable {
        var food_type: String?
        var quantity: Int?
    }
}

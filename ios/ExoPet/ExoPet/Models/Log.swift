import Foundation

struct Log: Codable, Identifiable, Hashable {
    let id: String
    var action_type: String
    var animal_id: AnyCodableID?
    var container_id: AnyCodableID?
    var timestamp: String
    var log_json: FeedingLogJSON?

    var parsedDate: Date? {
        DateUtils.parseSQLTimestamp(timestamp)
    }

    var localDateString: String {
        guard let date = parsedDate else { return "Unknown" }
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.doesRelativeDateFormatting = false
        formatter.locale = Locale.current
        return formatter.string(from: date)
    }

    var localTimeString: String {
        guard let date = parsedDate else { return "Unknown" }
        let formatter = DateFormatter()
        formatter.timeStyle = .medium
        formatter.locale = Locale.current
        return formatter.string(from: date)
    }

    static func == (lhs: Log, rhs: Log) -> Bool {
        lhs.id == rhs.id
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}

// Handles animal_id/container_id being either String or Int from the API
enum AnyCodableID: Codable, Hashable {
    case string(String)
    case int(Int)

    var stringValue: String {
        switch self {
        case .string(let s): return s
        case .int(let i): return String(i)
        }
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let intVal = try? container.decode(Int.self) {
            self = .int(intVal)
        } else if let strVal = try? container.decode(String.self) {
            self = .string(strVal)
        } else {
            throw DecodingError.typeMismatch(
                AnyCodableID.self,
                DecodingError.Context(codingPath: decoder.codingPath, debugDescription: "Expected String or Int")
            )
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let s): try container.encode(s)
        case .int(let i): try container.encode(i)
        }
    }
}

// MARK: - Date Utilities
enum DateUtils {
    private static let sqlFormatter: DateFormatter = {
        let fmt = DateFormatter()
        fmt.dateFormat = "yyyy-MM-dd HH:mm:ss"
        fmt.timeZone = TimeZone(identifier: "UTC")
        return fmt
    }()

    private static let isoFormatter: ISO8601DateFormatter = {
        let fmt = ISO8601DateFormatter()
        fmt.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return fmt
    }()

    static func parseSQLTimestamp(_ timestamp: String) -> Date? {
        sqlFormatter.date(from: timestamp) ?? isoFormatter.date(from: timestamp)
    }

    static func hoursSince(_ timestamp: String) -> Double {
        guard let date = parseSQLTimestamp(timestamp) else { return .infinity }
        return Date().timeIntervalSince(date) / 3600.0
    }

    static func formatDuration(seconds: Double) -> String {
        let totalSeconds = Int(seconds)
        let m = totalSeconds / 60
        let s = totalSeconds % 60
        return "\(m)m \(s)s"
    }
}

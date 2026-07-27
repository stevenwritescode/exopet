import Foundation

struct TemperatureData: Codable {
    let temperatures: [Double]
    let average: Double
}

struct HealthCheckResponse: Codable {
    let success: Bool
    let text: String
}

struct FeedingLogRequest: Codable {
    let animal_id: String
    let action_type: String
    let container_id: String?
    let log_json: String
}

struct DeleteResponse: Codable {
    let success: Bool
}

struct TankCreateRequest: Codable {
    var name: String
    var type: String?
    var role: String?
    var parent_tank_id: String?
}

private struct TankAddBody: Codable {
    let tank: TankCreateRequest
}

private struct SumpEnvelope: Codable {
    let sump: Tank?
}

class APIService {
    let baseURL: String
    private let session: URLSession
    private let decoder: JSONDecoder

    init(baseURL: String) {
        self.baseURL = baseURL
        let config = URLSessionConfiguration.default
        config.requestCachePolicy = .reloadIgnoringLocalCacheData
        config.urlCache = nil
        self.session = URLSession(configuration: config)
        self.decoder = JSONDecoder()
    }

    // MARK: - Health

    func healthCheck() async throws -> Bool {
        let data = try await get("/_health/")
        let response = try decoder.decode(HealthCheckResponse.self, from: data)
        return response.success
    }

    // MARK: - Tank Endpoints

    func getAllTanks() async throws -> [Tank] {
        let data = try await get("/tank/all")
        return try decoder.decode([Tank].self, from: data)
    }

    func getTankDetails(tankId: String) async throws -> Tank {
        let data = try await get("/tank/\(tankId)")
        return try decoder.decode(Tank.self, from: data)
    }

    func getAnimalsForTank(tankId: String) async throws -> [Animal] {
        let data = try await get("/tank/\(tankId)/animals")
        return try decoder.decode([Animal].self, from: data)
    }

    func getLogsForTank(tankId: String) async throws -> [Log] {
        let data = try await get("/tank/\(tankId)/logs")
        return try decoder.decode([Log].self, from: data)
    }

    func getTankTemperature(tankId: String) async throws -> TemperatureData {
        let data = try await get("/tank/\(tankId)/temperature")
        return try decoder.decode(TemperatureData.self, from: data)
    }

    func addTank(_ tank: TankCreateRequest) async throws -> Tank {
        let data = try await post("/tank/add", body: TankAddBody(tank: tank))
        return try decoder.decode(Tank.self, from: data)
    }

    // Dictionary values use String? so nil encodes as an explicit JSON
    // null — required to clear parent_tank_id on disconnect.
    func updateTank(tankId: String, fields: [String: String?]) async throws -> Tank {
        let data = try await post("/tank/\(tankId)/update", body: fields)
        return try decoder.decode(Tank.self, from: data)
    }

    func getTankSump(tankId: String) async throws -> Tank? {
        let data = try await get("/tank/\(tankId)")
        return try decoder.decode(SumpEnvelope.self, from: data).sump
    }

    func updateTankSettings(tankId: String, settings: TankSettings) async throws -> TankSettings {
        let body = ["settings": settings]
        let data = try await post("/tank/\(tankId)/settings", body: body)
        return try decoder.decode(TankSettings.self, from: data)
    }

    // MARK: - Animal Endpoints

    func getAllAnimals() async throws -> [Animal] {
        let data = try await get("/animal/all")
        return try decoder.decode([Animal].self, from: data)
    }

    func getAnimalDetails(animalId: String) async throws -> AnimalDetailResponse {
        let data = try await get("/animal/\(animalId)")
        return try decoder.decode(AnimalDetailResponse.self, from: data)
    }

    func updateAnimal(animalId: String, fields: AnimalUpdateFields) async throws {
        let _ = try await post("/animal/\(animalId)/update", body: fields)
    }

    // MARK: - Log Endpoints

    func addFeedingLog(request: FeedingLogRequest) async throws -> Log {
        let data = try await post("/log/feeding", body: request)
        return try decoder.decode(Log.self, from: data)
    }

    func deleteFeedingLog(logId: String) async throws {
        let _ = try await delete("/log/feeding/\(logId)")
    }

    // MARK: - Private HTTP Methods

    private func get(_ path: String) async throws -> Data {
        let url = URL(string: "\(baseURL)\(path)")!
        let (data, response) = try await session.data(from: url)
        try validateResponse(response)
        return data
    }

    private func post<T: Encodable>(_ path: String, body: T) async throws -> Data {
        let url = URL(string: "\(baseURL)\(path)")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(body)
        let (data, response) = try await session.data(for: request)
        try validateResponse(response)
        return data
    }

    private func delete(_ path: String) async throws -> Data {
        let url = URL(string: "\(baseURL)\(path)")!
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        let (data, response) = try await session.data(for: request)
        try validateResponse(response)
        return data
    }

    private func validateResponse(_ response: URLResponse) throws {
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.httpError(statusCode: httpResponse.statusCode)
        }
    }
}

enum APIError: LocalizedError {
    case invalidResponse
    case httpError(statusCode: Int)

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Invalid response from server"
        case .httpError(let code):
            return "Server returned status code \(code)"
        }
    }
}

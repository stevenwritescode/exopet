import Foundation

struct ServerInfo: Identifiable, Hashable {
    let id = UUID()
    var name: String
    var host: String
    var port: Int

    var baseURL: String { "http://\(host):\(port)" }
    var wsURL: String { "ws://\(host):\(port)" }
}

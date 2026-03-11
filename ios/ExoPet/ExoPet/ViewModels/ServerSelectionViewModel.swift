import Foundation

@MainActor
class ServerSelectionViewModel: ObservableObject {
    @Published var apiService: APIService?
    @Published var webSocketService: WebSocketService?
    @Published var isConnecting = false
    @Published var errorMessage: String?
    @Published var manualHost = ""
    @Published var manualPort = "3001"

    let discovery = NetworkDiscoveryService()

    private let lastServerHostKey = "lastServerHost"
    private let lastServerPortKey = "lastServerPort"

    func startDiscovery() {
        discovery.startBrowsing()
        tryLastServer()
    }

    func stopDiscovery() {
        discovery.stopBrowsing()
    }

    func selectServer(_ server: ServerInfo) {
        Task {
            isConnecting = true
            errorMessage = nil
            let healthy = await discovery.healthCheck(server: server)
            if healthy {
                saveLastServer(server)
                let api = APIService(baseURL: server.baseURL)
                let ws = WebSocketService(wsURL: server.wsURL)
                ws.connect()
                self.apiService = api
                self.webSocketService = ws
                discovery.stopBrowsing()
            } else {
                errorMessage = "Could not connect to \(server.host):\(server.port)"
            }
            isConnecting = false
        }
    }

    func connectManually() {
        let host = manualHost.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !host.isEmpty, let port = Int(manualPort) else {
            errorMessage = "Enter a valid host and port"
            return
        }
        let server = ServerInfo(name: "Manual", host: host, port: port)
        selectServer(server)
    }

    private func tryLastServer() {
        guard let host = UserDefaults.standard.string(forKey: lastServerHostKey) else { return }
        let port = UserDefaults.standard.integer(forKey: lastServerPortKey)
        guard port > 0 else { return }
        let server = ServerInfo(name: "Last Used", host: host, port: port)
        selectServer(server)
    }

    private func saveLastServer(_ server: ServerInfo) {
        UserDefaults.standard.set(server.host, forKey: lastServerHostKey)
        UserDefaults.standard.set(server.port, forKey: lastServerPortKey)
    }
}

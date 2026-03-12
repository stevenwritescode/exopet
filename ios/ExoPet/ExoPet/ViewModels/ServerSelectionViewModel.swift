import Foundation
import Combine

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
    private var allowAutoConnect = true
    private var discoveryCancellable: AnyCancellable?

    init() {
        // Forward discovery's change notifications so SwiftUI updates the view
        discoveryCancellable = discovery.objectWillChange
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                self?.objectWillChange.send()
            }
    }

    func startDiscovery() {
        print("[ViewModel] startDiscovery called, allowAutoConnect=\(allowAutoConnect)")
        discovery.startBrowsing()
        if allowAutoConnect {
            tryLastServer()
        }
    }

    func restartDiscovery() {
        discovery.stopBrowsing()
        discovery.startBrowsing()
    }

    func stopDiscovery() {
        discovery.stopBrowsing()
    }

    func selectServer(_ server: ServerInfo) {
        Task {
            print("[ViewModel] selectServer: \(server.host):\(server.port) (\(server.name))")
            isConnecting = true
            errorMessage = nil
            let healthy = await discovery.healthCheck(server: server)
            print("[ViewModel] healthCheck result: \(healthy)")
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
        guard let host = UserDefaults.standard.string(forKey: lastServerHostKey) else {
            print("[ViewModel] tryLastServer: no saved server")
            return
        }
        let port = UserDefaults.standard.integer(forKey: lastServerPortKey)
        guard port > 0 else {
            print("[ViewModel] tryLastServer: invalid port")
            return
        }
        print("[ViewModel] tryLastServer: attempting \(host):\(port)")
        let server = ServerInfo(name: "Last Used", host: host, port: port)
        selectServer(server)
    }

    private func saveLastServer(_ server: ServerInfo) {
        UserDefaults.standard.set(server.host, forKey: lastServerHostKey)
        UserDefaults.standard.set(server.port, forKey: lastServerPortKey)
    }

    func disconnect() {
        webSocketService?.disconnect()
        webSocketService = nil
        apiService = nil
        errorMessage = nil
        allowAutoConnect = false
    }

    func forgetHub() {
        UserDefaults.standard.removeObject(forKey: lastServerHostKey)
        UserDefaults.standard.removeObject(forKey: lastServerPortKey)
        disconnect()
    }
}

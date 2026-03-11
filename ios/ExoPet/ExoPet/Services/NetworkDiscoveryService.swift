import Foundation
import Network

@MainActor
class NetworkDiscoveryService: ObservableObject {
    @Published var discoveredServers: [ServerInfo] = []
    @Published var isSearching = false

    private var browser: NWBrowser?
    private var connections: [NWConnection] = []

    func startBrowsing() {
        discoveredServers = []
        let params = NWParameters()
        params.includePeerToPeer = true
        browser = NWBrowser(for: .bonjour(type: "_exopet._tcp", domain: nil), using: params)

        browser?.browseResultsChangedHandler = { [weak self] results, changes in
            Task { @MainActor [weak self] in
                guard let self else { return }
                for change in changes {
                    switch change {
                    case .added(let result):
                        self.resolveEndpoint(result)
                    case .removed(let result):
                        self.discoveredServers.removeAll { $0.name == self.serviceName(result) }
                    default:
                        break
                    }
                }
            }
        }

        browser?.stateUpdateHandler = { [weak self] state in
            Task { @MainActor [weak self] in
                switch state {
                case .ready:
                    self?.isSearching = true
                case .failed, .cancelled:
                    self?.isSearching = false
                default:
                    break
                }
            }
        }

        browser?.start(queue: .main)
        isSearching = true
    }

    func stopBrowsing() {
        browser?.cancel()
        browser = nil
        connections.forEach { $0.cancel() }
        connections.removeAll()
        isSearching = false
    }

    private func serviceName(_ result: NWBrowser.Result) -> String {
        switch result.endpoint {
        case .service(let name, _, _, _):
            return name
        default:
            return "Unknown"
        }
    }

    private func resolveEndpoint(_ result: NWBrowser.Result) {
        let connection = NWConnection(to: result.endpoint, using: .tcp)
        connections.append(connection)

        connection.stateUpdateHandler = { [weak self] state in
            Task { @MainActor [weak self] in
                guard let self else { return }
                switch state {
                case .ready:
                    if let endpoint = connection.currentPath?.remoteEndpoint {
                        let server = self.extractServerInfo(
                            from: endpoint,
                            name: self.serviceName(result)
                        )
                        if let server, !self.discoveredServers.contains(where: { $0.host == server.host && $0.port == server.port }) {
                            self.discoveredServers.append(server)
                        }
                    }
                    connection.cancel()
                    self.connections.removeAll { $0 === connection }
                case .failed, .cancelled:
                    self.connections.removeAll { $0 === connection }
                default:
                    break
                }
            }
        }

        connection.start(queue: .main)
    }

    private func extractServerInfo(from endpoint: NWEndpoint, name: String) -> ServerInfo? {
        switch endpoint {
        case .hostPort(let host, let port):
            let hostString: String
            switch host {
            case .ipv4(let addr):
                hostString = "\(addr)"
            case .ipv6(let addr):
                hostString = "\(addr)"
            case .name(let hostname, _):
                hostString = hostname
            @unknown default:
                return nil
            }
            return ServerInfo(name: name, host: hostString, port: Int(port.rawValue))
        default:
            return nil
        }
    }

    func healthCheck(server: ServerInfo) async -> Bool {
        guard let url = URL(string: "\(server.baseURL)/_health/") else { return false }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            let response = try JSONDecoder().decode(HealthCheckResponse.self, from: data)
            return response.success
        } catch {
            return false
        }
    }
}

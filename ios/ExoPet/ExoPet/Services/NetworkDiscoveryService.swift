import Foundation

class NetworkDiscoveryService: NSObject, ObservableObject, NetServiceBrowserDelegate, NetServiceDelegate {
    @Published var discoveredServers: [ServerInfo] = []
    @Published var isSearching = false

    private var browser: NetServiceBrowser?
    private var pendingServices: [NetService] = []
    private var stopTimer: Timer?
    private var hasFoundAny = false

    func startBrowsing() {
        stopBrowsing()
        discoveredServers = []
        hasFoundAny = false

        let newBrowser = NetServiceBrowser()
        newBrowser.delegate = self
        newBrowser.searchForServices(ofType: "_exopet._tcp.", inDomain: "")
        browser = newBrowser
        isSearching = true
        startInitialTimer()
    }

    func stopBrowsing() {
        browser?.stop()
        browser?.delegate = nil
        browser = nil
        pendingServices.forEach { $0.stop() }
        pendingServices.removeAll()
        stopTimer?.invalidate()
        stopTimer = nil
        isSearching = false
    }

    private func startInitialTimer() {
        stopTimer?.invalidate()
        stopTimer = Timer.scheduledTimer(withTimeInterval: 30, repeats: false) { [weak self] _ in
            self?.isSearching = false
            self?.browser?.stop()
            self?.browser?.delegate = nil
            self?.browser = nil
        }
    }

    private func resetIdleTimer() {
        stopTimer?.invalidate()
        stopTimer = Timer.scheduledTimer(withTimeInterval: 5, repeats: false) { [weak self] _ in
            self?.isSearching = false
            self?.browser?.stop()
            self?.browser?.delegate = nil
            self?.browser = nil
        }
    }

    // MARK: - NetServiceBrowserDelegate

    func netServiceBrowser(_ browser: NetServiceBrowser, didFind service: NetService, moreComing: Bool) {
        pendingServices.append(service)
        service.delegate = self
        service.resolve(withTimeout: 10)
    }

    func netServiceBrowser(_ browser: NetServiceBrowser, didRemove service: NetService, moreComing: Bool) {
        discoveredServers.removeAll { $0.name == service.name }
        pendingServices.removeAll { $0 == service }
    }

    func netServiceBrowser(_ browser: NetServiceBrowser, didNotSearch errorDict: [String: NSNumber]) {
        print("[Discovery] Browse error: \(errorDict)")
        isSearching = false
    }

    // MARK: - NetServiceDelegate

    func netServiceDidResolveAddress(_ sender: NetService) {
        let port = sender.port
        guard port > 0, let addresses = sender.addresses else {
            pendingServices.removeAll { $0 == sender }
            return
        }

        // Extract IPv4 address from resolved addresses
        var host: String?
        for addressData in addresses {
            let nsData = addressData as NSData
            var storage = sockaddr_storage()
            nsData.getBytes(&storage, length: MemoryLayout<sockaddr_storage>.size)
            if storage.ss_family == sa_family_t(AF_INET) {
                var addr = withUnsafePointer(to: &storage) {
                    $0.withMemoryRebound(to: sockaddr_in.self, capacity: 1) { $0.pointee }
                }
                var buffer = [CChar](repeating: 0, count: Int(INET_ADDRSTRLEN))
                inet_ntop(AF_INET, &addr.sin_addr, &buffer, socklen_t(INET_ADDRSTRLEN))
                host = String(cString: buffer)
                break
            }
        }

        guard let resolvedHost = host else {
            pendingServices.removeAll { $0 == sender }
            return
        }

        if !discoveredServers.contains(where: { $0.host == resolvedHost && $0.port == port }) {
            discoveredServers.append(ServerInfo(name: sender.name, host: resolvedHost, port: port))
            hasFoundAny = true
            resetIdleTimer()
        }
        pendingServices.removeAll { $0 == sender }
    }

    func netService(_ sender: NetService, didNotResolve errorDict: [String: NSNumber]) {
        print("[Discovery] Resolve error for \(sender.name): \(errorDict)")
        pendingServices.removeAll { $0 == sender }
    }

    // MARK: - Health Check

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

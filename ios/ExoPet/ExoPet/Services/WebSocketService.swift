import Foundation

@MainActor
class WebSocketService: ObservableObject {
    @Published var isConnected = false

    private var webSocketTask: URLSessionWebSocketTask?
    private var pingTimer: Timer?
    private var reconnectTask: Task<Void, Never>?
    private var sendQueue: [[String: Any]] = []
    private var messageHandlers: [(WebSocketMessage) -> Void] = []
    private let wsURL: String
    private var intentionalDisconnect = false

    init(wsURL: String) {
        self.wsURL = wsURL
    }

    func connect() {
        guard let url = URL(string: wsURL) else { return }
        intentionalDisconnect = false
        webSocketTask = URLSession.shared.webSocketTask(with: url)
        webSocketTask?.resume()
        isConnected = true
        startReceiving()
        startPingTimer()
        flushQueue()
    }

    func disconnect() {
        intentionalDisconnect = true
        pingTimer?.invalidate()
        pingTimer = nil
        reconnectTask?.cancel()
        reconnectTask = nil
        webSocketTask?.cancel(with: .goingAway, reason: nil)
        webSocketTask = nil
        isConnected = false
    }

    func onMessage(_ handler: @escaping (WebSocketMessage) -> Void) {
        messageHandlers.append(handler)
    }

    func removeAllHandlers() {
        messageHandlers.removeAll()
    }

    func send(action: String, data: [String: Any] = [:]) {
        let message: [String: Any] = ["action": action, "data": data]
        guard let task = webSocketTask,
              task.state == .running else {
            sendQueue.append(message)
            return
        }
        sendJSON(message, via: task)
    }

    // MARK: - Convenience Methods

    func requestTemperature(tankId: String) {
        send(action: ParameterAction.temperature.rawValue, data: ["tank_id": tankId])
    }

    func requestWaterLevel(tankId: String) {
        send(action: ParameterAction.waterLevel.rawValue, data: ["tank_id": tankId])
    }

    func startWaterChange(tankId: String) {
        send(action: ServiceRequest.startWaterChange.rawValue, data: ["tank_id": tankId])
    }

    func startFillTank(tankId: String) {
        send(action: ServiceRequest.startFillTank.rawValue, data: ["tank_id": tankId])
    }

    func startDrainTank(tankId: String) {
        send(action: ServiceRequest.startDrainTank.rawValue, data: ["tank_id": tankId])
    }

    func cancelOperation(tankId: String) {
        send(action: ServiceRequest.cancelWaterChange.rawValue, data: ["tank_id": tankId])
    }

    // MARK: - Private

    private func startReceiving() {
        webSocketTask?.receive { [weak self] result in
            Task { @MainActor [weak self] in
                guard let self else { return }
                switch result {
                case .success(let message):
                    self.handleMessage(message)
                    self.startReceiving()
                case .failure:
                    self.handleDisconnect()
                }
            }
        }
    }

    private func handleMessage(_ message: URLSessionWebSocketTask.Message) {
        switch message {
        case .string(let text):
            guard let data = text.data(using: .utf8),
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                return
            }
            let wsMessage = WebSocketMessage(
                action: json["action"] as? String,
                data: json["data"] as? [String: Any],
                message: json["message"] as? String
            )
            for handler in messageHandlers {
                handler(wsMessage)
            }
        case .data(let data):
            guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                return
            }
            let wsMessage = WebSocketMessage(
                action: json["action"] as? String,
                data: json["data"] as? [String: Any],
                message: json["message"] as? String
            )
            for handler in messageHandlers {
                handler(wsMessage)
            }
        @unknown default:
            break
        }
    }

    private func handleDisconnect() {
        isConnected = false
        pingTimer?.invalidate()
        pingTimer = nil

        guard !intentionalDisconnect else { return }

        reconnectTask = Task { @MainActor [weak self] in
            try? await Task.sleep(nanoseconds: 2_000_000_000) // 2 seconds
            guard !Task.isCancelled else { return }
            self?.connect()
        }
    }

    private func startPingTimer() {
        pingTimer?.invalidate()
        pingTimer = Timer.scheduledTimer(withTimeInterval: 30.0, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in
                self?.send(action: "ping")
            }
        }
    }

    private func flushQueue() {
        guard let task = webSocketTask, task.state == .running else { return }
        let queued = sendQueue
        sendQueue.removeAll()
        for message in queued {
            sendJSON(message, via: task)
        }
    }

    private func sendJSON(_ json: [String: Any], via task: URLSessionWebSocketTask) {
        guard let data = try? JSONSerialization.data(withJSONObject: json),
              let text = String(data: data, encoding: .utf8) else { return }
        task.send(.string(text)) { error in
            if error != nil {
                Task { @MainActor [weak self] in
                    self?.handleDisconnect()
                }
            }
        }
    }
}

struct WebSocketMessage {
    let action: String?
    let data: [String: Any]?
    let message: String?
}

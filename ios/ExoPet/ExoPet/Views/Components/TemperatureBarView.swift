import SwiftUI

struct TemperatureBarView: View {
    let tankId: String
    let tankSettings: TankSettings?
    @ObservedObject var ws: WebSocketService
    @State private var currentTemp: Double?
    private let pollTimer = Timer.publish(every: 5, on: .main, in: .common).autoconnect()

    var body: some View {
        HStack(spacing: 12) {
            if let temp = currentTemp, temp != 0 {
                let lower = tankSettings?.effectiveLowerTempLimit ?? 25.0
                let upper = tankSettings?.effectiveUpperTempLimit ?? 30.0
                let danger = TemperatureHelper.dangerLevel(temp: temp, lower: lower, upper: upper)
                let color = TemperatureHelper.color(for: danger)
                let tempC = Int(temp.rounded())
                let tempF = Int(TemperatureHelper.celsiusToFahrenheit(temp).rounded())

                Button(action: requestTemp) {
                    HStack(spacing: 8) {
                        Image(systemName: "thermometer.medium")
                            .foregroundColor(color)

                        Text("\(tempC)°C")
                            .fontWeight(.bold)
                            .foregroundColor(color)

                        Text("/")
                            .foregroundColor(.gray)

                        Text("\(tempF)°F")
                            .fontWeight(.bold)
                            .foregroundColor(color)

                        if danger != .ideal {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(.yellow)
                                .font(.caption)
                        }
                    }
                }

                Text(danger.rawValue)
                    .font(.system(size: 10))
                    .textCase(.uppercase)
                    .foregroundColor(danger == .ideal ? ExoPetColors.tempIdeal : .yellow)
            } else {
                Button(action: requestTemp) {
                    HStack(spacing: 6) {
                        Image(systemName: "thermometer.medium")
                            .foregroundColor(.white)
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundColor(.yellow)
                        Text("No Data")
                            .foregroundColor(.gray)
                            .font(.caption)
                    }
                }
            }
        }
        .padding(.vertical, 8)
        .frame(maxWidth: .infinity)
        .background(Color.black)
        .onAppear { requestTemp() }
        .onReceive(pollTimer) { _ in requestTemp() }
        .onAppear { setupWSHandler() }
    }

    private func requestTemp() {
        ws.requestTemperature(tankId: tankId)
    }

    private func setupWSHandler() {
        ws.onMessage { msg in
            if msg.action == ParameterAction.temperature.rawValue,
               let avg = msg.data?["average"] as? Double {
                Task { @MainActor in
                    currentTemp = avg
                }
            }
        }
    }
}

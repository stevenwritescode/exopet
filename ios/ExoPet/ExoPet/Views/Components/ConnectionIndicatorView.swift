import SwiftUI

struct ConnectionIndicatorView: View {
    let isConnected: Bool

    var body: some View {
        HStack(spacing: 8) {
            Text("WebSocket:")
                .font(.subheadline)
                .textCase(.uppercase)
                .foregroundColor(.white)

            HStack(spacing: 4) {
                Image(systemName: isConnected ? "checkmark.circle.fill" : "xmark.circle.fill")
                    .foregroundColor(isConnected ? .green : .red)
                Text(isConnected ? "Connected" : "Disconnected")
                    .font(.subheadline)
                    .foregroundColor(isConnected ? .green : .red)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .overlay(
                RoundedRectangle(cornerRadius: 6)
                    .stroke(isConnected ? Color.green : Color.red, lineWidth: 1)
            )
        }
    }
}

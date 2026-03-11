import SwiftUI

struct WaterLevelIndicatorView: View {
    let waterFull: Bool
    var onCheck: (() -> Void)?

    var body: some View {
        Button(action: { onCheck?() }) {
            HStack(spacing: 8) {
                Text("Water Level:")
                    .font(.subheadline)
                    .textCase(.uppercase)
                    .foregroundColor(.white)

                HStack(spacing: 4) {
                    Image(systemName: waterFull ? "checkmark.circle.fill" : "drop.fill")
                        .foregroundColor(waterFull ? .green : .blue)
                    Text(waterFull ? "Full" : "Not Full")
                        .font(.subheadline)
                        .foregroundColor(waterFull ? .green : .blue)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .overlay(
                    RoundedRectangle(cornerRadius: 6)
                        .stroke(waterFull ? Color.green : Color.blue, lineWidth: 1)
                )
            }
        }
    }
}

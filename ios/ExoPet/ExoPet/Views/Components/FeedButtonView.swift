import SwiftUI

struct FeedButtonView: View {
    let canFeed: Bool
    let urgentToFeed: Bool
    let feedLabel: String
    let action: () -> Void

    @State private var isPulsing = false

    var body: some View {
        Group {
            if urgentToFeed {
                feedCard
                    .shadow(color: .green.opacity(isPulsing ? 0.6 : 0), radius: isPulsing ? 20 : 0)
                    .onAppear {
                        withAnimation(.easeInOut(duration: 1.0).repeatForever(autoreverses: true)) {
                            isPulsing = true
                        }
                    }
            } else {
                feedCard
            }
        }
    }

    private var feedCard: some View {
        Button(action: {
            if canFeed || urgentToFeed { action() }
        }) {
            HStack(spacing: 8) {
                Image(systemName: "fork.knife")
                    .font(.system(size: 32))
                Text(feedLabel)
                    .font(.title2)
                    .fontWeight(.bold)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 20)
            .background(canFeed || urgentToFeed ? ExoPetColors.feedButtonActive : ExoPetColors.feedButtonDisabled)
            .foregroundColor(.white)
            .cornerRadius(12)
            .opacity(canFeed || urgentToFeed ? 1.0 : 0.6)
        }
        .disabled(!canFeed && !urgentToFeed)
    }
}

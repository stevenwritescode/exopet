import SwiftUI

struct AppBarView<Leading: View, Trailing: View>: View {
    let title: String
    let leading: Leading
    let trailing: Trailing

    @State private var currentTime = Date()
    private let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    init(title: String, @ViewBuilder leading: () -> Leading, @ViewBuilder trailing: () -> Trailing = { EmptyView() }) {
        self.title = title
        self.leading = leading()
        self.trailing = trailing()
    }

    var body: some View {
        HStack {
            leading
                .frame(minWidth: 80, alignment: .leading)

            Spacer()

            Text(title)
                .font(.headline)
                .fontWeight(.medium)
                .lineLimit(1)

            Spacer()

            Text(currentTime, style: .time)
                .font(.subheadline)
                .foregroundColor(.white)
                .frame(minWidth: 80, alignment: .trailing)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Color.black)
        .onReceive(timer) { currentTime = $0 }
    }
}

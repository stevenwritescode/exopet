import SwiftUI

struct AnimalCardView: View {
    let animal: Animal
    var onFeed: (() -> Void)?

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(animal.name ?? "Unnamed")
                    .font(.title3)
                    .foregroundColor(.white)
                Text(animal.species ?? "")
                    .font(.subheadline)
                    .foregroundColor(.gray)
            }

            Spacer()

            HStack(spacing: 8) {
                NavigationLink(value: animal) {
                    Text("Manage")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(Color.accentColor)
                        .foregroundColor(.white)
                        .cornerRadius(8)
                }

                if let onFeed {
                    Button(action: onFeed) {
                        Text("Feed")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(Color.green)
                            .foregroundColor(.white)
                            .cornerRadius(8)
                    }
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(ExoPetColors.cardListItem)
        .cornerRadius(8)
    }
}

import SwiftUI

struct AnimalCardView: View {
    let animal: Animal
    var onFeed: (() -> Void)?
    var imageBaseURL: String?

    private var imageURL: URL? {
        guard let path = animal.image_url, !path.isEmpty else { return nil }
        if path.hasPrefix("http") { return URL(string: path) }
        guard let base = imageBaseURL else { return nil }
        return URL(string: "\(base)\(path)")
    }

    var body: some View {
        HStack {
            if let url = imageURL {
                AsyncImage(url: url) { image in
                    image
                        .resizable()
                        .scaledToFill()
                } placeholder: {
                    ProgressView()
                }
                .frame(width: 44, height: 44)
                .clipShape(Circle())
            }

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

import SwiftUI

struct TankCardView: View {
    let tank: Tank

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(tank.name ?? "Unnamed Tank")
                    .font(.headline)
                    .foregroundColor(.white)
                Text(tank.type ?? "")
                    .font(.subheadline)
                    .foregroundColor(.gray)
            }

            Spacer()

            NavigationLink(value: tank) {
                Text("Manage")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(Color.accentColor)
                    .foregroundColor(.white)
                    .cornerRadius(8)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(ExoPetColors.cardListItem)
        .cornerRadius(8)
    }
}

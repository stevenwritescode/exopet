import SwiftUI

struct SelectableCardView: View {
    let label: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.title3)
                .fontWeight(.medium)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 20)
                .background(isSelected ? ExoPetColors.selectedCard : ExoPetColors.unselectedCard)
                .foregroundColor(isSelected ? ExoPetColors.selectedCardText : ExoPetColors.unselectedCardText)
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(isSelected ? Color(red: 0, green: 0, blue: 0.55) : Color.clear, lineWidth: 2)
                )
        }
    }
}

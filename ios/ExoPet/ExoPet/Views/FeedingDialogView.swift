import SwiftUI

struct FeedingDialogView: View {
    let animalName: String
    let onSave: (String) -> Void
    let onClose: () -> Void

    @StateObject private var vm: FeedingDialogViewModel
    @State private var currentTime = Date()
    private let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    init(animalName: String, onSave: @escaping (String) -> Void, onClose: @escaping () -> Void) {
        self.animalName = animalName
        self.onSave = onSave
        self.onClose = onClose
        _vm = StateObject(wrappedValue: FeedingDialogViewModel(animalName: animalName))
    }

    var body: some View {
        VStack(spacing: 0) {
            // App bar
            HStack {
                Button(action: {
                    vm.reset()
                    onClose()
                }) {
                    Image(systemName: "xmark")
                        .font(.title3)
                        .foregroundColor(.white)
                }
                .frame(minWidth: 80, alignment: .leading)

                Spacer()

                Text("Log Feeding")
                    .font(.headline)
                    .foregroundColor(.white)

                Spacer()

                Text(currentTime, style: .time)
                    .font(.subheadline)
                    .foregroundColor(.white)
                    .frame(minWidth: 80, alignment: .trailing)
            }
            .padding()
            .background(Color.accentColor)

            if vm.isSelectionComplete {
                // Step 2: Confirmation
                confirmationView
            } else {
                // Step 1: Selection
                selectionView
            }

            Spacer()
        }
        .background(ExoPetColors.background)
        .onReceive(timer) { currentTime = $0 }
    }

    // MARK: - Step 1: Selection

    @ViewBuilder
    private var selectionView: some View {
        VStack(spacing: 24) {
            Text("Food Type")
                .font(.title2)
                .foregroundColor(.white)
                .padding(.top, 24)

            HStack(spacing: 12) {
                ForEach(Array(vm.foodTypes.enumerated()), id: \.element.id) { index, food in
                    SelectableCardView(
                        label: food.rawValue,
                        isSelected: vm.selectedFoodIndex == index,
                        action: { vm.selectedFoodIndex = index }
                    )
                }
            }
            .padding(.horizontal)

            Text("Quantity")
                .font(.title2)
                .foregroundColor(.white)

            HStack(spacing: 12) {
                ForEach(Array(vm.quantities.enumerated()), id: \.element.id) { index, qty in
                    SelectableCardView(
                        label: qty.displayLabel,
                        isSelected: vm.selectedQuantityIndex == index,
                        action: { vm.selectedQuantityIndex = index }
                    )
                }
            }
            .padding(.horizontal)
        }
    }

    // MARK: - Step 2: Confirmation

    @ViewBuilder
    private var confirmationView: some View {
        VStack(spacing: 24) {
            Spacer()
                .frame(height: 40)

            Text("Add this log?")
                .font(.title)
                .foregroundColor(.white)

            Text(vm.confirmationText)
                .font(.title3)
                .foregroundColor(.white)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            Button(action: {
                if let json = vm.buildLogJSON() {
                    onSave(json)
                    vm.reset()
                }
            }) {
                Text("Add Log")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(Color.accentColor)
                    .foregroundColor(.white)
                    .cornerRadius(12)
            }
            .padding(.horizontal, 40)

            Button(action: {
                vm.reset()
                onClose()
            }) {
                Text("Cancel")
                    .font(.subheadline)
                    .foregroundColor(.gray)
                    .padding(.vertical, 8)
            }

            Spacer()
        }
    }
}

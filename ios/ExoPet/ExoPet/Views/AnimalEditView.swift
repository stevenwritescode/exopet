import SwiftUI

struct AnimalEditView: View {
    let animal: Animal
    let onSave: (AnimalUpdateFields) -> Void
    let onClose: () -> Void

    @StateObject private var vm: AnimalEditViewModel

    init(animal: Animal, onSave: @escaping (AnimalUpdateFields) -> Void, onClose: @escaping () -> Void) {
        self.animal = animal
        self.onSave = onSave
        self.onClose = onClose
        _vm = StateObject(wrappedValue: AnimalEditViewModel(animal: animal))
    }

    var body: some View {
        VStack(spacing: 0) {
            // App bar
            HStack {
                Button(action: onClose) {
                    Image(systemName: "xmark")
                        .font(.title3)
                        .foregroundColor(.white)
                }
                .frame(minWidth: 80, alignment: .leading)

                Spacer()

                Text("Edit Animal")
                    .font(.headline)
                    .foregroundColor(.white)

                Spacer()

                Button(action: {
                    onSave(vm.buildFields())
                }) {
                    Text("Save")
                        .fontWeight(.medium)
                        .foregroundColor(.white)
                }
                .frame(minWidth: 80, alignment: .trailing)
            }
            .padding()
            .background(Color.accentColor)

            VStack(spacing: 20) {
                TextField("Name", text: $vm.name)
                    .textFieldStyle(.roundedBorder)

                TextField("Species", text: $vm.species)
                    .textFieldStyle(.roundedBorder)

                TextField("Species (Latin)", text: $vm.speciesLatin)
                    .textFieldStyle(.roundedBorder)

                VStack(alignment: .leading, spacing: 4) {
                    Text("Notes")
                        .font(.caption)
                        .foregroundColor(.gray)
                    TextEditor(text: $vm.notes)
                        .frame(minHeight: 80)
                        .scrollContentBackground(.hidden)
                        .background(Color(white: 0.15))
                        .cornerRadius(8)
                }
            }
            .padding(24)

            Spacer()
        }
        .background(ExoPetColors.background)
    }
}

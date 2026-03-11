import SwiftUI

struct SettingsView: View {
    let settings: TankSettings
    let onSave: (TankSettings) -> Void
    let onClose: () -> Void

    @StateObject private var vm: SettingsViewModel

    init(settings: TankSettings, onSave: @escaping (TankSettings) -> Void, onClose: @escaping () -> Void) {
        self.settings = settings
        self.onSave = onSave
        self.onClose = onClose
        _vm = StateObject(wrappedValue: SettingsViewModel(settings: settings))
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

                Text("Tank Settings")
                    .font(.headline)
                    .foregroundColor(.white)

                Spacer()

                Button(action: {
                    onSave(vm.buildSettings())
                    onClose()
                }) {
                    Text("Save")
                        .fontWeight(.medium)
                        .foregroundColor(.white)
                }
                .frame(minWidth: 80, alignment: .trailing)
            }
            .padding()
            .background(Color.accentColor)

            VStack(spacing: 24) {
                // Drain Duration
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("Drain Duration:")
                            .foregroundColor(.white)
                        Spacer()
                        Text(vm.drainTimeFormatted)
                            .foregroundColor(.gray)
                    }
                    Slider(value: $vm.drainTime, in: 0...1200, step: 5)
                }

                Divider()

                // Fill Duration
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("Fill Duration:")
                            .foregroundColor(.white)
                        Spacer()
                        Text(vm.fillTimeFormatted)
                            .foregroundColor(.gray)
                    }
                    Slider(value: $vm.fillTime, in: 0...1200, step: 5)
                }

                Divider()

                // Reservoir Mode
                HStack {
                    Text("Reservoir Mode:")
                        .foregroundColor(.white)
                    Spacer()
                    Toggle("", isOn: $vm.hasReservoir)
                        .labelsHidden()
                }

                Divider()
            }
            .padding(24)

            Spacer()
        }
        .background(ExoPetColors.background)
    }
}

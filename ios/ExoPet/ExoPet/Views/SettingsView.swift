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

                // Scheduled Water Changes
                HStack {
                    Text("Scheduled Water Changes:")
                        .foregroundColor(.white)
                    Spacer()
                    Toggle("", isOn: $vm.scheduleEnabled)
                        .labelsHidden()
                }

                if vm.scheduleEnabled {
                    // Day picker
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Days:")
                            .foregroundColor(.white)
                        HStack(spacing: 6) {
                            ForEach(0..<7, id: \.self) { day in
                                Button(action: { vm.toggleDay(day) }) {
                                    Text(SettingsViewModel.dayNames[day])
                                        .font(.caption)
                                        .fontWeight(.medium)
                                        .frame(width: 40, height: 36)
                                        .background(vm.scheduleDays.contains(day) ? Color.accentColor : Color.gray.opacity(0.3))
                                        .foregroundColor(.white)
                                        .cornerRadius(8)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }

                    // Time picker
                    HStack {
                        Text("Time:")
                            .foregroundColor(.white)
                        Spacer()
                        DatePicker("", selection: $vm.scheduleTime, displayedComponents: .hourAndMinute)
                            .labelsHidden()
                            .colorScheme(.dark)
                    }
                }
            }
            .padding(24)

            Spacer()
        }
        .background(ExoPetColors.background)
    }
}

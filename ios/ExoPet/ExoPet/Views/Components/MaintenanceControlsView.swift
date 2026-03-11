import SwiftUI

struct MaintenanceControlsView: View {
    @ObservedObject var vm: TankDetailViewModel

    var body: some View {
        VStack(spacing: 12) {
            HStack(spacing: 8) {
                Text("Maintenance")
                    .font(.headline)
                    .textCase(.uppercase)
                    .foregroundColor(.white)

                Button(action: { vm.settingsOpen = true }) {
                    Image(systemName: "gearshape.fill")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
            }

            HStack(spacing: 12) {
                // Change Water
                maintenanceButton(
                    label: vm.waterChangeInProgress ? "Changing Water" : "Change Water",
                    isActive: vm.waterChangeInProgress,
                    progress: vm.waterChangeProgress,
                    progressColor: Color.purple,
                    disabled: vm.serviceStatus > .idle,
                    action: vm.handleWaterChange
                )

                // Fill Tank
                maintenanceButton(
                    label: vm.serviceStatus == .fillingTank || vm.serviceStatus == .waterChangeFillingTank ? "Filling Tank" : "Fill Tank",
                    isActive: vm.serviceStatus == .fillingTank || vm.serviceStatus == .waterChangeFillingTank,
                    progress: vm.fillProgress,
                    progressColor: Color.blue,
                    disabled: vm.serviceStatus > .idle,
                    action: vm.handleFillTank
                )

                // Drain Tank
                maintenanceButton(
                    label: vm.serviceStatus == .draining || vm.serviceStatus == .waterChangeDraining ? "Draining Tank" : "Drain Tank",
                    isActive: vm.serviceStatus == .draining || vm.serviceStatus == .waterChangeDraining,
                    progress: vm.drainProgress,
                    progressColor: Color.orange,
                    disabled: vm.serviceStatus > .idle,
                    action: vm.handleDrainTank
                )
            }
            .padding(.horizontal, 8)

            if vm.serviceStatus > .idle {
                Button(action: vm.handleCancel) {
                    HStack {
                        if vm.cancelInProgress {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle())
                                .scaleEffect(0.8)
                            Text("Cancelling...")
                        } else {
                            Text("Cancel Job")
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color.gray.opacity(0.3))
                    .foregroundColor(.white)
                    .cornerRadius(8)
                }
                .disabled(vm.cancelInProgress)
                .padding(.horizontal, 8)
            }
        }
    }

    @ViewBuilder
    private func maintenanceButton(
        label: String,
        isActive: Bool,
        progress: Double,
        progressColor: Color,
        disabled: Bool,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            VStack(spacing: 8) {
                if isActive {
                    ZStack {
                        Circle()
                            .stroke(Color.gray.opacity(0.3), lineWidth: 3)
                            .frame(width: 32, height: 32)
                        Circle()
                            .trim(from: 0, to: progress / 100)
                            .stroke(progressColor, lineWidth: 3)
                            .frame(width: 32, height: 32)
                            .rotationEffect(.degrees(-90))
                    }
                } else {
                    Image(systemName: label.contains("Water") ? "drop.fill" : label.contains("Fill") ? "arrow.up.circle.fill" : "arrow.down.circle.fill")
                        .font(.title2)
                }

                Text(label)
                    .font(.caption)
                    .fontWeight(.medium)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(
                isActive ? Color.accentColor.opacity(0.2) :
                disabled ? Color.gray.opacity(0.1) : ExoPetColors.cardSurface
            )
            .foregroundColor(disabled && !isActive ? .gray : .white)
            .cornerRadius(12)
        }
        .disabled(disabled && !isActive)
    }
}

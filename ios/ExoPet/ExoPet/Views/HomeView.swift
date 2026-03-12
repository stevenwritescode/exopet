import SwiftUI

struct HomeView: View {
    let api: APIService
    let ws: WebSocketService
    @Binding var navigationPath: NavigationPath
    var onDisconnect: () -> Void
    var onForgetHub: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            Spacer()
                .frame(maxHeight: .infinity)

            Text("ExoPet")
                .font(.system(size: 36, weight: .bold))
                .foregroundColor(.white)

            Text("Scalable Animal Enclosure Automation")
                .font(.subheadline)
                .foregroundColor(.gray)

            Spacer()
                .frame(height: 40)

            HStack(spacing: 16) {
                NavigationLink(value: Route.tanks) {
                    VStack(spacing: 12) {
                        Image(systemName: "drop.fill")
                            .font(.system(size: 40))
                            .foregroundColor(.blue)
                        Text("Enclosures")
                            .font(.title2)
                            .fontWeight(.medium)
                            .foregroundColor(.white)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 32)
                    .background(ExoPetColors.cardSurface)
                    .cornerRadius(16)
                }

                NavigationLink(value: Route.animals) {
                    VStack(spacing: 12) {
                        Image(systemName: "pawprint.fill")
                            .font(.system(size: 40))
                            .foregroundColor(.green)
                        Text("Animals")
                            .font(.title2)
                            .fontWeight(.medium)
                            .foregroundColor(.white)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 32)
                    .background(ExoPetColors.cardSurface)
                    .cornerRadius(16)
                }
            }
            .padding(.horizontal, 24)

            Spacer()
                .frame(maxHeight: .infinity)

            HStack(spacing: 24) {
                Button(action: onDisconnect) {
                    HStack(spacing: 4) {
                        Image(systemName: "arrow.left.circle")
                        Text("Disconnect")
                    }
                    .font(.caption)
                    .foregroundColor(.gray)
                }

                Button(action: onForgetHub) {
                    HStack(spacing: 4) {
                        Image(systemName: "trash")
                        Text("Forget Hub")
                    }
                    .font(.caption)
                    .foregroundColor(.gray)
                }
            }
            .padding(.bottom, 24)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(ExoPetColors.background)
        .navigationDestination(for: Route.self) { route in
            switch route {
            case .tanks:
                TankListView(api: api, ws: ws, navigationPath: $navigationPath)
            case .animals:
                AnimalListView(api: api, ws: ws, navigationPath: $navigationPath)
            }
        }
        .navigationDestination(for: Tank.self) { tank in
            TankDetailView(tankId: tank.id, api: api, ws: ws)
        }
        .navigationDestination(for: Animal.self) { animal in
            AnimalDetailView(animalId: animal.id, api: api, ws: ws)
        }
        .navigationBarHidden(true)
    }
}

enum Route: Hashable {
    case tanks
    case animals
}

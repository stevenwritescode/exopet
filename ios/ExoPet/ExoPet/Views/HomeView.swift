import SwiftUI

struct HomeView: View {
    let api: APIService
    let ws: WebSocketService
    @Binding var navigationPath: NavigationPath

    var body: some View {
        VStack(spacing: 0) {
            Spacer()
                .frame(maxHeight: .infinity)

            Text("TankHub")
                .font(.system(size: 36, weight: .bold))
                .foregroundColor(.white)

            Spacer()
                .frame(height: 40)

            HStack(spacing: 16) {
                NavigationLink(value: Route.tanks) {
                    VStack(spacing: 12) {
                        Image(systemName: "drop.fill")
                            .font(.system(size: 40))
                            .foregroundColor(.blue)
                        Text("Aquariums")
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

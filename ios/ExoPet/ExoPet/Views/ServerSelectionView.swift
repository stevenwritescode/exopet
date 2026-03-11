import SwiftUI

struct ServerSelectionView: View {
    @ObservedObject var viewModel: ServerSelectionViewModel

    var body: some View {
        VStack(spacing: 0) {
            Text("ExoPet")
                .font(.largeTitle)
                .fontWeight(.bold)
                .padding(.top, 60)
                .padding(.bottom, 8)

            Text("Aquarium Controller")
                .font(.subheadline)
                .foregroundColor(.gray)
                .padding(.bottom, 32)

            if viewModel.isConnecting {
                ProgressView("Connecting...")
                    .padding()
            }

            if let error = viewModel.errorMessage {
                Text(error)
                    .foregroundColor(.red)
                    .font(.caption)
                    .padding(.horizontal)
                    .padding(.bottom, 8)
            }

            // Discovered servers
            if !viewModel.discovery.discoveredServers.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Discovered Servers")
                        .font(.headline)
                        .padding(.horizontal)
                        .padding(.bottom, 4)

                    ForEach(viewModel.discovery.discoveredServers) { server in
                        Button(action: { viewModel.selectServer(server) }) {
                            HStack {
                                Image(systemName: "server.rack")
                                    .foregroundColor(.green)
                                VStack(alignment: .leading) {
                                    Text(server.name)
                                        .font(.body)
                                        .foregroundColor(.white)
                                    Text("\(server.host):\(server.port)")
                                        .font(.caption)
                                        .foregroundColor(.gray)
                                }
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .foregroundColor(.gray)
                            }
                            .padding()
                            .background(ExoPetColors.cardListItem)
                            .cornerRadius(8)
                        }
                        .padding(.horizontal)
                    }
                }
                .padding(.bottom, 24)
            } else if viewModel.discovery.isSearching {
                HStack(spacing: 8) {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle())
                        .scaleEffect(0.8)
                    Text("Searching for ExoPet devices...")
                        .font(.subheadline)
                        .foregroundColor(.gray)
                }
                .padding(.bottom, 24)
            }

            Divider()
                .padding(.vertical, 16)

            // Manual entry
            VStack(alignment: .leading, spacing: 12) {
                Text("Manual Connection")
                    .font(.headline)
                    .padding(.horizontal)

                HStack(spacing: 8) {
                    TextField("IP Address", text: $viewModel.manualHost)
                        .textFieldStyle(.roundedBorder)
                        .autocapitalization(.none)
                        .disableAutocorrection(true)
                        .keyboardType(.decimalPad)

                    Text(":")
                        .foregroundColor(.gray)

                    TextField("Port", text: $viewModel.manualPort)
                        .textFieldStyle(.roundedBorder)
                        .keyboardType(.numberPad)
                        .frame(width: 70)
                }
                .padding(.horizontal)

                Button(action: viewModel.connectManually) {
                    Text("Connect")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(Color.accentColor)
                        .foregroundColor(.white)
                        .cornerRadius(8)
                }
                .padding(.horizontal)
            }

            Spacer()
        }
        .background(ExoPetColors.background)
        .onAppear { viewModel.startDiscovery() }
        .onDisappear { viewModel.stopDiscovery() }
    }
}

import Foundation

@MainActor
class AnimalEditViewModel: ObservableObject {
    @Published var name: String
    @Published var species: String
    @Published var speciesLatin: String
    @Published var notes: String

    init(animal: Animal) {
        self.name = animal.name ?? ""
        self.species = animal.species ?? ""
        self.speciesLatin = animal.species_latin ?? ""
        self.notes = animal.notes ?? ""
    }

    func buildFields() -> AnimalUpdateFields {
        AnimalUpdateFields(
            name: name,
            species: species,
            species_latin: speciesLatin,
            notes: notes
        )
    }
}

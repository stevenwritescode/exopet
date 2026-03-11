import Foundation

@MainActor
class FeedingDialogViewModel: ObservableObject {
    @Published var selectedFoodIndex: Int? = nil
    @Published var selectedQuantityIndex: Int? = nil

    let foodTypes = FoodType.allCases
    let quantities = FoodQuantity.allCases
    let animalName: String

    var isSelectionComplete: Bool {
        selectedFoodIndex != nil && selectedQuantityIndex != nil
    }

    var confirmationText: String {
        guard let fi = selectedFoodIndex, let qi = selectedQuantityIndex else { return "" }
        let food = foodTypes[fi].rawValue
        let qty = quantities[qi]
        let orMore = qty == .fourPlus ? " or more" : ""
        let plural = qty.rawValue > 1 ? "s" : ""
        return "Fed \(qty.rawValue)\(orMore) \(food)\(plural) to \(animalName)."
    }

    init(animalName: String) {
        self.animalName = animalName
    }

    func buildLogJSON() -> String? {
        guard let fi = selectedFoodIndex, let qi = selectedQuantityIndex else { return nil }
        let food = foodTypes[fi].rawValue
        let qty = quantities[qi].rawValue
        return "{\"food_type\":\"\(food)\",\"quantity\":\(qty)}"
    }

    func reset() {
        selectedFoodIndex = nil
        selectedQuantityIndex = nil
    }
}

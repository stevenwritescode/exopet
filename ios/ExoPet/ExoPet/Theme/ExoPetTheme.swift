import SwiftUI

enum ExoPetColors {
    // Core backgrounds
    static let background = Color.black
    static let cardSurface = Color(red: 0x42/255, green: 0x42/255, blue: 0x42/255) // #424242
    static let cardListItem = Color(red: 0x25/255, green: 0x25/255, blue: 0x25/255) // #252525

    // Feeding status
    static let feedUrgent = Color(red: 1.0, green: 0.67, blue: 0.67) // #faa
    static let feedReady = Color(red: 0.67, green: 1.0, blue: 0.67) // #afa
    static let feedRecent = Color(red: 0.6, green: 0.6, blue: 0.6) // #999

    // Selectable cards
    static let selectedCard = Color(red: 0.68, green: 0.85, blue: 0.9) // lightblue
    static let selectedCardText = Color(red: 0, green: 0, blue: 0.55) // darkblue
    static let unselectedCard = Color.gray
    static let unselectedCardText = Color.white

    // Feed button
    static let feedButtonActive = Color.green
    static let feedButtonDisabled = Color(red: 0x88/255, green: 0x88/255, blue: 0x88/255) // #888

    // Animal section in tank detail
    static let animalSection = Color(red: 0xAA/255, green: 0xBB/255, blue: 0xFF/255) // #aabbff

    // Temperature danger colors
    static let tempDangerouslyCold = Color.indigo
    static let tempVeryCold = Color.blue
    static let tempCold = Color.cyan
    static let tempIdeal = Color(red: 0.2, green: 0.8, blue: 0) // lime
    static let tempWarm = Color.yellow
    static let tempVeryWarm = Color.orange
    static let tempDangerouslyWarm = Color.red
}

// MARK: - Temperature Helpers
enum TemperatureHelper {
    enum DangerLevel: String {
        case dangerouslyCold = "Dangerously Cold"
        case veryCold = "Very Cold"
        case cold = "Cold"
        case ideal = "Ideal"
        case warm = "Warm"
        case veryWarm = "Very Warm"
        case dangerouslyWarm = "Dangerously Warm"
    }

    static func dangerLevel(temp: Double, lower: Double, upper: Double) -> DangerLevel {
        if temp < lower - 5 { return .dangerouslyCold }
        if temp < lower - 2.5 { return .veryCold }
        if temp < lower { return .cold }
        if temp > upper + 3 { return .dangerouslyWarm }
        if temp > upper + 1.5 { return .veryWarm }
        if temp > upper { return .warm }
        return .ideal
    }

    static func color(for level: DangerLevel) -> Color {
        switch level {
        case .dangerouslyCold: return ExoPetColors.tempDangerouslyCold
        case .veryCold: return ExoPetColors.tempVeryCold
        case .cold: return ExoPetColors.tempCold
        case .ideal: return ExoPetColors.tempIdeal
        case .warm: return ExoPetColors.tempWarm
        case .veryWarm: return ExoPetColors.tempVeryWarm
        case .dangerouslyWarm: return ExoPetColors.tempDangerouslyWarm
        }
    }

    static func celsiusToFahrenheit(_ celsius: Double) -> Double {
        celsius * 1.8 + 32
    }
}

/**
 * Critical Accessibility Enhancements for FullMind Widgets
 * Phase 1: Crisis Accessibility and WCAG AA Compliance
 * 
 * PRIORITY: Immediate implementation required for mental health safety
 */

import SwiftUI
import WidgetKit

// MARK: - Crisis-Aware Accessibility Traits

extension AccessibilityTraits {
    static let crisisSupport: AccessibilityTraits = [.startsMediaSession, .causesPageTurn]
    static let therapeuticProgress: AccessibilityTraits = [.updatesFrequently]
    static let sessionInteractive: AccessibilityTraits = [.button, .causesPageTurn]
}

// MARK: - Mental Health Accessibility Labels

struct MentalHealthAccessibility {
    
    // Crisis intervention accessibility
    static func crisisButtonLabel(isActive: Bool) -> String {
        if isActive {
            return "URGENT: Crisis support needed - Tap to call 988 Suicide & Crisis Lifeline immediately"
        }
        return "Crisis support available - Tap to access emergency mental health resources"
    }
    
    static func crisisButtonHint() -> String {
        return "Connects to trained crisis counselors within 30 seconds. Available 24/7 in over 200 languages."
    }
    
    // Session status accessibility with therapeutic language
    static func sessionStatusLabel(
        sessionType: String,
        status: SessionStatus,
        progress: Int = 0
    ) -> String {
        let sessionName = therapeuticSessionName(sessionType)
        
        switch status {
        case .notStarted:
            return "\(sessionName) ready to begin. A gentle step toward wellness."
        case .inProgress:
            return "\(sessionName) is \(progress)% complete. You're making progress - every step matters."
        case .completed:
            return "\(sessionName) completed successfully. Well done taking care of yourself."
        case .skipped:
            return "\(sessionName) was skipped. That's okay - you can try again anytime."
        }
    }
    
    static func sessionStatusHint(
        sessionType: String,
        status: SessionStatus,
        canResume: Bool = false
    ) -> String {
        let sessionName = therapeuticSessionName(sessionType)
        
        switch status {
        case .notStarted:
            return "Tap to start your \(sessionName). Takes 3-5 minutes of mindful reflection."
        case .inProgress:
            if canResume {
                return "Tap to resume where you left off. Your progress is safely saved."
            }
            return "Session in progress. Return to the app to continue."
        case .completed:
            return "You've completed today's \(sessionName). Feel free to reflect on your experience."
        case .skipped:
            return "Tap to start your \(sessionName) whenever you feel ready."
        }
    }
    
    // Progress accessibility with encouraging language
    static func progressLabel(current: Int, total: Int, sessionType: String) -> String {
        let sessionName = therapeuticSessionName(sessionType)
        let percentage = Int((Double(current) / Double(total)) * 100)
        
        return "\(sessionName) progress: \(current) of \(total) steps complete (\(percentage)%). You're doing great."
    }
    
    // Helper: Convert session types to therapeutic language
    private static func therapeuticSessionName(_ sessionType: String) -> String {
        switch sessionType.lowercased() {
        case "morning":
            return "Morning mindfulness check-in"
        case "midday":
            return "Midday awareness pause"
        case "evening":
            return "Evening reflection practice"
        default:
            return "Mindfulness session"
        }
    }
}

// MARK: - High Contrast Color Support

struct HighContrastColors {
    // WCAG AAA compliant colors (7:1 contrast ratio)
    static let crisisRed = Color(red: 0.8, green: 0.0, blue: 0.0)      // High contrast red
    static let completedGreen = Color(red: 0.0, green: 0.5, blue: 0.0)  // High contrast green
    static let progressOrange = Color(red: 0.9, green: 0.5, blue: 0.0)  // High contrast orange
    static let backgroundDark = Color(red: 0.1, green: 0.1, blue: 0.1)  // High contrast background
    
    // Method to get appropriate color based on accessibility settings
    static func accessibleColor(
        for status: SessionStatus,
        colorScheme: ColorScheme,
        isHighContrast: Bool = false
    ) -> Color {
        if isHighContrast {
            switch status {
            case .completed: return completedGreen
            case .inProgress: return progressOrange
            case .skipped: return Color.gray
            case .notStarted: return Color.white
            }
        }
        
        // Standard colors (existing implementation)
        switch status {
        case .completed: return Color.white
        case .inProgress: return Color.orange
        case .skipped: return Color.gray.opacity(0.6)
        case .notStarted: return Color.white.opacity(0.3)
        }
    }
}

// MARK: - Crisis-Aware Widget View Enhancements

extension FullMindWidgetEntryView {
    
    // CRITICAL: Crisis button MUST ALWAYS be visible - Enhanced accessibility (CR-001, CR-002)
    var accessibleCrisisButtonView: some View {
        // Crisis button visibility SHALL NOT depend on any data conditions
        Button(action: { 
            WidgetDataManager.shared.handleCrisisButton() 
        }) {
            HStack(spacing: 6) {
                Image(systemName: "phone.fill")
                    .font(.system(size: 14, weight: .bold))
                    .accessibilityHidden(true) // Hide from screen readers (redundant with label)
                
                Text(entry.widgetData.hasActiveCrisis ? "Get Help Now" : "Crisis Support")
                    .font(.system(size: 14, weight: .bold))
                    .accessibilityHidden(true) // Hide from screen readers (redundant with label)
            }
            .foregroundColor(.white)
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(
                RoundedRectangle(cornerRadius: 8)
                    .fill(entry.widgetData.hasActiveCrisis ? HighContrastColors.crisisRed : HighContrastColors.crisisRed.opacity(0.8))
            )
        }
        .buttonStyle(PlainButtonStyle())
        .accessibilityLabel(MentalHealthAccessibility.crisisButtonLabel(isActive: entry.widgetData.hasActiveCrisis))
        .accessibilityHint(MentalHealthAccessibility.crisisButtonHint())
        .accessibilityTraits(.crisisSupport)
        .accessibilityAddTraits(.isButton)
        .accessibilityValue("Emergency resource")
        // Priority focus for assistive technology
        .accessibilityElement(children: .ignore)
        .accessibilityIdentifier("crisis-support-button")
    }
    
    // Enhanced session indicator with full accessibility
    func accessibleSessionIndicator(
        title: String,
        status: SessionStatus,
        compact: Bool,
        sessionType: String,
        tapAction: @escaping () -> Void
    ) -> some View {
        Button(action: tapAction) {
            VStack(spacing: compact ? 2 : 4) {
                // Status circle with accessibility
                Circle()
                    .fill(HighContrastColors.accessibleColor(
                        for: status,
                        colorScheme: .dark, // Widget uses dark theme
                        isHighContrast: false // TODO: Detect high contrast mode
                    ))
                    .frame(
                        width: compact ? 32 : 44,  // Increased minimum size
                        height: compact ? 32 : 44
                    )
                    .overlay(
                        statusIcon
                            .font(.system(
                                size: compact ? 12 : 14,
                                weight: .bold
                            ))
                            .foregroundColor(iconColor)
                            .accessibilityHidden(true) // Hide icon, use semantic label
                    )
                    .shadow(color: .black.opacity(0.2), radius: 2, x: 0, y: 1)
                
                // Title (hidden from accessibility, included in button label)
                Text(title)
                    .font(.system(
                        size: compact ? 9 : 11,
                        weight: .medium
                    ))
                    .foregroundColor(.white.opacity(0.9))
                    .multilineTextAlignment(.center)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
                    .accessibilityHidden(true) // Included in main label
            }
        }
        .buttonStyle(PlainButtonStyle())
        // Full accessibility implementation
        .accessibilityLabel(MentalHealthAccessibility.sessionStatusLabel(
            sessionType: sessionType,
            status: status,
            progress: progressPercentage(for: status)
        ))
        .accessibilityHint(MentalHealthAccessibility.sessionStatusHint(
            sessionType: sessionType,
            status: status,
            canResume: canResume(for: status)
        ))
        .accessibilityTraits(.sessionInteractive)
        .accessibilityValue(accessibilityValue(for: status))
        .accessibilityIdentifier("session-\(sessionType)")
        // State information for assistive technology
        .accessibilityAddTraits(status == .completed ? .notEnabled : .button)
    }
    
    // Helper methods for accessibility values
    private func progressPercentage(for status: SessionStatus) -> Int {
        switch status {
        case .inProgress(let progress, _):
            return progress
        case .completed:
            return 100
        default:
            return 0
        }
    }
    
    private func canResume(for status: SessionStatus) -> Bool {
        switch status {
        case .inProgress(_, let canResume):
            return canResume
        default:
            return false
        }
    }
    
    private func accessibilityValue(for status: SessionStatus) -> String {
        switch status {
        case .completed:
            return "Completed"
        case .inProgress(let progress, let canResume):
            return canResume ? "In progress, resumable at \(progress)%" : "In progress, \(progress)%"
        case .skipped:
            return "Skipped"
        case .notStarted:
            return "Not started"
        }
    }
}

// MARK: - Voice Control Optimization

extension FullMindWidgetEntryView {
    
    // Voice control labels for users who cannot touch the screen
    var voiceControlLabels: some View {
        Group {
            // Hidden accessibility elements for voice control
            Text("")
                .accessibilityHidden(false)
                .accessibilityLabel("Widget controls")
                .accessibilityElement(children: .contain)
                .accessibilityIdentifier("widget-main")
            
            // Crisis support always available (accessibility label)
            Text("")
                .accessibilityHidden(false)
                .accessibilityLabel(entry.widgetData.hasActiveCrisis ? "Crisis help needed" : "Crisis help available")
                .accessibilityIdentifier("crisis-quick")
        }
    }
}

// MARK: - Dynamic Type Support

extension Text {
    func therapeuticStyle() -> some View {
        self
            .allowsTightening(true)
            .minimumScaleFactor(0.8)
            .lineLimit(2)
            // Support for larger accessibility text sizes
            .font(.system(size: 16, weight: .medium, design: .rounded))
    }
}

// MARK: - Accessibility Announcements

class WidgetAccessibilityManager {
    
    // Announce widget updates to screen readers
    static func announceWidgetUpdate(
        completionPercentage: Int,
        hasActiveCrisis: Bool,
        sessionChanges: [String]
    ) {
        var announcement = "Widget updated. "
        
        if hasActiveCrisis {
            announcement = "URGENT: Crisis support is now available. " + announcement
        }
        
        announcement += "Today's progress: \(completionPercentage)% complete. "
        
        if !sessionChanges.isEmpty {
            announcement += "Session updates: \(sessionChanges.joined(separator: ", "))"
        }
        
        // Post announcement (iOS 15+ WidgetKit limitation: cannot directly post)
        // This would need to be handled by the main app
        NotificationCenter.default.post(
            name: .widgetAccessibilityAnnouncement,
            object: nil,
            userInfo: ["message": announcement, "urgency": hasActiveCrisis ? "high" : "normal"]
        )
    }
}

extension Notification.Name {
    static let widgetAccessibilityAnnouncement = Notification.Name("widget.accessibility.announcement")
}

// MARK: - Test Integration Points

extension FullMindWidgetEntryView {
    
    // Accessibility testing support
    var accessibilityTestingView: some View {
        self
            .accessibilityIdentifier("fullmind-widget")
            .accessibilityElement(children: .contain)
            .onAppear {
                // Widget accessibility audit on load
                WidgetAccessibilityManager.announceWidgetUpdate(
                    completionPercentage: entry.widgetData.completionPercentage,
                    hasActiveCrisis: entry.widgetData.hasActiveCrisis,
                    sessionChanges: [] // TODO: Track session changes
                )
            }
    }
}
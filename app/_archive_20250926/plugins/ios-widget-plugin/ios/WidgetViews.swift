import SwiftUI
import WidgetKit

struct FullMindWidgetEntryView: View {
    var entry: FullMindEntry
    @Environment(\.widgetFamily) var widgetFamily
    
    var body: some View {
        ZStack {
            // Background with theme-appropriate colors
            backgroundView
            
            VStack(alignment: .leading, spacing: 12) {
                headerView
                progressIndicatorView
                crisisButtonView
            }
            .padding(16)
        }
        .widgetURL(URL(string: "fullmind://home"))
    }
    
    // MARK: - Background View
    
    private var backgroundView: some View {
        LinearGradient(
            colors: [
                Color(red: 0.29, green: 0.49, blue: 0.35), // FullMind primary green
                Color(red: 0.24, green: 0.42, blue: 0.30)  // Darker green
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
    
    // MARK: - Header View
    
    private var headerView: some View {
        HStack {
            // App icon or logo space
            Circle()
                .fill(Color.white.opacity(0.2))
                .frame(width: 24, height: 24)
                .overlay(
                    Text("F")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                )
            
            Text("Today's Progress")
                .font(.system(size: widgetFamily == .systemSmall ? 12 : 14, weight: .medium))
                .foregroundColor(.white)
            
            Spacer()
            
            // Completion percentage
            Text("\(entry.widgetData.completionPercentage)%")
                .font(.system(size: widgetFamily == .systemSmall ? 14 : 16, weight: .bold))
                .foregroundColor(.white)
        }
    }
    
    // MARK: - Progress Indicators
    
    private var progressIndicatorView: some View {
        VStack(spacing: 8) {
            if widgetFamily == .systemSmall {
                // Compact layout for small widget
                compactProgressView
            } else {
                // Full layout for medium widget
                fullProgressView
            }
        }
    }
    
    private var compactProgressView: some View {
        HStack(spacing: 6) {
            SessionIndicator(
                title: "AM",
                status: entry.widgetData.morningStatus,
                compact: true,
                tapAction: { 
                    WidgetDataManager.shared.handleWidgetTap(
                        for: "morning", 
                        canResume: entry.widgetData.morningStatus.canResume
                    ) 
                }
            )
            
            SessionIndicator(
                title: "Mid",
                status: entry.widgetData.middayStatus,
                compact: true,
                tapAction: { 
                    WidgetDataManager.shared.handleWidgetTap(
                        for: "midday", 
                        canResume: entry.widgetData.middayStatus.canResume
                    ) 
                }
            )
            
            SessionIndicator(
                title: "PM",
                status: entry.widgetData.eveningStatus,
                compact: true,
                tapAction: { 
                    WidgetDataManager.shared.handleWidgetTap(
                        for: "evening", 
                        canResume: entry.widgetData.eveningStatus.canResume
                    ) 
                }
            )
            
            Spacer()
        }
    }
    
    private var fullProgressView: some View {
        HStack(spacing: 12) {
            SessionIndicator(
                title: "Morning",
                status: entry.widgetData.morningStatus,
                compact: false,
                tapAction: { 
                    WidgetDataManager.shared.handleWidgetTap(
                        for: "morning", 
                        canResume: entry.widgetData.morningStatus.canResume
                    ) 
                }
            )
            
            SessionIndicator(
                title: "Midday", 
                status: entry.widgetData.middayStatus,
                compact: false,
                tapAction: { 
                    WidgetDataManager.shared.handleWidgetTap(
                        for: "midday", 
                        canResume: entry.widgetData.middayStatus.canResume
                    ) 
                }
            )
            
            SessionIndicator(
                title: "Evening",
                status: entry.widgetData.eveningStatus,
                compact: false,
                tapAction: { 
                    WidgetDataManager.shared.handleWidgetTap(
                        for: "evening", 
                        canResume: entry.widgetData.eveningStatus.canResume
                    ) 
                }
            )
            
            Spacer()
        }
    }
    
    // MARK: - Crisis Button - ALWAYS VISIBLE for safety (CR-001, CR-002)
    
    private var crisisButtonView: some View {
        // Crisis button MUST be visible in ALL widget states
        Button(action: { 
            WidgetDataManager.shared.handleCrisisButton() 
        }) {
            HStack(spacing: 6) {
                Image(systemName: "phone.fill")
                    .font(.system(size: 12, weight: .medium))
                Text(entry.widgetData.hasActiveCrisis ? "CRISIS SUPPORT NEEDED" : "Crisis Support")
                    .font(.system(size: 12, weight: .medium))
            }
            .foregroundColor(.white)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(entry.widgetData.hasActiveCrisis ? Color.red.opacity(0.9) : Color.red.opacity(0.7))
            )
        }
        .buttonStyle(PlainButtonStyle())
        .accessibilityLabel("Crisis Support")
        .accessibilityHint("Tap for immediate crisis intervention")
    }
}

// MARK: - Session Indicator Component

struct SessionIndicator: View {
    let title: String
    let status: FullMindWidgetData.SessionStatus
    let compact: Bool
    let tapAction: () -> Void
    
    var body: some View {
        Button(action: tapAction) {
            VStack(spacing: compact ? 2 : 4) {
                // Status circle
                Circle()
                    .fill(statusColor)
                    .frame(
                        width: compact ? 24 : 32, 
                        height: compact ? 24 : 32
                    )
                    .overlay(
                        statusIcon
                            .font(.system(
                                size: compact ? 10 : 12, 
                                weight: .bold
                            ))
                            .foregroundColor(iconColor)
                    )
                    .shadow(color: .black.opacity(0.1), radius: 2, x: 0, y: 1)
                
                // Title
                Text(title)
                    .font(.system(
                        size: compact ? 8 : 10, 
                        weight: .medium
                    ))
                    .foregroundColor(.white.opacity(0.9))
                    .multilineTextAlignment(.center)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
        }
        .buttonStyle(PlainButtonStyle())
    }
    
    private var statusColor: Color {
        switch status {
        case .completed:
            return Color.white
        case .inProgress(_, _):
            return Color.orange
        case .skipped:
            return Color.gray.opacity(0.6)
        case .notStarted:
            return Color.white.opacity(0.3)
        }
    }
    
    private var iconColor: Color {
        switch status {
        case .completed:
            return Color(red: 0.29, green: 0.49, blue: 0.35) // FullMind green
        case .inProgress(_, _):
            return .white
        case .skipped:
            return .white
        case .notStarted:
            return .white
        }
    }
    
    @ViewBuilder
    private var statusIcon: some View {
        switch status {
        case .completed:
            Image(systemName: "checkmark")
        case .inProgress(let progress, let canResume):
            if compact {
                Text("\(progress)%")
                    .font(.system(size: 6, weight: .bold))
            } else {
                if canResume {
                    Image(systemName: "play.fill")
                } else {
                    Text("\(progress)%")
                        .font(.system(size: 8, weight: .bold))
                }
            }
        case .skipped:
            Image(systemName: "minus")
        case .notStarted:
            Image(systemName: "circle")
                .font(.system(size: compact ? 8 : 10, weight: .thin))
        }
    }
}

// MARK: - Preview Provider

struct FullMindWidget_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            // Small widget preview
            FullMindWidgetEntryView(entry: FullMindEntry(
                date: Date(),
                widgetData: FullMindWidgetData.placeholder(),
                isPreview: true
            ))
            .previewContext(WidgetPreviewContext(family: .systemSmall))
            .previewDisplayName("Small Widget")
            
            // Medium widget preview
            FullMindWidgetEntryView(entry: FullMindEntry(
                date: Date(),
                widgetData: FullMindWidgetData.placeholder(),
                isPreview: true
            ))
            .previewContext(WidgetPreviewContext(family: .systemMedium))
            .previewDisplayName("Medium Widget")
            
            // Crisis mode preview
            FullMindWidgetEntryView(entry: FullMindEntry(
                date: Date(),
                widgetData: FullMindWidgetData(
                    morningStatus: .completed,
                    middayStatus: .completed,
                    eveningStatus: .inProgress(45, true),
                    completionPercentage: 89,
                    hasActiveCrisis: true,
                    lastUpdateTime: Date(),
                    appVersion: "1.0.0"
                ),
                isPreview: true
            ))
            .previewContext(WidgetPreviewContext(family: .systemMedium))
            .previewDisplayName("Crisis Mode")
        }
    }
}
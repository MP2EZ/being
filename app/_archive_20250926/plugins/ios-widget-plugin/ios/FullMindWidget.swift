import WidgetKit
import SwiftUI

struct FullMindWidget: Widget {
    let kind: String = "FullMindWidget"
    
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: FullMindTimelineProvider()) { entry in
            FullMindWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("FullMind Daily Progress")
        .description("Track your daily mindfulness check-ins and maintain your MBCT practice")
        .supportedFamilies([.systemSmall, .systemMedium])
        .contentMarginsDisabled() // iOS 17+ for edge-to-edge design
    }
}

struct FullMindTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> FullMindEntry {
        FullMindEntry(
            date: Date(), 
            widgetData: FullMindWidgetData.placeholder(),
            isPreview: true
        )
    }
    
    func getSnapshot(in context: Context, completion: @escaping (FullMindEntry) -> ()) {
        let widgetData = WidgetDataManager.shared.getCurrentData()
        let entry = FullMindEntry(
            date: Date(), 
            widgetData: widgetData,
            isPreview: context.isPreview
        )
        completion(entry)
    }
    
    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        let currentDate = Date()
        let widgetData = WidgetDataManager.shared.getCurrentData()
        
        // Update timeline every 15 minutes during active hours (7 AM - 10 PM)
        let calendar = Calendar.current
        let hour = calendar.component(.hour, from: currentDate)
        let updateInterval: TimeInterval = (hour >= 7 && hour <= 22) ? 15 * 60 : 60 * 60
        
        let nextUpdateDate = calendar.date(
            byAdding: .second, 
            value: Int(updateInterval), 
            to: currentDate
        ) ?? currentDate.addingTimeInterval(updateInterval)
        
        let entry = FullMindEntry(
            date: currentDate, 
            widgetData: widgetData,
            isPreview: false
        )
        
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdateDate))
        completion(timeline)
    }
}

struct FullMindEntry: TimelineEntry {
    let date: Date
    let widgetData: FullMindWidgetData
    let isPreview: Bool
}

struct FullMindWidgetData {
    let morningStatus: SessionStatus
    let middayStatus: SessionStatus  
    let eveningStatus: SessionStatus
    let completionPercentage: Int
    let hasActiveCrisis: Bool
    let lastUpdateTime: Date
    let appVersion: String
    
    enum SessionStatus {
        case notStarted
        case inProgress(Int, Bool) // progress percentage, canResume
        case completed
        case skipped
        
        var canResume: Bool {
            switch self {
            case .inProgress(_, let resumable):
                return resumable
            default:
                return false
            }
        }
        
        var progressPercentage: Int {
            switch self {
            case .inProgress(let progress, _):
                return progress
            case .completed:
                return 100
            default:
                return 0
            }
        }
    }
    
    static func placeholder() -> FullMindWidgetData {
        return FullMindWidgetData(
            morningStatus: .completed,
            middayStatus: .inProgress(65, true),
            eveningStatus: .notStarted,
            completionPercentage: 66,
            hasActiveCrisis: false,
            lastUpdateTime: Date(),
            appVersion: "1.0.0"
        )
    }
}

@main
struct FullMindWidgetBundle: WidgetBundle {
    var body: some Widget {
        FullMindWidget()
    }
}
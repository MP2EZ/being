/**
 * Mock implementation of expo-calendar for testing
 * Provides testable calendar operations without device access
 */

export const EntityTypes = {
  EVENT: 'event',
  REMINDER: 'reminder',
};

export const CalendarAccessLevel = {
  CONTRIBUTOR: 'contributor',
  EDITOR: 'editor',
  FREEBUSY: 'freebusy',
  OVERRIDE: 'override',
  OWNER: 'owner',
  READ: 'read',
  RESPOND: 'respond',
  ROOT: 'root',
  NONE: 'none',
};

export const EventAccessLevel = {
  CONFIDENTIAL: 'confidential',
  PRIVATE: 'private',
  PUBLIC: 'public',
  DEFAULT: 'default',
};

export const CalendarType = {
  LOCAL: 'local',
  CALDAV: 'caldav',
  EXCHANGE: 'exchange',
  SUBSCRIBED: 'subscribed',
  BIRTHDAYS: 'birthdays',
  UNKNOWN: 'unknown',
};

export const SourceType = {
  LOCAL: 'local',
  EXCHANGE: 'exchange',
  CALDAV: 'caldav',
  MOBILEME: 'mobileme',
  SUBSCRIBED: 'subscribed',
  BIRTHDAYS: 'birthdays',
};

export const AttendeeRole = {
  UNKNOWN: 'unknown',
  REQUIRED: 'required',
  OPTIONAL: 'optional',
  CHAIR: 'chair',
  NON_PARTICIPANT: 'nonParticipant',
};

export const AttendeeStatus = {
  UNKNOWN: 'unknown',
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  TENTATIVE: 'tentative',
  DELEGATED: 'delegated',
  COMPLETED: 'completed',
  IN_PROCESS: 'inProcess',
};

export const AttendeeType = {
  UNKNOWN: 'unknown',
  PERSON: 'person',
  ROOM: 'room',
  GROUP: 'group',
  RESOURCE: 'resource',
};

export const AlarmMethod = {
  ALARM: 'alarm',
  ALERT: 'alert',
  EMAIL: 'email',
  SMS: 'sms',
  DEFAULT: 'default',
};

export const EventStatus = {
  NONE: 'none',
  CONFIRMED: 'confirmed',
  TENTATIVE: 'tentative',
  CANCELED: 'canceled',
};

export const Frequency = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
};

// Mock data
const mockCalendars = [
  {
    id: 'mock-calendar-1',
    title: 'Personal',
    type: CalendarType.LOCAL,
    source: { id: 'mock-source-1', name: 'Local', type: SourceType.LOCAL },
    color: '#FF3B30',
    entityType: EntityTypes.EVENT,
    allowsModifications: true,
    accessLevel: CalendarAccessLevel.OWNER,
  },
];

const mockEvents = [];

// Mock functions
export const requestCalendarPermissionsAsync = jest.fn().mockImplementation(
  async () => ({
    status: 'granted',
    canAskAgain: true,
    expires: 'never',
    granted: true,
  })
);

export const getCalendarPermissionsAsync = jest.fn().mockImplementation(
  async () => ({
    status: 'granted',
    canAskAgain: true,
    expires: 'never',
    granted: true,
  })
);

export const getCalendarsAsync = jest.fn().mockImplementation(
  async (entityType = EntityTypes.EVENT) => {
    return mockCalendars.filter(cal => cal.entityType === entityType);
  }
);

export const createEventAsync = jest.fn().mockImplementation(
  async (calendarId, eventDetails = {}) => {
    const event = {
      id: `mock-event-${Date.now()}`,
      calendarId,
      title: eventDetails.title || 'Mock Event',
      startDate: eventDetails.startDate || new Date().toISOString(),
      endDate: eventDetails.endDate || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      ...eventDetails,
    };
    mockEvents.push(event);
    return event.id;
  }
);

export const updateEventAsync = jest.fn().mockImplementation(
  async (eventId, eventDetails = {}, recurringEventOptions = {}) => {
    const eventIndex = mockEvents.findIndex(e => e.id === eventId);
    if (eventIndex >= 0) {
      mockEvents[eventIndex] = { ...mockEvents[eventIndex], ...eventDetails };
    }
    return;
  }
);

export const deleteEventAsync = jest.fn().mockImplementation(
  async (eventId, recurringEventOptions = {}) => {
    const eventIndex = mockEvents.findIndex(e => e.id === eventId);
    if (eventIndex >= 0) {
      mockEvents.splice(eventIndex, 1);
    }
    return;
  }
);

export const getEventsAsync = jest.fn().mockImplementation(
  async (calendarIds, startDate, endDate) => {
    return mockEvents.filter(event => 
      calendarIds.includes(event.calendarId) &&
      event.startDate >= startDate &&
      event.endDate <= endDate
    );
  }
);

export const getEventAsync = jest.fn().mockImplementation(
  async (eventId, recurringEventOptions = {}) => {
    return mockEvents.find(e => e.id === eventId) || null;
  }
);

export const getAttendeesForEventAsync = jest.fn().mockImplementation(
  async (eventId) => {
    return [];
  }
);

export const createAttendeeAsync = jest.fn().mockImplementation(
  async (eventId, details = {}) => {
    return `mock-attendee-${Date.now()}`;
  }
);

export const updateAttendeeAsync = jest.fn().mockImplementation(
  async (attendeeId, details = {}) => {
    return;
  }
);

export const deleteAttendeeAsync = jest.fn().mockImplementation(
  async (attendeeId) => {
    return;
  }
);

export const getDefaultCalendarAsync = jest.fn().mockImplementation(
  async () => {
    return mockCalendars[0] || null;
  }
);

// Test utilities
export const __clearAllEvents = () => {
  mockEvents.length = 0;
};

export const __getMockEvents = () => {
  return [...mockEvents];
};

export const __setMockPermissionStatus = (status) => {
  const mockResult = {
    status,
    canAskAgain: status !== 'granted',
    expires: 'never',
    granted: status === 'granted',
  };
  
  requestCalendarPermissionsAsync.mockResolvedValue(mockResult);
  getCalendarPermissionsAsync.mockResolvedValue(mockResult);
};

export default {
  EntityTypes,
  CalendarAccessLevel,
  EventAccessLevel,
  CalendarType,
  SourceType,
  AttendeeRole,
  AttendeeStatus,
  AttendeeType,
  AlarmMethod,
  EventStatus,
  Frequency,
  requestCalendarPermissionsAsync,
  getCalendarPermissionsAsync,
  getCalendarsAsync,
  createEventAsync,
  updateEventAsync,
  deleteEventAsync,
  getEventsAsync,
  getEventAsync,
  getAttendeesForEventAsync,
  createAttendeeAsync,
  updateAttendeeAsync,
  deleteAttendeeAsync,
  getDefaultCalendarAsync,
  __clearAllEvents,
  __getMockEvents,
  __setMockPermissionStatus,
};
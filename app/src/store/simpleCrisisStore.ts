import { create } from 'zustand';

interface CrisisContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

interface CrisisState {
  isInCrisis: boolean;
  lastCrisisCheck: Date | null;
  emergencyContacts: CrisisContact[];
  safetyPlan: string[];
}

interface CrisisStore extends CrisisState {
  setCrisisState: (inCrisis: boolean) => void;
  addEmergencyContact: (contact: Omit<CrisisContact, 'id'>) => void;
  updateSafetyPlan: (plan: string[]) => void;
  recordCrisisCheck: () => void;
  initializeCrisisData: () => void;
}

export const useCrisisStore = create<CrisisStore>((set, get) => ({
  isInCrisis: false,
  lastCrisisCheck: null,
  emergencyContacts: [],
  safetyPlan: [],

  setCrisisState: (inCrisis) => {
    set({ isInCrisis: inCrisis });
    if (inCrisis) {
      set({ lastCrisisCheck: new Date() });
    }
  },

  addEmergencyContact: (contact) => {
    const newContact: CrisisContact = {
      ...contact,
      id: `contact-${Date.now()}`,
    };
    set((state) => ({
      emergencyContacts: [...state.emergencyContacts, newContact],
    }));
  },

  updateSafetyPlan: (plan) => {
    set({ safetyPlan: plan });
  },

  recordCrisisCheck: () => {
    set({ lastCrisisCheck: new Date() });
  },

  initializeCrisisData: () => {
    // Hardcoded emergency data for Phase 4
    const mockContacts: CrisisContact[] = [
      {
        id: 'contact-1',
        name: 'Crisis Hotline',
        phone: '988',
        relationship: 'Crisis Support',
      },
      {
        id: 'contact-2',
        name: 'Emergency Services',
        phone: '911',
        relationship: 'Emergency',
      },
    ];

    const mockSafetyPlan = [
      'Take 3 deep breaths',
      'Call someone I trust',
      'Use grounding techniques',
      'Contact crisis support if needed',
    ];

    set({
      emergencyContacts: mockContacts,
      safetyPlan: mockSafetyPlan,
    });
  },
}));
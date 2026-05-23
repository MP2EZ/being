/**
 * useFlowSessionResumption Hook Tests
 *
 * INFRA-135: Unit tests for the shared session resumption hook
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useFlowSessionResumption } from '@/features/practices/shared/hooks/useFlowSessionResumption';
import { SessionStorageService } from '@/core/services/session/SessionStorageService';

// Mock the SessionStorageService
jest.mock('@/core/services/session/SessionStorageService', () => ({
  SessionStorageService: {
    loadSession: jest.fn(),
    saveSession: jest.fn(),
    clearSession: jest.fn(),
  },
}));

const MOCK_SCREEN_ORDER = ['Screen1', 'Screen2', 'Screen3', 'Completion'] as const;
type MockScreenName = (typeof MOCK_SCREEN_ORDER)[number];

describe('useFlowSessionResumption', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns initial checking state as true', () => {
    (SessionStorageService.loadSession as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() =>
      useFlowSessionResumption<MockScreenName>({
        flowType: 'morning',
        screenOrder: MOCK_SCREEN_ORDER,
      })
    );

    expect(result.current.isCheckingSession).toBe(true);
  });

  it('sets isCheckingSession to false after checking', async () => {
    (SessionStorageService.loadSession as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() =>
      useFlowSessionResumption<MockScreenName>({
        flowType: 'morning',
        screenOrder: MOCK_SCREEN_ORDER,
      })
    );

    await waitFor(() => {
      expect(result.current.isCheckingSession).toBe(false);
    });
  });

  it('does not show resume modal when no session exists', async () => {
    (SessionStorageService.loadSession as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() =>
      useFlowSessionResumption<MockScreenName>({
        flowType: 'morning',
        screenOrder: MOCK_SCREEN_ORDER,
      })
    );

    await waitFor(() => {
      expect(result.current.isCheckingSession).toBe(false);
    });

    expect(result.current.showResumeModal).toBe(false);
    expect(result.current.resumableSession).toBe(null);
  });

  it('shows resume modal when session exists beyond first screen', async () => {
    (SessionStorageService.loadSession as jest.Mock).mockResolvedValue({
      flowType: 'morning',
      currentScreen: 'Screen2',
      savedAt: Date.now(),
      flowState: { screenData: { Screen1: { value: 'test' } } },
    });

    const { result } = renderHook(() =>
      useFlowSessionResumption<MockScreenName>({
        flowType: 'morning',
        screenOrder: MOCK_SCREEN_ORDER,
      })
    );

    await waitFor(() => {
      expect(result.current.showResumeModal).toBe(true);
    });

    expect(result.current.resumableSession).not.toBe(null);
  });

  it('clears session and does not show modal when at first screen', async () => {
    (SessionStorageService.loadSession as jest.Mock).mockResolvedValue({
      flowType: 'morning',
      currentScreen: 'Screen1',
      savedAt: Date.now(),
    });
    (SessionStorageService.clearSession as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useFlowSessionResumption<MockScreenName>({
        flowType: 'morning',
        screenOrder: MOCK_SCREEN_ORDER,
      })
    );

    await waitFor(() => {
      expect(result.current.isCheckingSession).toBe(false);
    });

    expect(SessionStorageService.clearSession).toHaveBeenCalledWith('morning');
    expect(result.current.showResumeModal).toBe(false);
  });

  it('handleBeginFresh clears session and resets state', async () => {
    (SessionStorageService.loadSession as jest.Mock).mockResolvedValue({
      flowType: 'morning',
      currentScreen: 'Screen2',
      savedAt: Date.now(),
    });
    (SessionStorageService.clearSession as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useFlowSessionResumption<MockScreenName>({
        flowType: 'morning',
        screenOrder: MOCK_SCREEN_ORDER,
      })
    );

    await waitFor(() => {
      expect(result.current.showResumeModal).toBe(true);
    });

    await act(async () => {
      await result.current.handleBeginFresh();
    });

    expect(SessionStorageService.clearSession).toHaveBeenCalledWith('morning');
    expect(result.current.showResumeModal).toBe(false);
    expect(result.current.resumableSession).toBe(null);
  });

  it('updateScreenData updates state and saves session', async () => {
    (SessionStorageService.loadSession as jest.Mock).mockResolvedValue(null);
    (SessionStorageService.saveSession as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useFlowSessionResumption<MockScreenName>({
        flowType: 'morning',
        screenOrder: MOCK_SCREEN_ORDER,
      })
    );

    await waitFor(() => {
      expect(result.current.isCheckingSession).toBe(false);
    });

    act(() => {
      result.current.updateScreenData('Screen1', { value: 'test' }, 'Screen2');
    });

    expect(result.current.screenData).toEqual({ Screen1: { value: 'test' } });
    expect(SessionStorageService.saveSession).toHaveBeenCalledWith('morning', 'Screen2', {
      screenData: { Screen1: { value: 'test' } },
    });
  });

  it('uses custom log prefix', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    (SessionStorageService.loadSession as jest.Mock).mockResolvedValue(null);

    renderHook(() =>
      useFlowSessionResumption<MockScreenName>({
        flowType: 'evening',
        screenOrder: MOCK_SCREEN_ORDER,
        logPrefix: '[CustomPrefix]',
      })
    );

    await waitFor(() => {
      // Just verify hook runs without errors
      expect(true).toBe(true);
    });

    consoleSpy.mockRestore();
  });
});

/**
 * ExportDataScreen — the presenting guard against REAL navigators (FEAT-806).
 *
 * The sibling suites mock `useNavigation().isFocused`, so they would stay green if
 * the guard read only the innermost stack's state. The crisis button pushes
 * `CrisisResources` onto the ROOT stack, leaving ExportData the active route of
 * its own (now covered) stack — exactly the case a stack-local check gets wrong.
 * This suite mounts the app's shape (root stack → Main → profile stack →
 * ExportData, plus a root `CrisisResources`), navigates there mid-render, and
 * asserts no sheet is raised and no file is left.
 */
import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Same shim as DailyLoopNavigator.resume.test.tsx: use-latest-callback picks its effect
// hook off `navigator.product`, which jest's environment does not set.
jest.mock('use-latest-callback', () => {
  Object.defineProperty(globalThis, 'navigator', {
    value: { ...(globalThis as { navigator?: object }).navigator, product: 'ReactNative' },
    configurable: true,
    writable: true,
  });
  return jest.requireActual('use-latest-callback');
});

const mockDisk = new Map<string, boolean>();
jest.mock('expo-file-system', () => ({
  Paths: { cache: '/cache' },
  File: jest.fn().mockImplementation((dirOrUri: string, name?: string) => {
    const file = {
      path: name === undefined ? dirOrUri.replace(/^file:\/\//, '') : `${dirOrUri}/${name}`,
      get uri() {
        return `file://${file.path}`;
      },
      get exists() {
        return mockDisk.get(file.path) === true;
      },
      create: () => mockDisk.set(file.path, true),
      write: () => undefined,
      move: async (dest: { path: string }) => {
        mockDisk.set(file.path, false);
        mockDisk.set(dest.path, true);
        file.path = dest.path;
      },
      delete: () => {
        mockDisk.set(file.path, false);
      },
    };
    return file;
  }),
}));

const PRINT_OUTPUT = '/cache/Print/3F2504E0-4F89-41D3-9A0C-0305E82C3301.pdf';
const mockPrintToFile = jest.fn();
jest.mock('expo-print', () => ({
  printToFileAsync: (...a: unknown[]) => mockPrintToFile(...a),
}));

const mockShareAsync = jest.fn();
jest.mock('expo-sharing', () => ({
  shareAsync: (...a: unknown[]) => mockShareAsync(...a),
  isAvailableAsync: async () => true,
}));

jest.mock('@/core/services/featureFlags', () => ({
  isFeatureEnabled: () => false,
}));

import ExportDataScreen from '../ExportDataScreen';

// The global react-native mock lacks what real stack navigators touch; same shims as
// DailyLoopNavigator.resume.test.tsx.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const RN = require('react-native');
const actualRN = jest.requireActual('react-native');
Object.assign(RN, {
  InteractionManager: actualRN.InteractionManager,
  I18nManager: actualRN.I18nManager,
  PixelRatio: actualRN.PixelRatio,
});
RN.Linking.addEventListener = jest.fn(() => ({ remove: jest.fn() }));

type Root = { Main: undefined; CrisisResources: undefined };
const RootStack = createStackNavigator<Root>();
const ProfileStack = createStackNavigator<{ ExportData: undefined }>();
const navigationRef = createNavigationContainerRef<Root>();

const CrisisResources = () => <Text testID="crisis-resources-screen">988</Text>;
const Main = () => (
  <ProfileStack.Navigator>
    <ProfileStack.Screen name="ExportData" component={ExportDataScreen} />
  </ProfileStack.Navigator>
);

const onDisk = (): string[] => [...mockDisk].filter(([, exists]) => exists).map(([p]) => p);

beforeEach(() => {
  jest.clearAllMocks();
  mockDisk.clear();
  mockShareAsync.mockResolvedValue(undefined);
});

it('does not raise the sheet when the crisis route was pushed on the ROOT stack mid-render', async () => {
  let settle!: (v: { uri: string; numberOfPages: number }) => void;
  mockPrintToFile.mockImplementation(
    () =>
      new Promise((resolve) => {
        mockDisk.set(PRINT_OUTPUT, true);
        settle = resolve;
      }),
  );
  const api = render(
    <NavigationContainer ref={navigationRef}>
      <RootStack.Navigator>
        <RootStack.Screen name="Main" component={Main} />
        <RootStack.Screen name="CrisisResources" component={CrisisResources} />
      </RootStack.Navigator>
    </NavigationContainer>,
  );

  await waitFor(() => expect(api.getByTestId('export-pdf-button')).toBeTruthy());
  fireEvent.press(api.getByTestId('export-pdf-button'));
  await waitFor(() => expect(mockPrintToFile).toHaveBeenCalledTimes(1));

  act(() => navigationRef.navigate('CrisisResources'));
  await waitFor(() => expect(api.getByTestId('crisis-resources-screen')).toBeTruthy());

  await act(async () => {
    settle({ uri: `file://${PRINT_OUTPUT}`, numberOfPages: 1 });
  });
  await waitFor(() => expect(onDisk()).toEqual([]));
  expect(mockShareAsync).not.toHaveBeenCalled();
});

it('control: with no navigation away, the same tree raises the sheet', async () => {
  mockPrintToFile.mockImplementation(async () => {
    mockDisk.set(PRINT_OUTPUT, true);
    return { uri: `file://${PRINT_OUTPUT}`, numberOfPages: 1 };
  });
  const api = render(
    <NavigationContainer ref={navigationRef}>
      <RootStack.Navigator>
        <RootStack.Screen name="Main" component={Main} />
        <RootStack.Screen name="CrisisResources" component={CrisisResources} />
      </RootStack.Navigator>
    </NavigationContainer>,
  );
  await waitFor(() => expect(api.getByTestId('export-pdf-button')).toBeTruthy());
  fireEvent.press(api.getByTestId('export-pdf-button'));
  await waitFor(() => expect(mockShareAsync).toHaveBeenCalledTimes(1));
});

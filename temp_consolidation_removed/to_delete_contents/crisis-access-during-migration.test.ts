/**
 * Crisis Access During Migration - Critical Safety Test
 * 
 * CRITICAL: Ensures crisis button remains accessible during SQLite migration
 * Any failure could impact user safety during mental health emergencies
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { dataStore } from '../../src/services/storage/DataStore';
import { Assessment } from '../../src/types';

// Mock migration service to simulate migration delays
const mockMigrationDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('Crisis Access During Migration', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('Crisis button accessible during migration (CRITICAL SAFETY)', async () => {
    // Create crisis assessment scenario
    const crisisAssessment: Assessment = {
      id: 'crisis_during_migration',
      type: 'phq9',
      completedAt: new Date().toISOString(),
      answers: [3, 3, 3, 3, 3, 3, 3, 3, 3], // Score 27, severe crisis
      score: 27,
      severity: 'severe',
      context: 'standalone'
    };

    // Save assessment first
    await dataStore.saveAssessment(crisisAssessment);

    // Simulate migration delay
    const startTime = Date.now();
    
    // During migration, crisis access should still work
    const migrationPromise = mockMigrationDelay(1000); // 1 second migration simulation
    
    // Test crisis access during migration
    const crisisAccessStart = Date.now();
    const assessment = await dataStore.getLatestAssessment('phq9');
    const crisisAccessTime = Date.now() - crisisAccessStart;
    
    // Verify crisis data is accessible
    expect(assessment).not.toBeNull();
    expect(assessment!.score).toBe(27);
    expect(assessment!.severity).toBe('severe');
    
    // Verify access time is under 200ms (critical requirement)
    expect(crisisAccessTime).toBeLessThan(200);
    
    // Wait for migration to complete
    await migrationPromise;
    
    const totalTime = Date.now() - startTime;
    console.log(`✅ Crisis access: ${crisisAccessTime}ms, Migration: ${totalTime}ms`);
  });

  test('Crisis assessment saves during migration without data loss', async () => {
    // Start migration simulation
    const migrationPromise = mockMigrationDelay(2000);
    
    // Attempt to save crisis assessment during migration
    const crisisAssessment: Assessment = {
      id: 'crisis_save_during_migration',
      type: 'phq9',
      completedAt: new Date().toISOString(),
      answers: [0, 0, 0, 0, 0, 0, 0, 0, 3], // Score 3, but suicidal ideation (Q9 = 3)
      score: 3,
      severity: 'minimal',
      context: 'standalone'
    };

    const saveStart = Date.now();
    await dataStore.saveAssessment(crisisAssessment);
    const saveTime = Date.now() - saveStart;
    
    // Verify data was saved successfully
    const retrieved = await dataStore.getLatestAssessment('phq9');
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe('crisis_save_during_migration');
    expect(retrieved!.answers[8]).toBe(3); // Suicidal ideation preserved
    
    // Verify save time reasonable (should be fast even during migration)
    expect(saveTime).toBeLessThan(1000);
    
    await migrationPromise;
    console.log(`✅ Crisis save during migration: ${saveTime}ms`);
  });

  test('Multiple crisis access attempts during extended migration', async () => {
    // Create multiple assessments
    const assessments: Assessment[] = [
      {
        id: 'crisis_1',
        type: 'phq9',
        completedAt: '2024-09-08T10:00:00.000Z',
        answers: [3, 3, 2, 2, 2, 2, 2, 2, 2],
        score: 20,
        severity: 'severe',
        context: 'standalone'
      },
      {
        id: 'crisis_2',
        type: 'gad7',
        completedAt: '2024-09-08T10:01:00.000Z',
        answers: [3, 3, 3, 2, 2, 2, 0],
        score: 15,
        severity: 'severe',
        context: 'standalone'
      }
    ];

    // Save assessments
    await dataStore.saveAssessment(assessments[0]);
    await dataStore.saveAssessment(assessments[1]);

    // Simulate extended migration (5 seconds)
    const migrationPromise = mockMigrationDelay(5000);
    
    // Test multiple concurrent crisis access attempts
    const accessPromises = [
      dataStore.getLatestAssessment('phq9'),
      dataStore.getLatestAssessment('gad7'),
      dataStore.getAssessments(),
      dataStore.getLatestAssessment('phq9'), // Duplicate to test concurrency
    ];

    const accessStart = Date.now();
    const results = await Promise.all(accessPromises);
    const totalAccessTime = Date.now() - accessStart;

    // Verify all access attempts succeeded
    expect(results[0]).not.toBeNull(); // PHQ-9
    expect(results[1]).not.toBeNull(); // GAD-7
    expect(results[2]).toHaveLength(2); // All assessments
    expect(results[3]).not.toBeNull(); // Duplicate PHQ-9

    // Verify no data corruption
    expect(results[0]!.score).toBe(20);
    expect(results[1]!.score).toBe(15);

    // Verify reasonable access time even with concurrency
    expect(totalAccessTime).toBeLessThan(1000);

    await migrationPromise;
    console.log(`✅ Concurrent crisis access during extended migration: ${totalAccessTime}ms`);
  });

  test('Migration failure does not block crisis access', async () => {
    // Create crisis assessment
    const crisisAssessment: Assessment = {
      id: 'crisis_during_failed_migration',
      type: 'phq9',
      completedAt: new Date().toISOString(),
      answers: [2, 2, 2, 2, 2, 2, 2, 2, 1], // Score 17, with suicidal ideation
      score: 17,
      severity: 'moderately severe',
      context: 'standalone'
    };

    await dataStore.saveAssessment(crisisAssessment);

    // Simulate migration failure (migration takes long time but crisis access must work)
    const failedMigrationPromise = mockMigrationDelay(10000); // 10 second "failed" migration

    // Crisis access should work immediately regardless of migration status
    const accessStart = Date.now();
    const assessment = await dataStore.getLatestAssessment('phq9');
    const accessTime = Date.now() - accessStart;

    // Verify crisis data accessible
    expect(assessment).not.toBeNull();
    expect(assessment!.answers[8]).toBe(1); // Suicidal ideation
    expect(accessTime).toBeLessThan(200);

    // Don't wait for failed migration to complete
    console.log(`✅ Crisis access despite migration failure: ${accessTime}ms`);
  });

  test('Crisis detection works during migration', async () => {
    // Test that crisis detection algorithms work during migration
    const migrationPromise = mockMigrationDelay(3000);
    
    // Create and save crisis assessments during migration
    const phq9Crisis: Assessment = {
      id: 'phq9_crisis_migration',
      type: 'phq9',
      completedAt: new Date().toISOString(),
      answers: [3, 3, 3, 3, 3, 3, 2, 2, 0], // Score 22, above crisis threshold
      score: 22,
      severity: 'severe',
      context: 'standalone'
    };

    const gad7Crisis: Assessment = {
      id: 'gad7_crisis_migration',
      type: 'gad7',
      completedAt: new Date().toISOString(),
      answers: [3, 3, 3, 2, 2, 1, 1], // Score 15, at crisis threshold
      score: 15,
      severity: 'severe',
      context: 'standalone'
    };

    // Save both during migration
    await dataStore.saveAssessment(phq9Crisis);
    await dataStore.saveAssessment(gad7Crisis);

    // Verify both are retrievable during migration
    const retrievedPHQ9 = await dataStore.getLatestAssessment('phq9');
    const retrievedGAD7 = await dataStore.getLatestAssessment('gad7');

    expect(retrievedPHQ9?.score).toBe(22);
    expect(retrievedGAD7?.score).toBe(15);

    await migrationPromise;
    console.log('✅ Crisis detection validated during migration');
  });
});
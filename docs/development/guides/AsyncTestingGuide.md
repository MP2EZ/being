# Async Testing Guide: Mastering the 10ms Timing Pattern

## Overview: Why Async Timing Matters

In React Native and Zustand-powered applications, state updates are not always synchronous. The 10ms timing pattern is a crucial technique for ensuring consistent and reliable test behavior, especially when dealing with asynchronous state management.

## The 10ms Pattern: Understanding the Technique

### What It Is
```typescript
await new Promise(resolve => setTimeout(resolve, 10))
```

This simple one-liner allows a brief event loop cycle that:
- Ensures Zustand store updates have propagated
- Gives React Native's state management a moment to settle
- Prevents race conditions in test environments

### When to Use
- After store updates
- Before making assertions on state changes
- When testing complex state transitions
- When working with React Native's async rendering

## Common Pitfalls: What Breaks Without Async Timing

Without the 10ms pause, you might encounter:
- Stale state in assertions
- Inconsistent test results
- Missed state updates
- Flaky test suites

## Code Examples

### Incorrect: Immediate Assertion
```typescript
// AVOID: May fail due to async state updates
test('broken test', () => {
  store.setState({ value: 'new' });
  expect(store.getState().value).toBe('new'); // UNRELIABLE
});
```

### Correct: Using 10ms Timing
```typescript
// RECOMMENDED: Ensures state update completion
test('reliable test', async () => {
  store.setState({ value: 'new' });
  await new Promise(resolve => setTimeout(resolve, 10));
  expect(store.getState().value).toBe('new'); // CONSISTENT
});
```

## Best Practices

1. Always use `await` with the 10ms timeout
2. Place the timeout immediately after state-changing operations
3. Combine with `async/await` in test functions
4. Use sparingly - not for every single test
5. Consider extracting to a test utility function

## Real-World Reference

For a comprehensive example, examine `comprehensive-scoring-validation.test.ts`, which demonstrates advanced async testing techniques in our codebase.

## Performance Considerations

- 10ms is a minimal overhead
- Prevents potential race conditions
- More reliable than hardcoded waits

## Pro Tip

Create a test utility to standardize this pattern:

```typescript
async function waitForStoreUpdate() {
  await new Promise(resolve => setTimeout(resolve, 10));
}

// Usage
test('example', async () => {
  store.setState({ value: 'new' });
  await waitForStoreUpdate();
  expect(store.getState().value).toBe('new');
});
```

## Conclusion

The 10ms timing pattern is a simple yet powerful technique for managing async state in React Native and Zustand applications. Use it judiciously to create more reliable and predictable test suites.
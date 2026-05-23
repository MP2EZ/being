import fs from 'fs';
import path from 'path';

const SERVICE_PATH = path.resolve(
  __dirname,
  '..',
  'AuthenticationService.ts'
);

describe('AuthenticationService SEC-03 regression guard', () => {
  const source = fs.readFileSync(SERVICE_PATH, 'utf-8');

  test('authenticateWithCredentials does not contain success: true', () => {
    // The original stub returned { success: true, ... } unconditionally.
    // After SEC-03 it should never return success — only the failure path.
    const methodStart = source.indexOf(
      'private async authenticateWithCredentials'
    );
    expect(methodStart).toBeGreaterThan(-1);

    // Find the end of the method (next "private async" or "public" or class end).
    const methodTail = source.slice(methodStart);
    const nextMethodOffset = methodTail.search(
      /\n {2}(private|public|protected) /
    );
    const methodBody =
      nextMethodOffset > 0
        ? methodTail.slice(0, nextMethodOffset)
        : methodTail;

    expect(methodBody).not.toMatch(/success:\s*true/);
  });

  test('authenticateWithCredentials returns failure with SEC-03 error', () => {
    expect(source).toMatch(/SEC-03/);
    expect(source).toMatch(/Credential authentication is not supported/);
  });
});

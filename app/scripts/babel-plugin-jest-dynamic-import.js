/**
 * babel-plugin-jest-dynamic-import (MAINT-242)
 *
 * Test-only Babel plugin. Rewrites dynamic `import(x)` expressions into
 * `Promise.resolve().then(() => require(x))` so they resolve synchronously
 * through Jest's module registry (and honor jest.mock).
 *
 * WHY: babel-preset-expo leaves native `import()` intact (Metro supports
 * it), but the Jest Node VM cannot execute native dynamic import and throws
 * "A dynamic import callback was invoked without --experimental-vm-modules".
 * Several modules use `await import(...)` to break circular deps (e.g.
 * subscriptionStore -> IAPService). Unlike @babel/plugin-transform-modules-
 * commonjs, this touches ONLY dynamic imports, so it does not collide with
 * the preset's static-import / node_modules handling.
 *
 * Scoped to the `test` env in babel.config.js — never runs in Metro/EAS.
 */
module.exports = function jestDynamicImportPlugin({ types: t }) {
  return {
    name: 'jest-dynamic-import',
    visitor: {
      // `import(specifier)` parses as a CallExpression whose callee is the
      // special `Import` node.
      CallExpression(path) {
        if (path.node.callee.type !== 'Import') return;

        const args = path.node.arguments;
        const requireCall = t.callExpression(t.identifier('require'), args);
        const thenArrow = t.arrowFunctionExpression([], requireCall);
        const resolved = t.callExpression(
          t.memberExpression(t.identifier('Promise'), t.identifier('resolve')),
          []
        );
        const replacement = t.callExpression(
          t.memberExpression(resolved, t.identifier('then')),
          [thenArrow]
        );
        path.replaceWith(replacement);
      },
    },
  };
};

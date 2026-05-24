// Eager env-schema validation (INFRA-141). Imported before `App` so that a
// misconfigured env fails loud at startup, before any service initializes
// against missing or malformed values. The import has a side effect — the
// `env` constant in the module is computed via `envSchema.parse(...)` at
// load time and throws on invalid input.
import './src/core/config/env';
import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

let _config: Record<string, string> = {};

try {
  _config = require('react-native-config').default ?? {};
} catch {
  // Native module not linked yet — use fallbacks
}

export const Config = _config;

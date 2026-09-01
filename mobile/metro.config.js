const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Metro's package.json "exports" resolution (default since SDK 53) picks an entry point for
// the Firebase JS SDK that breaks Auth's component registration on React Native ("Component
// auth has not been registered yet"). Fall back to Firebase's CJS build instead.
config.resolver.sourceExts.push("cjs");
config.resolver.unstable_enablePackageExports = false;

module.exports = config;

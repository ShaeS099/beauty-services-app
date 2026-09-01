/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  rootDir: ".",
  testMatch: ["<rootDir>/test/**/*.test.ts"],
  setupFiles: ["<rootDir>/test/env.setup.ts"],
  testTimeout: 20000,
  moduleNameMapper: {
    "^expo-server-sdk$": "<rootDir>/test/mocks/expo-server-sdk.ts",
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.test.json" }],
  },
};

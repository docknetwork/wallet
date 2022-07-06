module.exports = {
  clearMocks: true,
  testTimeout: 30000,
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    }
  },
  testEnvironment: "./tests/test-environment.js",
  transform: {
    "^.+\\.(ts|js)$": "babel-jest"
  },
  transformIgnorePatterns: [
    "/node_modules/(?!@polkadot|@babel|@docknetwork)"
  ],
  setupFilesAfterEnv: [
    "./tests/setup-test-env.js"
  ],
  globals: {
    Uint8Array: Uint8Array,
    ArrayBuffer: ArrayBuffer
  }
};

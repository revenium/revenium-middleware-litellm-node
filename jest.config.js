module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: [
    "**/unit/**/*.test.ts",
    "**/integration/**/*.test.ts",
    "**/performance/**/*.test.ts",
  ],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts", "!src/index.ts"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  verbose: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  forceExit: true,
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  moduleNameMapper: {
    "^axios$": "<rootDir>/tests/__mocks__/axios.ts",
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  extensionsToTreatAsEsm: [".ts"],
  globals: {
    "ts-jest": {
      useESM: false,
    },
  },
};

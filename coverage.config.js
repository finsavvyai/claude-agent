/**
 * Coverage configuration for Jest
 * Defines what to include/exclude from coverage reporting
 */

module.exports = {
  // Coverage collection settings
  collectCoverage: true,
  collectCoverageFrom: [
    'packages/**/*.{ts,tsx}',
    'apps/**/*.{ts,tsx}',
    'tools/**/*.{ts,tsx}',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/build/**',
    '!**/*.d.ts',
    '!**/coverage/**',
    '!**/*.config.{js,ts}',
    '!**/__tests__/**',
    '!**/*.test.{ts,tsx,js}',
    '!**/*.spec.{ts,tsx,js}',
    '!**/index.ts',
    '!**/stories/**',
    '!**/fixtures/**',
    '!**/factories/**',
    '!**/helpers/**',
    '!**/mocks/**',
  ],

  // Coverage reporting
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json',
    'json-summary',
    'clover',
    'teamcity',
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // Higher thresholds for critical packages
    'packages/agents/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    'packages/gateway/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    'packages/api/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // Lower thresholds for less critical packages
    'packages/cli/': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    'tools/': {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
    // Excludes
    '**/types.ts': {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
    '**/interfaces.ts': {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
    '**/constants.ts': {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },

  // Coverage watermarks
  coverageWatermarks: {
    statements: [80, 95],
    functions: [80, 95],
    branches: [80, 95],
    lines: [80, 95],
  },

  // Skip files with full coverage
  skipFullCoverage: false,

  // Only collect coverage from changed files (for CI)
  changedSince: process.env.CI_BRANCH ? `origin/main...${process.env.CI_BRANCH}` : undefined,

  // Coverage ignore patterns
  coverageIgnorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    'coverage/',
    '**/*.d.ts',
    '**/*.config.{js,ts}',
    '**/__tests__/**',
    '**/*.test.{ts,tsx,js}',
    '**/*.spec.{ts,tsx,js}',
    '**/index.ts',
    '**/types/**',
    '**/interfaces/**',
  ],

  // Verbose coverage output
  verbose: true,

  // Coverage reporters for different environments
  coverageReportersByEnvironment: {
    development: ['text', 'text-summary', 'html'],
    test: ['text', 'text-summary', 'lcov', 'json'],
    ci: ['text', 'text-summary', 'lcov', 'json', 'clover', 'teamcity'],
  },
};

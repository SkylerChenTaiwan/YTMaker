// jest.config.js
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  preset: 'ts-jest',  // ✅ 加入 ts-jest preset
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^uuid$': require.resolve('uuid'),
  },
  transform: {  // ✅ 明確指定 transform
    '^.+\\.(t|j)sx?$': [
      'ts-jest',
      {
        tsconfig: {
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          jsx: 'react',
        },
      },
    ],
  },
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/tests/e2e/'],
  testMatch: [
    '**/tests/unit/**/*.test.[jt]s?(x)',
    '**/tests/integration/**/*.test.[jt]s?(x)',
    '**/__tests__/**/*.test.[jt]s?(x)',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
    '!middleware.ts',
  ],
  coverageThreshold: {  // ✅ 修正：改為單數
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageDirectory: 'coverage',
  // MSW mock 測試使用 node 環境
  projects: [
    {
      displayName: 'jsdom',
      testEnvironment: 'jest-environment-jsdom',
      testMatch: [
        '**/tests/unit/**/*.test.[jt]s?(x)',
        '**/tests/integration/**/*.test.[jt]s?(x)',
      ],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    },
    {
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: ['**/tests/mocks/__tests__/**/*.test.[jt]s'],
    },
  ],
}

module.exports = createJestConfig(customJestConfig)

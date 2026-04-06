import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import reactPlugin from 'eslint-plugin-react'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: { react: reactPlugin },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', {
        varsIgnorePattern: '^[A-Z_]',
        argsIgnorePattern: '^[A-Z_]',
        caughtErrors: 'none',
      }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      // Marks variables used in JSX as "used" so no-unused-vars doesn't false-positive on them
      'react/jsx-uses-vars': 'error',
    },
  },
  // Context files and badges export both provider components and hooks — fast-refresh
  // rule is a dev-only concern and produces false positives here.
  {
    files: [
      'src/contexts/**',
      'src/components/ErrorBoundary.jsx',
      'src/lib/badges.jsx',
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  // Test files — no-unused-vars is too noisy for test utilities
  {
    files: ['**/*.test.*', '**/__tests__/**'],
    rules: {
      'no-unused-vars': 'off',
    },
  },
])

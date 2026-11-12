import pluginJs from '@eslint/js'
import pluginReact from 'eslint-plugin-react'
import pluginReactHooks from 'eslint-plugin-react-hooks'
import pluginUnusedImports from 'eslint-plugin-unused-imports'
import globals from 'globals'

const sharedRules = {
  'no-unused-vars': 'off',
  'unused-imports/no-unused-imports': 'error',
  'unused-imports/no-unused-vars': [
    'warn',
    {
      vars: 'all',
      varsIgnorePattern: '^_',
      args: 'after-used',
      argsIgnorePattern: '^_',
    },
  ],
}

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.cache/**',
      '.vercel/**',
      'supabase/**',
      'package-lock.json',
    ],
  },
  {
    files: ['src/**/*.{js,jsx}'],
    ...pluginJs.configs.recommended,
    ...pluginReact.configs.flat.recommended,
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 2024,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    settings: { react: { version: 'detect' } },
    plugins: {
      react: pluginReact,
      'react-hooks': pluginReactHooks,
      'unused-imports': pluginUnusedImports,
    },
    rules: {
      ...sharedRules,
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'error',
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    files: ['api/**/*.js', 'scripts/**/*.mjs', 'vite.config.js', 'tests/**/*.js'],
    ...pluginJs.configs.recommended,
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        ecmaVersion: 2024,
        sourceType: 'module',
      },
    },
    plugins: { 'unused-imports': pluginUnusedImports },
    rules: sharedRules,
  },
  {
    files: ['tools/**/*.js'],
    ...pluginJs.configs.recommended,
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 2024,
        sourceType: 'module',
      },
    },
    plugins: { 'unused-imports': pluginUnusedImports },
    rules: sharedRules,
  },
]

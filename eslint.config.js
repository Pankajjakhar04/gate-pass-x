module.exports = [{
  ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  files: ['**/*.js', '**/*.jsx'],
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
    globals: {
      Buffer: 'readonly',
      alert: 'readonly',
      console: 'readonly',
      document: 'readonly',
      Event: 'readonly',
      fetch: 'readonly',
      FormData: 'readonly',
      localStorage: 'readonly',
      module: 'readonly',
      process: 'readonly',
      require: 'readonly',
      URLSearchParams: 'readonly',
      window: 'readonly',
      global: 'readonly',
      setTimeout: 'readonly',
      clearTimeout: 'readonly',
      setInterval: 'readonly',
      clearInterval: 'readonly',
      Intl: 'readonly',
      beforeAll: 'readonly',
      afterAll: 'readonly',
      describe: 'readonly',
      test: 'readonly',
      expect: 'readonly',
      jest: 'readonly'
    }
  },
  rules: { 'no-undef': 'error' }
}];
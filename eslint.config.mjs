import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['dist/**', 'out/**', '.vscode-test/**', 'node_modules/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...svelte.configs['flat/recommended'],
  prettier,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
      globals: { ...globals.browser },
    },
  },
  // eslint-plugin-svelte's recommended config also routes `*.svelte.ts` runes
  // modules through the svelte template parser; they are plain TypeScript.
  {
    files: ['**/*.svelte.ts'],
    languageOptions: {
      parser: tseslint.parser,
      globals: { ...globals.browser },
    },
  },
  {
    files: ['webview/**/*.ts'],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
  {
    files: ['*.config.js', '*.config.cjs', 'commitlint.config.js', '.husky/**'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
  },
  {
    files: ['*.mjs'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
);

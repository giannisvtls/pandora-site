import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import astro from 'eslint-plugin-astro';
import { createNodeResolver, importX } from 'eslint-plugin-import-x';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import sonarjs from 'eslint-plugin-sonarjs';
import unicorn from 'eslint-plugin-unicorn';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const TYPED_FILES = ['src/**/*.{ts,tsx}', 'scripts/**/*.ts'];
const TS_FILES = ['**/*.{ts,tsx,mts,cts}'];
const ASTRO_FILES = ['**/*.astro'];
// Client-side <script> blocks inside .astro files are linted as virtual child files.
const ASTRO_SCRIPT_FILES = ['**/*.astro/*.ts', '**/*.astro/*.js'];
const ALL_FILES = ['**/*.{js,mjs,cjs,ts,tsx,mts,cts,astro}'];

export default defineConfig(
  globalIgnores([
    'dist/',
    '.astro/',
    'node_modules/',
    'coverage/',
    'playwright-report/',
    'test-results/',
  ]),

  // --- baseline: every file ---
  {
    files: ALL_FILES,
    extends: [js.configs.recommended],
    languageOptions: { globals: { ...globals.node } },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      eqeqeq: ['error', 'smart'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // --- TypeScript (not type-aware): config files, e2e specs and .astro frontmatter ---
  {
    files: [...TS_FILES, ...ASTRO_FILES],
    extends: [tseslint.configs.strict, tseslint.configs.stylistic],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
    },
  },
  // The TS-aware replacements for core rules (no-undef, no-unused-vars, ...) also apply to .astro.
  { files: ASTRO_FILES, rules: tseslint.configs.eslintRecommended.rules },

  // --- TypeScript (type-aware): site source and Node scripts ---
  {
    files: TYPED_FILES,
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'default', format: ['camelCase'], leadingUnderscore: 'allow' },
        { selector: 'import', format: ['camelCase', 'PascalCase'] },
        { selector: 'variable', format: ['camelCase', 'UPPER_CASE', 'PascalCase'] }, // Components
        { selector: 'function', format: ['camelCase', 'PascalCase'] }, // Preact components
        { selector: 'parameter', format: ['camelCase'], leadingUnderscore: 'allow' },
        { selector: 'typeLike', format: ['PascalCase'] },
        { selector: 'enumMember', format: ['PascalCase', 'UPPER_CASE'] },
        {
          selector: 'interface',
          format: ['PascalCase'],
          custom: { regex: '^I[A-Z]', match: false },
        },
        // External, i18n and content shapes keep their own key casing.
        { selector: ['objectLiteralProperty', 'typeProperty'], format: null },
      ],
    },
  },

  // --- Astro: parser, processor and recommended rules, plus a11y for .astro templates ---
  astro.configs['flat/recommended'],
  astro.configs['flat/jsx-a11y-recommended'],
  // Virtual <script> files are not in the TS project, so they get no type-aware rules.
  { files: ASTRO_SCRIPT_FILES, extends: [tseslint.configs.disableTypeChecked] },

  // --- Preact islands: a11y for .tsx ---
  {
    files: ['**/*.tsx'],
    extends: [jsxA11y.flatConfigs.recommended],
    languageOptions: { globals: { ...globals.browser } },
  },

  // --- imports ---
  {
    files: ALL_FILES,
    plugins: { 'import-x': importX },
    settings: {
      // .astro is left out on purpose: import-x loads dependency parsers with require(), and
      // astro-eslint-parser is ESM-only, so no-cycle covers the .ts/.tsx/.js module graph only.
      'import-x/extensions': ['.ts', '.tsx', '.mts', '.cts', '.js', '.mjs', '.cjs'],
      'import-x/parsers': { '@typescript-eslint/parser': ['.ts', '.tsx', '.mts', '.cts'] },
      // The built-in resolver is enough while tsconfig has no `paths` aliases.
      'import-x/resolver-next': [
        createNodeResolver({
          extensions: ['.ts', '.tsx', '.mts', '.cts', '.js', '.mjs', '.cjs', '.astro', '.json'],
        }),
      ],
    },
    rules: {
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import-x/no-cycle': ['error', { ignoreExternal: true }],
      'import-x/no-duplicates': 'error',
      'import-x/no-self-import': 'error',
      'import-x/no-useless-path-segments': 'error',
    },
  },

  // --- curated unicorn + sonarjs: the recommended sets, minus rules that fight Astro/Preact ---
  {
    files: ALL_FILES,
    extends: [unicorn.configs.recommended, sonarjs.configs.recommended],
    rules: {
      // Components are PascalCase (BaseLayout.astro), modules kebab-case; [param] routes are Astro's.
      'unicorn/filename-case': [
        'error',
        { cases: { kebabCase: true, pascalCase: true }, ignore: [String.raw`^\[.+\]\.astro$`] },
      ],
      // Preact components return null to render nothing, and DOM APIs return null.
      'unicorn/no-null': 'off',
      // Astro and ESLint configs must be `export default defineConfig(...)`, which it flags.
      'unicorn/no-top-level-side-effects': 'off',
      // Wants `Props` -> `Properties`, but Astro types Astro.props through `interface Props`.
      'unicorn/name-replacements': 'off',
      // Duplicates @typescript-eslint/no-unused-vars (one rule, one report).
      'sonarjs/no-unused-vars': 'off',
      // Duplicates @typescript-eslint/no-unused-vars for imports.
      'sonarjs/unused-import': 'off',
      // Duplicates @typescript-eslint/no-deprecated from strictTypeChecked.
      'sonarjs/deprecation': 'off',

      // Size and complexity budgets (house values).
      'max-depth': ['warn', 4],
      'max-params': ['warn', 4],
      'max-lines-per-function': ['warn', { max: 80, skipBlankLines: true, skipComments: true }],
      'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
    },
  },

  // --- tests: relax ---
  {
    files: ['**/*.{test,spec}.{ts,tsx}', '**/__tests__/**', 'e2e/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      'max-lines-per-function': 'off',
      'sonarjs/no-identical-functions': 'off',
    },
  },

  // Must stay last: turns off every rule that would fight Prettier.
  prettier,
);

import parser from '@typescript-eslint/parser';
export default [
  { files: ['src/**/*.ts', 'tests/**/*.ts'], languageOptions: { parser, ecmaVersion: 'latest', sourceType: 'module' }, rules: { 'no-unused-vars': 'off', 'no-constant-condition': 'error' } },
  { files: ['tools/**/*.mjs'], languageOptions: { ecmaVersion: 'latest', sourceType: 'module' }, rules: { 'no-unused-vars': 'error', 'no-constant-condition': 'error' } }
];

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import js from '@eslint/js';
import next from 'eslint-config-next';
import prettier from 'eslint-config-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unusedImports from 'eslint-plugin-unused-imports';
import tseslint from 'typescript-eslint';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'next-env.d.ts',
      'data/**',
      'coverage/**',
      'build/**',
      'dist/**',
    ],
  },

  js.configs.recommended,
  ...next,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: rootDir,
      },
    },
    plugins: {
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports,
    },
    rules: {
      // Organização automática dos imports: externas → next → @/ → relativos → estilos.
      'simple-import-sort/imports': [
        'warn',
        {
          groups: [
            ['^\\u0000'],
            ['^(?!next(?:/|$))@?\\w'],
            ['^next(?:/|$)'],
            ['^@/'],
            ['^\\.(?!.*\\.(?:css|scss|sass)$)'],
            ['\\.(?:css|scss|sass)$'],
          ],
        },
      ],
      'simple-import-sort/exports': 'warn',
      'import/no-duplicates': 'warn',

      // Imports e variáveis não utilizados (autofix remove imports).
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'warn',
      'unused-imports/no-unused-vars': [
        'warn',
        { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' },
      ],

      // Bugs prováveis / código morto / promises esquecidas.
      'no-unreachable': 'warn',
      'no-empty': ['error', { allowEmptyCatch: true }],
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-misused-promises': ['warn', { checksVoidReturn: false }],

      // O TypeScript já resolve identificadores; o no-undef do ESLint gera falso
      // positivo com globais de tipo (ex.: o namespace `React` de @types/react).
      'no-undef': 'off',

      // Regras do React Compiler (novas no eslint-plugin-react-hooks 7): exigiriam
      // reestruturar effects que funcionam hoje. Fora do escopo de "não mudar
      // comportamento" — ver recomendações no README de qualidade.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',

      // <img> é intencional aqui (avatares em data-URI, onde next/image não ajuda).
      '@next/next/no-img-element': 'off',
    },
  },

  // Desativa regras de formatação que conflitam com o Prettier — deve ser o último.
  prettier,
);

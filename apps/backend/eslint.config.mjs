// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      "prettier/prettier": ["error", { endOfLine: "auto" }],
    },
  },
  {
    // PrismaClient is typed `any` in this repo until `npx prisma generate`
    // has run — it needs to download an engine binary from
    // binaries.prisma.sh, which some environments (e.g. network-restricted
    // sandboxes) can't reach. Every `this.prisma.*` call is consequently
    // `any`, which would make these four rules fire throughout the entire
    // DB-touching surface of the app (services, controllers, tests) without
    // catching real bugs — pure noise until generation succeeds. Once it
    // does, `this.prisma.*` becomes fully typed automatically and these
    // rules resume being meaningful with zero code changes needed.
    rules: {
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },
  {
    // supertest response bodies (`res.body`, `res.headers`) are untyped by
    // design — asserting on their shape is the point of an e2e test.
    files: ['test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },
  {
    // `expect(mockObj.method).toHaveBeenCalledWith(...)` is the standard
    // Jest pattern for asserting on a jest.fn() that happens to sit on an
    // object typed against a real interface (e.g. a mocked Socket.io
    // `Socket`) — unbound-method's "this could be rebound" concern doesn't
    // apply since these are test doubles, never real class instances.
    files: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
    },
  },
);

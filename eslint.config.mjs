import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import nextPlugin from '@next/eslint-plugin-next'

export default tseslint.config(
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'eslint.config.mjs'] },
  ...tseslint.configs.recommended,
  {
    plugins: {
      'react-hooks': reactHooks,
      '@next/next': nextPlugin,
    },
    rules: {
      ...(reactHooks.configs.recommended?.rules ?? {}),
      ...(nextPlugin.configs.recommended?.rules ?? {}),
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
)

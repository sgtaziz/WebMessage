module.exports = {
  root: true,
  env: {
    node: true,
  },
  extends: [
    'plugin:vue/vue3-essential',
    'eslint:recommended',
    '@vue/typescript/recommended',
    '@vue/prettier',
    '@vue/prettier/@typescript-eslint',
  ],
  parserOptions: {
    ecmaVersion: 2020,
  },
  globals: {
    __static: true,
    $: true,
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    '@typescript-eslint/no-empty-function': ['off'],
    '@typescript-eslint/no-var-requires': ['off'],
    'prettier/prettier': [
      'warn',
      {
        printWidth: 140,
        singleQuote: true,
        semi: false,
        trailingComma: 'es5',
        tabWidth: 2,
      },
    ],
  },
}

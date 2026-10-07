import antfu from '@antfu/eslint-config'

export default antfu({
  // antfu-config
  typescript: {
    tsconfigPath: 'tsconfig.json',
  },
}, {
  rules: {
    'antfu/if-newline': 'off',
    'ts/ban-ts-ignore': 'off',
    'ts/ban-ts-comment': 'off',
    'ts/strict-boolean-expressions': 'off',
    'ts/consistent-type-imports': 'off',
    'no-console': 'off',

    // Vue
    'vue/comma-dangle': 'off', // Managed by eslint - stylistic
    'vue/define-macros-order': 'off',
    'vue/prefer-separate-static-class': 'off',

    'eslint-comments/no-unlimited-disable': 'off',

    'perfectionist/sort-exports': 'off',
    'perfectionist/sort-imports': 'off',
    'perfectionist/sort-named-imports': 'off',

    'node/prefer-global/process': 'off',
  },
  // Custom Configs
})

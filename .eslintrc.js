module.exports = {
  env: { node: true, es2021: true },
  parserOptions: { ecmaVersion: 2020 },
  extends: ['airbnb-base'],
  rules: {
    'no-console': 'warn',
    'no-underscore-dangle': ['error', { allow: ['_id'] }],
    'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
  },
};

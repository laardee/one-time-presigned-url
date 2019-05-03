'use strict';

module.exports = {
  extends: 'maasglobal',
  env: {
    es6: true,
    node: true,
    jest: true,
  },
  parserOptions: {
    sourceType: 'script', // Revert 'module' implied by 'babel-eslint'
  },
  rules: {
    'import/no-extraneous-dependencies': ['error', { dependencies: ['aws-sdk'] }],
    'no-console': [
      'error',
      {
        allow: ['error', 'info', 'warn'],
      },
    ],
  },
};

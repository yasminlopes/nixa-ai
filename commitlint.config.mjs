const config = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'refactor',
        'perf',
        'style',
        'docs',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
      ],
    ],
  },
};

export default config;

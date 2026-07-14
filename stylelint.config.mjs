/** @type {import('stylelint').Config} */
const config = {
  extends: ['stylelint-config-standard-scss', 'stylelint-config-css-modules'],
  rules: {
    // CSS Modules usam classes camelCase (styles.providerCard) — não force kebab-case.
    'selector-class-pattern': null,
    'scss/dollar-variable-pattern': null,
    'custom-property-pattern': null,
    'keyframes-name-pattern': null,
    // Regras cosméticas que atrapalham mais do que ajudam neste projeto.
    'no-descending-specificity': null,
    'declaration-block-no-redundant-longhand-properties': null,
    'scss/no-global-function-names': null,
    // `//` sozinho é usado pra separar parágrafos dentro de blocos de comentário.
    'scss/comment-no-empty': null,
  },
};

export default config;

// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react/no-unescaped-entities': 'off',
    },
  },
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      ".expo/**",
      "server/**",
      "scripts/**",
    ],
  },
]);


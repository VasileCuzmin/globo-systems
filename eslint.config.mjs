// eslint.config.mjs
import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  {
    languageOptions: {
      globals: globals.node,
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"], // Apply these rules to TypeScript files
    rules: {
      // Add any specific TypeScript rules or overrides here
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/explicit-module-boundary-types": "off",
    },
  },
  {
    // Optional: Exclude specific files or directories from linting
    ignores: ["dist/", "node_modules/"],
  },
];

import plugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier";
import eslintPluginPrettier from "eslint-plugin-prettier";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  prettierConfig,
  {
    ignores: [
      "node_modules",
      "dist",
      ".next",
      "build",
      ".vscode",
      "next-env.d.ts",
      "setup-scripts",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      prettier: eslintPluginPrettier,
      "@typescript-eslint": plugin,
    },
    languageOptions: {
      parser: tsParser,
    },
    rules: {
      "prettier/prettier": "error",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-shadow": "error",
    },
  },
];

export default eslintConfig;

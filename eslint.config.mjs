import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import playwright from "eslint-plugin-playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [".next/*"],
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "react/no-unescaped-entities": "off",
      "@typescript-eslint/no-unused-vars": "error",
    },
  },
  {
    files: ["tests/**/*.ts"],
    ...playwright.configs["flat/recommended"],
    rules: {
      ...playwright.configs["flat/recommended"].rules,
      "@typescript-eslint/no-unused-vars": "error",
    },
  },
];

export default eslintConfig;

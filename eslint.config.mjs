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
      // Avoid hardcoded labels in component markup - only allow translation functions
      "react/jsx-no-literals": "error",
      // Consistently import navigation APIs from `@/i18n/navigation`
      "no-restricted-imports": [
        "error",
        {
          name: "next/link",
          message: "Please import from `@/i18n/navigation` instead.",
        },
        {
          name: "next/navigation",
          importNames: [
            "redirect",
            "permanentRedirect",
            "useRouter",
            "usePathname",
          ],
          message: "Please import from `@/i18n/navigation` instead.",
        },
      ],
      // Prevent untranslated string literals in JSX expression containers
      // Catches: {" "}, {""}, {' '}, {"actual content"}, {'text'} - all string literals
      // Excludes: JSX attributes (like d, viewBox, etc.) which are not user-facing text
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "JSXExpressionContainer[expression.type='Literal'][parent.type!='JSXAttribute']",
          message:
            "Untranslated string literals like {' '}, {''}, or {'text'} are not allowed. Use translation functions (t()) instead, or include spacing in translation strings.",
        },
      ],
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

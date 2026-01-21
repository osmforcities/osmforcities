// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import playwright from "eslint-plugin-playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const commonSrcRules = {
  "react/no-unescaped-entities": "off",
  "@typescript-eslint/no-unused-vars": "error",
  "react/jsx-no-literals": "error",
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
};

const eslintConfig = [...compat.extends("next/core-web-vitals", "next/typescript"), {
  ignores: [".next/*"],
}, {
  files: ["src/**/*.{ts,tsx}"],
  ignores: ["**/*.stories.tsx"],
  rules: {
    ...commonSrcRules,
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
}, {
  files: ["src/**/*.stories.tsx"],
  rules: {
    ...commonSrcRules,
  },
}, {
  files: ["tests/**/*.ts"],
  ...playwright.configs["flat/recommended"],
  rules: {
    ...playwright.configs["flat/recommended"].rules,
    "@typescript-eslint/no-unused-vars": "error",
  },
}, ...storybook.configs["flat/recommended"]];

export default eslintConfig;

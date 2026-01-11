import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": "off",
      "@typescript-eslint/no-unused-vars": "off",
      // Fix for config issue: explicitly configure rule with default options
      "@typescript-eslint/no-unused-expressions": ["error", {
        allowShortCircuit: false,
        allowTernary: false,
        allowTaggedTemplates: false
      }],
      "no-console": ["error", { "allow": ["warn", "error"] }],
    },
  },
  // Exception for logger.ts which needs console access internally
  {
    files: ["src/lib/logger.ts"],
    rules: {
      "no-console": "off",
    },
  }
);

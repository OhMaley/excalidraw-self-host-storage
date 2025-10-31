import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import jsxA11y from "eslint-plugin-jsx-a11y";
import prettierPlugin from "eslint-plugin-prettier";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
    globalIgnores(["dist", "node_modules"]),
    {
        files: ["**/*.{ts,tsx}"],
        ignores: ["dist", "node_modules"],
        plugins: {
            "jsx-a11y": jsxA11y,
            prettier: prettierPlugin,
            "react-hooks": reactHooks,
            "react-refresh": reactRefresh,
        },
        extends: [
            js.configs.recommended,
            tseslint.configs.recommendedTypeChecked,
            tseslint.configs.stylisticTypeChecked,
        ],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
            parserOptions: {
                project: ["./tsconfig.node.json", "./tsconfig.app.json"],
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            // Prettier formatting enforcement
            "prettier/prettier": [
                "warn",
                {
                    tabWidth: 4,
                    useTabs: false,
                    semi: true,
                    singleQuote: false,
                    trailingComma: "es5",
                    printWidth: 100,
                },
            ],

            // React-specific
            "react/react-in-jsx-scope": "off",
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "warn",

            // Accessibility
            ...jsxA11y.configs.recommended.rules,
        },
    },
]);

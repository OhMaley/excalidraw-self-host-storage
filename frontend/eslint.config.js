import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import jsxA11y from "eslint-plugin-jsx-a11y";
import prettierPlugin from "eslint-plugin-prettier";
import sonarjs from "eslint-plugin-sonarjs";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
    globalIgnores(["dist", "node_modules"]),
    reactHooks.configs.flat["recommended-latest"],
    {
        files: ["**/*.{ts,tsx}"],
        ignores: ["dist", "node_modules"],
        plugins: {
            "jsx-a11y": jsxA11y,
            prettier: prettierPlugin,
            "react-refresh": reactRefresh,
        },
        extends: [
            js.configs.recommended,
            tseslint.configs.recommendedTypeChecked,
            tseslint.configs.stylisticTypeChecked,
            sonarjs.configs.recommended,
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
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "warn",

            // Accessibility
            ...jsxA11y.configs.recommended.rules,

            // --- Code quality ---

            // Cyclomatic complexity (hard fail above 15, warn above 10)
            "complexity": ["warn", 10],

            // Function length
            "max-lines-per-function": ["warn", { max: 60, skipBlankLines: true, skipComments: true }],

            // Magic numbers — common numerics are whitelisted
            "@typescript-eslint/no-magic-numbers": ["warn", {
                ignore: [-1, 0, 1, 2, 10, 100, 1000],
                ignoreArrayIndexes: true,
                ignoreDefaultValues: true,
                ignoreClassFieldInitialValues: true,
                ignoreTypeIndexes: true,
                ignoreEnums: true,
            }],

            // SonarJS overrides — start in warn mode to avoid blocking PRs
            // while the team addresses existing violations
            "sonarjs/cognitive-complexity": ["warn", 15],
            "sonarjs/no-duplicate-string": ["warn", { threshold: 3 }],
        },
    },
]);
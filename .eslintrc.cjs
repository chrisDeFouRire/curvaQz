/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  ignorePatterns: ["node_modules", "dist", ".astro", "public"],
  overrides: [
    {
      files: ["*.ts", "*.tsx"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
      },
      settings: {
        react: {
          version: "detect"
        }
      },
      plugins: ["@typescript-eslint", "react"],
      extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:react/recommended",
        "plugin:react/jsx-runtime"
      ]
    },
    {
      files: ["*.astro"],
      parser: "astro-eslint-parser",
      parserOptions: {
        parser: "@typescript-eslint/parser",
        extraFileExtensions: [".astro"]
      },
      extends: [
        "eslint:recommended",
        "plugin:astro/recommended",
        "plugin:astro/jsx-a11y-recommended"
      ],
      rules: {
        "react/no-unknown-property": "off"
      }
    }
  ]
};

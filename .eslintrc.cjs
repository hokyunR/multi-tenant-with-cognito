/** @type {import("eslint").Linter.Config} */
module.exports = {
  env: { node: true },
  extends: ["eslint:recommended", "plugin:prettier/recommended"],
  ignorePatterns: ["!.prettierrc.cjs"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  overrides: [
    // Infra
    {
      env: { node: true, jest: true },
      files: ["infra/**/*.+(ts|tsx)"],
      extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "plugin:prettier/recommended"],
      plugins: ["@typescript-eslint"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: ["infra/tsconfig.json"],
        tsconfigRootDir: __dirname,
      },
    },

    // Client
    {
      env: { browser: true, es2020: true },
      files: ["client/**/*.+(ts|tsx)"],
      extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended-type-checked",
        "plugin:@typescript-eslint/stylistic",
        "plugin:react/recommended",
        "plugin:react/jsx-runtime",
        "plugin:react-hooks/recommended",
        "plugin:prettier/recommended",
      ],
      parser: "@typescript-eslint/parser",
      plugins: ["react-refresh"],
      rules: {
        "@typescript-eslint/no-misused-promises": "off",
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: ["client/tsconfig.json", "client/tsconfig.node.json"],
        tsconfigRootDir: __dirname,
      },
      settings: {
        react: {
          version: "detect",
        },
      },
    },

    // Server
    {
      env: { node: true, jest: true },
      files: ["server/**/*.+(ts|tsx)"],
      extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "plugin:prettier/recommended"],
      plugins: ["@typescript-eslint"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: ["server/tsconfig.json"],
        tsconfigRootDir: __dirname,
      },
    },
  ],
  rules: {
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        varsIgnorePattern: "^_",
        argsIgnorePattern: "^_",
      },
    ],
  },
}

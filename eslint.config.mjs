import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "next-env.d.ts",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // Money and scores must never pass through JavaScript floats.
    // Use the helpers in src/domain/money.ts (decimal.js) instead.
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-globals": [
        "error",
        {
          name: "parseFloat",
          message: "Use Decimal from src/domain/money.ts for money and scores.",
        },
      ],
      "no-restricted-properties": [
        "error",
        {
          object: "Number",
          property: "parseFloat",
          message: "Use Decimal from src/domain/money.ts for money and scores.",
        },
      ],
    },
  },
];

export default config;

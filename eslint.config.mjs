import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Plain-JS port of the WebGL globe.
    "src/components/globe/engine.js",
  ]),
  {
    rules: {
      // Effects here sync with browser-only state (storage, timezone, animation clocks) after mount.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;

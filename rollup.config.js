import babel from "rollup-plugin-babel";
import ts from "rollup-plugin-typescript2";
import replace from "@rollup/plugin-replace";

import pkg from "./package.json";

const PLUGINS = [
  ts({
    useTsconfigDeclarationDir: true,
  }),
  babel({
    extensions: [".ts", ".js", ".tsx", ".jsx"],
  }),
  replace({
    _VERSION: JSON.stringify(pkg.version),
  }),
];

export default [
  {
    input: "src/index.ts",
    output: [
      { file: pkg.main, format: "cjs" },
      { file: pkg.module, format: "es" },
    ],
    plugins: PLUGINS,
    external: [
      "bignumber.js",
      "jiff-mpc/lib/jiff-client.js",
      "jiff-mpc/lib/ext/jiff-client-bignumber.js",
    ],
  },
];

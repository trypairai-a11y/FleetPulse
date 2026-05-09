/**
 * eslint-plugin-local-rules entry point. Each key under `rules` exposes
 * a custom rule under the `local-rules/<name>` namespace in `.eslintrc.js`.
 *
 * To add a new rule: drop a `<name>.js` file beside this index, then add
 * `"<name>": require("./<name>")` below.
 */

"use strict";

module.exports = {
  rules: {
    "no-prisma-without-tenant": require("./no-prisma-without-tenant"),
  },
};

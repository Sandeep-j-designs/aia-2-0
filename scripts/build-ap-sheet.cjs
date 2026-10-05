/*
  Splits public/ap/index.html — the bills review sheet, a single-file app — into
  the three assets the inbox loads into its own document.

      node scripts/build-ap-sheet.cjs

  The split itself lives in scripts/lib/build-sheet.cjs, shared with the AR
  sheet: the two are siblings, and the transform is the same transform. Read
  that file for what it does and why an iframe was not an option.
*/
const { buildSheet } = require("./lib/build-sheet.cjs");

buildSheet({
  slug: "ap",
  builder: "scripts/build-ap-sheet.cjs",
  versionFile: "components/inbox/v2/ap-sheet-version.ts",
  versionConst: "AP_SHEET_VERSION",
});

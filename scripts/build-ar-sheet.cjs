/*
  Splits public/ar/index.html — the sales invoice sheet, a single-file app —
  into the three assets the inbox loads into its own document.

      node scripts/build-ar-sheet.cjs

  The split itself lives in scripts/lib/build-sheet.cjs, shared with the AP
  sheet: the two are siblings, and the transform is the same transform. Read
  that file for what it does and why an iframe was not an option.
*/
const { buildSheet } = require("./lib/build-sheet.cjs");

buildSheet({
  slug: "ar",
  builder: "scripts/build-ar-sheet.cjs",
  versionFile: "components/inbox/v2/ar-sheet-version.ts",
  versionConst: "AR_SHEET_VERSION",
});

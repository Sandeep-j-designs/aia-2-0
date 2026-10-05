/**
 * Keep validation output separate from the running development server.
 *
 * The GitHub Pages build sets NEXT_PUBLIC_BASE_PATH (the repo name) and turns on
 * the static export. Local `next dev` sets neither, so it still serves at "/".
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  ...(process.env.NEXT_STATIC_EXPORT === "1"
    ? { output: "export", trailingSlash: true }
    : {}),
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
  images: { unoptimized: true },
};

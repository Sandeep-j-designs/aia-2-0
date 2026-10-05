/**
 * Where this build is served from — "" in `next dev`, the repo name on Pages.
 *
 * Anything Next routes for us (pages, next/link, imported CSS, an optimised
 * next/image) already carries the base path. Everything addressed by hand does
 * not: a string starting with "/" is the domain root, which on Pages is one
 * level above the site. That gap has now broken two things — the logo, and the
 * AP/AR sheets, whose markup fetch landed on GitHub's own 404 page and got
 * injected into the review pane as the document body.
 *
 * So: any URL to a file in public/ goes through `asset()`, and the base path
 * is read in exactly one place.
 */
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** Prefix a root-absolute public/ path with the deployment's base path. */
export const asset = (path: string) => `${basePath}${path}`;

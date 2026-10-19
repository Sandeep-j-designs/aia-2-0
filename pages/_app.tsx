import "@/styles/globals.css";
import "@/styles/sheet-bridge.css";
import "@/styles/form-workspace.css";
import "@/styles/dialog-workspace.css";
import "@/styles/bill-form.css";
import "@/styles/bill-refinement.css";
import "@/styles/neo-workspace.css";
import type { AppProps } from "next/app";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import GuideProvider from "@/components/guide/guide-provider";
import NeoProvider from "@/components/neo/provider";
import NeoShell from "@/components/neo/shell";
import NeoPanel from "@/components/neo";
import NeoPresence from "@/components/neo/presence";

// Type families (SIL OFL), bundled locally so builds never fetch fonts.
// Open Sans (variable, 300–800) is the one UI family — text, headings and
// figures (tabular numerals). IBM Plex Mono stays for voucher and invoice
// IDs only, where fixed-width digits are the point. (4 Oct 2026; was IBM
// Plex Sans + Space Grotesk.)
const openSans = localFont({
  src: "../public/fonts/open-sans-latin.woff2",
  weight: "300 800",
  display: "swap",
});
const plexMono = localFont({
  src: [
    {
      path: "../public/fonts/ibm-plex-mono-latin-400-normal.woff2",
      weight: "400",
    },
    {
      path: "../public/fonts/ibm-plex-mono-latin-500-normal.woff2",
      weight: "500",
    },
    {
      path: "../public/fonts/ibm-plex-mono-latin-600-normal.woff2",
      weight: "600",
    },
  ],
  display: "swap",
});
// Source Serif 4 is Neo's reading voice (19 Oct 2026): its answers are set
// apart from the UI the way a chat assistant's are, in a text face built for
// long reading. The latin-ext cut is a second family only for ₹, which the
// latin cut lacks.
const sourceSerif = localFont({
  src: [
    {
      path: "../public/fonts/source-serif-4-latin-wght-normal.woff2",
      weight: "200 900",
      style: "normal",
    },
    {
      path: "../public/fonts/source-serif-4-latin-wght-italic.woff2",
      weight: "200 900",
      style: "italic",
    },
  ],
  display: "swap",
});
const sourceSerifExt = localFont({
  src: "../public/fonts/source-serif-4-latin-ext-wght-normal.woff2",
  weight: "200 900",
  display: "swap",
});

/**
 * PROTOTYPE STUB — mirrors pages/_app.tsx in aiaccountant-app.
 *
 * Production additionally mounts SessionProvider, QueryClientProvider,
 * EnvProvider, GuideProvider and the app-effects (AuthEffects, SetupGuard,
 * AppConfigPoller, AblyNotifications, UserCompaniesSync, BillingAccessGuard)
 * plus the global BulkUpload modal. None of those are needed to render a
 * screen, so they are omitted here.
 *
 * On handoff this file is DISCARDED — the real _app.tsx already provides the
 * font wrapper and the Toaster.
 */
export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={openSans.className}>
      <style jsx global>{`
        :root {
          --font-family-primary:
            ${openSans.style.fontFamily}, -apple-system, "Segoe UI", system-ui,
            sans-serif;
          --font-family-display: ${openSans.style.fontFamily};
          --font-family-mono: ${plexMono.style.fontFamily};
          --font-family-reading:
            ${sourceSerif.style.fontFamily}, ${sourceSerifExt.style.fontFamily},
            Georgia, serif;
        }
      `}</style>
      {/* GuideProvider is mounted in production's _app.tsx too — a journey
          outlives the route it starts on, so it cannot live inside one. */}
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        storageKey="aia-theme"
        disableTransitionOnChange
      >
        <GuideProvider>
          <NeoProvider>
            <NeoShell>
              <Component {...pageProps} />
            </NeoShell>
            <NeoPanel />
            <NeoPresence />
          </NeoProvider>
        </GuideProvider>
        <Toaster position="bottom-right" closeButton />
      </ThemeProvider>
    </div>
  );
}

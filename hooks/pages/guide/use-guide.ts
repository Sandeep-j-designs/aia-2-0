import { useContext } from "react";
import { GuideContext, type GuideApi } from "@/components/guide/guide-provider";

/**
 * Reaches the guide from anywhere under the provider.
 *
 * Returns a no-op API rather than throwing when the provider is absent: a
 * screen rendered outside it — a sheet in isolation, a test — should still
 * render, and a Guide button that does nothing is a better failure than a
 * blank page.
 */
const NOOP: GuideApi = {
  openLauncher: () => {},
  startJourney: () => {},
  activeJourney: null,
};

export const useGuide = (): GuideApi => useContext(GuideContext) ?? NOOP;

export default useGuide;

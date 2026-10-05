import { useCallback, useMemo, useState } from "react";
import type { InboxItem } from "@/types/pages/inbox";

/**
 * Gating rules for the AP bill review surface. Ported from the touched/flagged
 * logic in js/native-ap.jsx.
 *
 * Two independent things can hold Approve shut, and they unblock differently:
 *
 *  1. **Low-confidence fields.** Every flagged field must be touched. Not
 *     corrected — touched. The accountant is being asked to look at the value,
 *     and most of the time it is right; demanding an edit would just make them
 *     retype what is already there.
 *
 *  2. **A hard duplicate.** The bill matches one already posted. Approve stays
 *     shut until a key identifying field changes — voucher no, supplier invoice
 *     no, or amount — because those are what made it a duplicate.
 */
export const useBillReview = (item: InboxItem) => {
  const flagged = useMemo(() => item.bill?.flagged ?? [], [item.bill]);

  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [duplicateResolved, setDuplicateResolved] = useState(false);

  const touchField = useCallback((field: string) => {
    setTouched((prev) => {
      if (prev.has(field)) return prev;
      const next = new Set(prev);
      next.add(field);
      return next;
    });
  }, []);

  /** Editing a key identifying field is what clears a hard-duplicate block. */
  const resolveDuplicate = useCallback(() => setDuplicateResolved(true), []);

  const allFlaggedTouched = flagged.every((field) => touched.has(field));
  const isDuplicateBlocked =
    item.status === "duplicate-hard" && !duplicateResolved;

  const approveDisabled =
    isDuplicateBlocked || (flagged.length > 0 && !allFlaggedTouched);

  return {
    flagged,
    touched,
    touchField,
    resolveDuplicate,
    allFlaggedTouched,
    isDuplicateBlocked,
    approveDisabled,
    isFlagged: (field: string) => flagged.includes(field),
  };
};

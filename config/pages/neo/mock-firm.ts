import type { FirmRest } from "@/types/pages/neo/brief";

/**
 * The firm beyond the two companies this prototype has books for. The brief
 * shows them as one line, because the point it makes — most clients need
 * nothing today — is the point of ranking the rest. Nothing here is drawn as
 * if it were a live client: no names, no amounts, no row that opens.
 *
 * DEV: GET /api/neo/brief returns every client the user can see; this file
 * and the line it feeds are deleted.
 */
export const MOCK_FIRM_REST: FirmRest = {
  clients: 29,
  note: "Queues clear or within auto-approve trust",
};

/**
 * The return the brief counts down to. GSTR-3B for September is due on
 * 20 October for monthly filers.
 */
export const BRIEF_DEADLINE = {
  label: "GSTR-3B",
  period: "September",
  due: "2026-10-20",
};

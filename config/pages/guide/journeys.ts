import {
  Banknote,
  Inbox,
  ShoppingBag,
  ShoppingCart,
  Upload,
} from "@/components/icons";
import type { Journey } from "@/types/pages/guide";
import { INBOX_TOUR } from "./inbox-tour";

/**
 * The journeys the Guide button offers.
 *
 * Inbox leads because it is the new one and the only one scripted here — the
 * other four are production's existing journeys, carried so the launcher reads
 * as the same dialog a user already knows. Their `complete` flags are the
 * seeded state of an account that has been through onboarding.
 *
 * DEV: replace with the guide service's journey list for the signed-in user.
 * Completion comes back per journey; nothing here is client-derived.
 */
export const JOURNEYS: Journey[] = [
  {
    id: "inbox",
    title: "Inbox",
    description: "Send in a document and approve it",
    icon: Inbox,
    art: "inbox",
    steps: INBOX_TOUR,
    complete: false,
  },
  {
    id: "purchases",
    title: "Purchases",
    description: "Record a purchase bill",
    icon: ShoppingBag,
    art: "list",
    steps: [],
    complete: true,
  },
  {
    id: "banking",
    title: "Banking",
    description: "Reconcile your bank",
    icon: Banknote,
    art: "ledger",
    steps: [],
    complete: true,
  },
  {
    id: "sales",
    title: "Sales",
    description: "Create and send a sales invoice",
    icon: ShoppingCart,
    art: "form",
    steps: [],
    complete: true,
  },
  {
    id: "sales-upload",
    title: "Sales Upload",
    description: "Upload sales invoices",
    icon: Upload,
    art: "upload",
    steps: [],
    complete: true,
  },
];

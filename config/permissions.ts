import type { PermissionKey } from "../types/permissions";

/**
 * Permission constants across modules.
 * Source of truth — all other files derive from this.
 */
export const PERMISSIONS = {
  DASHBOARD_VIEW: "dashboard:view",
  BANKING_VIEW: "banking:view",
  BANKING_UPLOAD: "banking:upload",
  BANKING_MANAGE_CONNECTION: "banking:manage_connection",
  BANKING_DATA_FETCH: "banking:data_fetch",
  BANKING_EDIT: "banking:edit",
  BANKING_DELETE: "banking:delete",
  BILLS_VIEW: "bills:view",
  BILLS_CREATE: "bills:create",
  BILLS_EDIT: "bills:edit",
  BILLS_DELETE: "bills:delete",
  INVOICES_VIEW: "invoices:view",
  INVOICES_CREATE: "invoices:create",
  INVOICES_EDIT: "invoices:edit",
  INVOICES_DELETE: "invoices:delete",
  TRANSACTIONS_VIEW: "transactions:view",
  TRANSACTIONS_EDIT: "transactions:edit",
  TRANSACTIONS_MARK_READY: "transactions:mark_ready",
  STATEMENTS_VIEW: "statements:view",
  STATEMENTS_UPLOAD: "statements:upload",
  STATEMENTS_DELETE: "statements:delete",
  JOURNAL_VOUCHERS_VIEW: "journal_vouchers:view",
  JOURNAL_VOUCHERS_CREATE: "journal_vouchers:create",
  JOURNAL_VOUCHERS_EDIT: "journal_vouchers:edit",
  JOURNAL_VOUCHERS_DELETE: "journal_vouchers:delete",
  CONFIGURATION_VIEW: "configuration:view",
  CONFIGURATION_EDIT: "configuration:edit",
  SYNC_MANAGEMENT_VIEW: "sync_management:view",
  SYNC_MANAGEMENT_EDIT: "sync_management:edit",
  USERS_VIEW: "users:view",
  USERS_INVITE: "users:invite",
  USERS_EDIT_PERMISSIONS: "users:edit_permissions",
  USERS_REMOVE: "users:remove",
  GSTR_VIEW: "gstr:view",
  GSTR_CREATE: "gstr:create",
  GSTR_EDIT: "gstr:edit",
  GSTR_DELETE: "gstr:delete",
  TAX_COMPLIANCE_VIEW: "tax_compliance:view",
  TAX_COMPLIANCE_CREATE: "tax_compliance:create",
  TAX_COMPLIANCE_EDIT: "tax_compliance:edit",
  TAX_COMPLIANCE_DELETE: "tax_compliance:delete",
  COA_VIEW: "coa:view",
  COA_CREATE: "coa:create",
  COA_EDIT: "coa:edit",
  COA_DELETE: "coa:delete",
  INVENTORY_VIEW: "inventory:view",
  INVENTORY_CREATE: "inventory:create",
  INVENTORY_EDIT: "inventory:edit",
  INVENTORY_DELETE: "inventory:delete",
} as const;

/**
 * Human-readable display names for each permission key.
 * Used in audit logs, permission history, and other user-facing surfaces.
 */
export const PERMISSION_LABELS: Record<string, string> = {
  [PERMISSIONS.DASHBOARD_VIEW]: "Dashboard View",
  [PERMISSIONS.BANKING_VIEW]: "Banking View",
  [PERMISSIONS.BANKING_UPLOAD]: "Banking Upload",
  [PERMISSIONS.BANKING_MANAGE_CONNECTION]: "Banking Manage Connection",
  [PERMISSIONS.BANKING_DATA_FETCH]: "Banking Data Fetch",
  [PERMISSIONS.BANKING_EDIT]: "Banking Edit",
  [PERMISSIONS.BANKING_DELETE]: "Banking Delete",
  [PERMISSIONS.BILLS_VIEW]: "Bills View",
  [PERMISSIONS.BILLS_CREATE]: "Bills Create",
  [PERMISSIONS.BILLS_EDIT]: "Bills Edit",
  [PERMISSIONS.BILLS_DELETE]: "Bills Delete",
  [PERMISSIONS.INVOICES_VIEW]: "Invoices View",
  [PERMISSIONS.INVOICES_CREATE]: "Invoices Create",
  [PERMISSIONS.INVOICES_EDIT]: "Invoices Edit",
  [PERMISSIONS.INVOICES_DELETE]: "Invoices Delete",
  [PERMISSIONS.TRANSACTIONS_VIEW]: "Transactions View",
  [PERMISSIONS.TRANSACTIONS_EDIT]: "Transactions Edit",
  [PERMISSIONS.TRANSACTIONS_MARK_READY]: "Transactions Mark Ready",
  [PERMISSIONS.STATEMENTS_VIEW]: "Statements View",
  [PERMISSIONS.STATEMENTS_UPLOAD]: "Statements Upload",
  [PERMISSIONS.STATEMENTS_DELETE]: "Statements Delete",
  [PERMISSIONS.JOURNAL_VOUCHERS_VIEW]: "Journal Vouchers View",
  [PERMISSIONS.JOURNAL_VOUCHERS_CREATE]: "Journal Vouchers Create",
  [PERMISSIONS.JOURNAL_VOUCHERS_EDIT]: "Journal Vouchers Edit",
  [PERMISSIONS.JOURNAL_VOUCHERS_DELETE]: "Journal Vouchers Delete",
  [PERMISSIONS.CONFIGURATION_VIEW]: "Configuration View",
  [PERMISSIONS.CONFIGURATION_EDIT]: "Configuration Edit",
  [PERMISSIONS.SYNC_MANAGEMENT_VIEW]: "Sync Management View",
  [PERMISSIONS.SYNC_MANAGEMENT_EDIT]: "Sync Management Edit",
  [PERMISSIONS.USERS_VIEW]: "Users View",
  [PERMISSIONS.USERS_INVITE]: "Users Invite",
  [PERMISSIONS.USERS_EDIT_PERMISSIONS]: "Users Edit Permissions",
  [PERMISSIONS.USERS_REMOVE]: "Users Remove",
  [PERMISSIONS.GSTR_VIEW]: "GSTR View",
  [PERMISSIONS.GSTR_CREATE]: "GSTR Create",
  [PERMISSIONS.GSTR_EDIT]: "GSTR Edit",
  [PERMISSIONS.GSTR_DELETE]: "GSTR Delete",
  [PERMISSIONS.TAX_COMPLIANCE_VIEW]: "Tax Compliance View",
  [PERMISSIONS.TAX_COMPLIANCE_CREATE]: "Tax Compliance Create",
  [PERMISSIONS.TAX_COMPLIANCE_EDIT]: "Tax Compliance Edit",
  [PERMISSIONS.TAX_COMPLIANCE_DELETE]: "Tax Compliance Delete",
  [PERMISSIONS.COA_VIEW]: "Chart of Accounts View",
  [PERMISSIONS.COA_CREATE]: "Chart of Accounts Create",
  [PERMISSIONS.COA_EDIT]: "Chart of Accounts Edit",
  [PERMISSIONS.COA_DELETE]: "Chart of Accounts Delete",
  [PERMISSIONS.INVENTORY_VIEW]: "Inventory View",
  [PERMISSIONS.INVENTORY_CREATE]: "Inventory Create",
  [PERMISSIONS.INVENTORY_EDIT]: "Inventory Edit",
  [PERMISSIONS.INVENTORY_DELETE]: "Inventory Delete",
} as const;

/**
 * Audit log action constants.
 * Used in API routes and frontend components — no raw strings.
 */
export const AUDIT_ACTIONS = {
  USER_ADDED: "user.added",
  USER_INVITED: "user.invited",
  USER_DEACTIVATED: "user.deactivated",
  USER_REACTIVATED: "user.reactivated",
  INVITE_ACCEPTED: "invite.accepted",
  INVITE_REVOKED: "invite.revoked",
  INVITE_RESENT: "invite.resent",
  PERMISSIONS_CHANGED: "permissions.changed",
} as const;

/** Human-readable labels for audit actions. */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  [AUDIT_ACTIONS.USER_ADDED]: "Added to organisation",
  [AUDIT_ACTIONS.USER_INVITED]: "Invited",
  [AUDIT_ACTIONS.USER_DEACTIVATED]: "Deactivated",
  [AUDIT_ACTIONS.USER_REACTIVATED]: "Reactivated",
  [AUDIT_ACTIONS.INVITE_ACCEPTED]: "Accepted invitation",
  [AUDIT_ACTIONS.INVITE_REVOKED]: "Invitation revoked",
  [AUDIT_ACTIONS.INVITE_RESENT]: "Invitation resent",
  [AUDIT_ACTIONS.PERMISSIONS_CHANGED]: "Permissions updated",
};

/**
 * Route → Permission mapping for Middleware (PEP Layer 1).
 * Maps top-level routes to the permission(s) required to access them.
 */
export const ROUTE_PERMISSION_MAP: Record<string, PermissionKey> = {
  "/dashboard": PERMISSIONS.DASHBOARD_VIEW,
  "/bank": PERMISSIONS.BANKING_VIEW,
  "/accounting-masters/ledger": PERMISSIONS.COA_VIEW,
  "/accounting-masters": PERMISSIONS.COA_VIEW,
  "/inventory-masters": PERMISSIONS.INVENTORY_VIEW,
  "/accounts-payable": PERMISSIONS.BILLS_VIEW,
  "/accounts-receivable": PERMISSIONS.INVOICES_VIEW,
  "/transactions": PERMISSIONS.BANKING_VIEW,
  "/statements": PERMISSIONS.BANKING_VIEW,
  "/journal-voucher": PERMISSIONS.JOURNAL_VOUCHERS_VIEW,
  "/configuration/integration": PERMISSIONS.CONFIGURATION_EDIT,
  "/configuration": PERMISSIONS.CONFIGURATION_VIEW,
  "/sync-management": PERMISSIONS.SYNC_MANAGEMENT_VIEW,
  "/team": PERMISSIONS.USERS_VIEW,
  "/gst-reconciliation": PERMISSIONS.GSTR_VIEW,
  "/tax-and-compliance": PERMISSIONS.TAX_COMPLIANCE_VIEW,
} as const;

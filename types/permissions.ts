import { PERMISSIONS } from "../config/permissions";

/** Union type of all permission string values */
export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Partial record mapping permission keys to booleans */
export type UserPermissions = Partial<Record<PermissionKey, boolean>>;

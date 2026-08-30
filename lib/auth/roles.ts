/**
 * Role authorization utilities for the U-Track platform.
 *
 * Implements role hierarchy and permission checking per Requirements 3.1, 3.4, 3.5, 3.6.
 */

/** The four supported user roles in the platform */
export type UserRole = 'Admin' | 'SchoolStaff' | 'PsgVolunteer' | 'Parent'

/** Array of valid role strings for validation purposes */
export const VALID_ROLES: readonly UserRole[] = [
  'Admin',
  'SchoolStaff',
  'PsgVolunteer',
  'Parent',
] as const

/**
 * Role hierarchy levels. Higher number = more permissions.
 * Admin (4) > SchoolStaff (3) > PsgVolunteer (2) > Parent (1)
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  Admin: 4,
  SchoolStaff: 3,
  PsgVolunteer: 2,
  Parent: 1,
}

/** Endpoint categories representing groupings of API functionality */
export type EndpointCategory =
  | 'userManagement'
  | 'inventory'
  | 'csv'
  | 'csvUpload'
  | 'csvApprove'
  | 'collection'
  | 'donationDrives'
  | 'ownProfile'
  | 'donationHistory'
  | 'analytics'
  | 'reports'
  | 'health'

/**
 * Mapping of endpoint categories to the minimum role required for access.
 * Admin can access all endpoints (hierarchy level 4 covers everything).
 * SchoolStaff can access inventory, analytics, and reports.
 * PsgVolunteer can access collection, donation drives, and CSV uploads.
 * Parent can access only own profile and donation history.
 */
export const CATEGORY_PERMISSIONS: Record<EndpointCategory, RoutePermission> = {
  userManagement: { allowedRoles: ['Admin'] },
  inventory: { minRole: 'SchoolStaff' },
  csv: { minRole: 'PsgVolunteer' },
  csvUpload: { minRole: 'PsgVolunteer' },
  csvApprove: { allowedRoles: ['Admin'] },
  collection: { minRole: 'PsgVolunteer' },
  donationDrives: { minRole: 'PsgVolunteer' },
  ownProfile: { minRole: 'Parent' },
  donationHistory: { minRole: 'Parent' },
  analytics: { minRole: 'SchoolStaff' },
  reports: { minRole: 'SchoolStaff' },
  health: {}, // public, no auth required
}

/** Permission configuration for a route or endpoint */
export interface RoutePermission {
  /** If set, the user must have at least this role level in the hierarchy */
  minRole?: UserRole
  /** If set, the user must have one of these specific roles (overrides minRole) */
  allowedRoles?: UserRole[]
}

/**
 * Validates that a string is exactly one of the four supported user roles.
 *
 * @param value - The string to validate
 * @returns True if the value is a valid UserRole, with type narrowing
 */
export function isValidRole(value: string): value is UserRole {
  return (VALID_ROLES as readonly string[]).includes(value)
}

/**
 * Checks whether a user with the given role has permission according to the
 * specified route permission configuration.
 *
 * - If `permission.allowedRoles` is defined, checks membership in that list.
 * - If `permission.minRole` is defined, checks the user's hierarchy level.
 * - If neither is specified, access is granted (public route).
 *
 * @param userRole - The role of the requesting user
 * @param permission - The permission requirements for the route
 * @returns True if the user has sufficient permission
 */
export function hasPermission(
  userRole: UserRole,
  permission: RoutePermission
): boolean {
  if (permission.allowedRoles) {
    return permission.allowedRoles.includes(userRole)
  }
  if (permission.minRole) {
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[permission.minRole]
  }
  return true
}

/**
 * Convenience function to check if a user role meets the minimum required role.
 * Returns false for invalid roles.
 *
 * @param role - The user's role (from JWT or header)
 * @param minRole - The minimum required role for the operation
 * @returns True if the role is valid and meets the minimum requirement
 */
export function requireRole(role: string | null, minRole: UserRole): boolean {
  if (!role || !isValidRole(role)) {
    return false
  }
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole]
}

/**
 * Auth utilities to make working with authentication easier
 */

/**
 * Redirects the user to the login page
 * @param returnPath Optional path to redirect back to after login
 */
export const redirectToLogin = (returnPath?: string) => {
  if (typeof window !== 'undefined') {
    const returnUrl = returnPath || window.location.pathname;
    window.location.href = `/login?returnUrl=${encodeURIComponent(returnUrl)}`;
  }
};

/**
 * Format a role for display
 * @param role User role from the database
 * @returns Formatted role string
 */
export const formatRole = (role: string): string => {
  return role.charAt(0).toUpperCase() + role.slice(1);
};

/**
 * Check if a user has admin privileges
 * @param userRole The user's role
 * @returns Boolean indicating if the user is an admin
 */
export const isAdmin = (userRole?: string): boolean => {
  return userRole === 'admin';
};

/**
 * Check if a user is authenticated
 * @param session The user's session
 * @returns Boolean indicating if the user is authenticated
 */
export const isAuthenticated = (session: any): boolean => {
  return !!session?.user;
}; 
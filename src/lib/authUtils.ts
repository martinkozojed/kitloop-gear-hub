import { logger } from './logger';

/**
 * Check if a user is logged in by examining localStorage
 */
export function isUserLoggedIn(): boolean {
  const userStr = localStorage.getItem('kitloop_user');
  if (!userStr) return false;
  
  try {
    const user = JSON.parse(userStr);
    return !!user?.isLoggedIn;
  } catch (error) {
    logger.error('Error checking auth status', error);
    return false;
  }
}

/**
 * Get current user data from localStorage
 */
export function getCurrentUser() {
  const userStr = localStorage.getItem('kitloop_user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch (error) {
    logger.error('Error getting user data', error);
    return null;
  }
}

/**
 * Clear user session (logout)
 */
export function logoutUser() {
  localStorage.removeItem('kitloop_user');
}

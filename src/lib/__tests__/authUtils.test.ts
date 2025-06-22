import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isUserLoggedIn, getCurrentUser, logoutUser } from '../authUtils';

const STORAGE_KEY = 'kitloop_user';

describe('authUtils', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('isUserLoggedIn returns false when no user is stored', () => {
    expect(isUserLoggedIn()).toBe(false);
  });

  it('isUserLoggedIn returns true when a logged-in user is saved', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ isLoggedIn: true }));
    expect(isUserLoggedIn()).toBe(true);
  });

  it('getCurrentUser parses stored user correctly', () => {
    const user = { name: 'Alice', isLoggedIn: true };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    expect(getCurrentUser()).toEqual(user);
  });

  it('getCurrentUser returns null on malformed data', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json');
    expect(getCurrentUser()).toBeNull();
  });

  it('logoutUser clears the stored user', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ isLoggedIn: true }));
    logoutUser();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

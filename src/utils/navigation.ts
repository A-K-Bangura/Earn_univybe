/**
 * Full-page redirect for code that runs outside React (the axios 401 handler).
 * A separate function so tests can observe it; jsdom can't navigate.
 */
export const redirectTo = (path: string): void => {
  window.location.href = path;
};

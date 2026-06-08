/**
 * API base URL helper.
 *
 * On Replit (dev + deployed):  VITE_API_BASE_URL is not set → '' → calls go to /api/...
 * On VPS:  set VITE_API_BASE_URL=https://yourdomain.com before `pnpm run build`
 *          → calls go to https://yourdomain.com/api/...
 *
 * Usage:  fetch(`${API_BASE}/api/odds/all`)
 */
export const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

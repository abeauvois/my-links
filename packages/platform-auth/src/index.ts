/**
 * Platform Auth Package
 * Shared authentication infrastructure for the platform monorepo
 */

export { createAuth } from './createAuth.js';
export { createAuthMiddleware } from './authMiddleware.js';
export type { AuthSession } from './authMiddleware.js';

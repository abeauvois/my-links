import { createMiddleware } from 'hono/factory';

interface AuthSession {
    user: {
        id: string;
        email: string;
        name: string;
        [key: string]: any;
    };
    session: {
        id: string;
        userId: string;
        expiresAt: Date;
        [key: string]: any;
    };
}

/**
 * Creates an authentication middleware for Hono
 * Validates session and attaches user/session to context
 * 
 * @param auth - Better-auth instance
 * @returns Hono middleware function
 */
export function createAuthMiddleware(auth: any) {
    return createMiddleware(async (c, next) => {
        const session = await auth.api.getSession({ headers: c.req.raw.headers });

        if (!session) {
            return c.json({ error: 'Unauthorized' }, 401);
        }

        c.set('user', session.user);
        c.set('session', session.session);
        return next();
    });
}

export type { AuthSession };

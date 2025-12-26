import type { ILogger } from '../types.js';

export interface BaseClientConfig {
    baseUrl: string;
    sessionToken?: string;
    logger: ILogger;
}

/**
 * Base client with shared authentication logic and token management
 */
export class BaseClient {
    protected baseUrl: string;
    protected sessionToken?: string;
    protected logger: ILogger;

    constructor(config: BaseClientConfig) {
        this.baseUrl = config.baseUrl;
        this.sessionToken = config.sessionToken;
        this.logger = config.logger;
    }

    /**
     * Update session token for authenticated requests
     */
    setSessionToken(token: string): void {
        this.sessionToken = token;
    }

    /**
     * Clear session token
     */
    clearSessionToken(): void {
        this.sessionToken = undefined;
    }

    /**
     * Get current session token
     */
    getSessionToken(): string | undefined {
        return this.sessionToken;
    }

    /**
     * Make an authenticated request
     * Requires sessionToken to be set
     */
    protected async authenticatedRequest<T>(endpoint: string, options: RequestInit): Promise<T> {
        if (!this.sessionToken) {
            throw new Error('Authentication required. Please sign in first.');
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `better-auth.session_token=${this.sessionToken}`,
                ...options.headers,
            },
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new Error('Authentication failed. Please sign in again.');
            }
            throw new Error(`Request failed: ${response.statusText}`);
        }

        // Handle empty responses (e.g., DELETE requests)
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            return undefined as T;
        }

        return await response.json() as T;
    }

    /**
     * Extract session token from Set-Cookie header
     */
    protected extractSessionTokenFromHeaders(response: Response): string | null {
        const setCookie = response.headers.get('set-cookie');
        if (!setCookie) return null;

        // Parse session token from better-auth cookie (includes signature)
        const match = /better-auth\.session_token=([^;]+)/.exec(setCookie);
        return match ? decodeURIComponent(match[1]) : null;
    }
}

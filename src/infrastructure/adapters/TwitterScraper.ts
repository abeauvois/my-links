import { ITweetScraper } from '../../domain/ports/ITweetScraper.js';

/**
 * Adapter: Implements tweet scraping using Twitter API v2 with Bearer Token
 * Includes rate limit handling and retry logic
 */
export class TwitterScraper implements ITweetScraper {
    private readonly tweetCache: Map<string, string> = new Map();
    private rateLimitResetTime: number = 0;

    constructor(private readonly bearerToken: string) { }

    /**
     * Get the rate limit reset time in milliseconds
     */
    getRateLimitResetTime(): number {
        return this.rateLimitResetTime;
    }

    /**
     * Check if currently rate limited
     */
    isRateLimited(): boolean {
        return this.rateLimitResetTime > Date.now();
    }

    async fetchTweetContent(url: string): Promise<string | null> {
        try {
            // If it's a t.co link, resolve it first
            let resolvedUrl = url;
            if (url.includes('t.co/')) {
                console.log(`  🔗 Resolving t.co shortened URL...`);
                const resolved = await this.resolveShortUrl(url);
                if (resolved) {
                    resolvedUrl = resolved;
                    console.log(`  ✓ Resolved to: ${resolvedUrl}`);
                } else {
                    console.log(`  ⚠️  Could not resolve t.co URL`);
                    return null;
                }
            }

            // Extract tweet ID from URL
            const tweetId = this.extractTweetId(resolvedUrl);
            if (!tweetId) {
                console.log(`  ⚠️  Could not extract tweet ID from URL: ${resolvedUrl}`);
                return null;
            }

            // Check cache first
            if (this.tweetCache.has(tweetId)) {
                console.log(`  💾 Using cached tweet content`);
                return this.tweetCache.get(tweetId)!;
            }

            // Check if we're rate limited
            const now = Date.now();
            if (this.rateLimitResetTime > now) {
                const waitSeconds = Math.ceil((this.rateLimitResetTime - now) / 1000);
                console.log(`  ⏳ Rate limited. Skipping (resets in ${waitSeconds}s)`);
                return null;
            }

            // Fetch with retry logic
            const content = await this.fetchWithRetry(tweetId);

            // Cache successful result
            if (content) {
                this.tweetCache.set(tweetId, content);
            }

            return content;
        } catch (error) {
            console.error(`  ⚠️  Error fetching tweet: ${error instanceof Error ? error.message : error}`);
            return null;
        }
    }

    private async fetchWithRetry(tweetId: string, maxRetries: number = 2): Promise<string | null> {
        const apiUrl = `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=text,author_id,created_at`;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                // Add delay between retries
                if (attempt > 0) {
                    const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                    console.log(`  ⏳ Retry ${attempt}/${maxRetries} after ${delayMs}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }

                const response = await fetch(apiUrl, {
                    headers: {
                        'Authorization': `Bearer ${this.bearerToken}`,
                    },
                });

                // Handle rate limiting
                if (response.status === 429) {
                    const resetTime = response.headers.get('x-rate-limit-reset');
                    if (resetTime) {
                        this.rateLimitResetTime = parseInt(resetTime) * 1000;
                        const waitSeconds = Math.ceil((this.rateLimitResetTime - Date.now()) / 1000);
                        console.log(`  ⚠️  Rate limited. Resets in ${waitSeconds} seconds`);
                    } else {
                        console.log(`  ⚠️  Rate limited. Try again later`);
                    }
                    return null;
                }

                if (!response.ok) {
                    const errorText = await response.text();
                    console.log(`  ⚠️  Twitter API error: ${response.status} - ${response.statusText}`);

                    // Don't retry on auth errors
                    if (response.status === 401 || response.status === 403) {
                        return null;
                    }

                    // Retry on server errors
                    if (response.status >= 500 && attempt < maxRetries) {
                        continue;
                    }

                    return null;
                }

                const data: any = await response.json();

                if (data.data && data.data.text) {
                    return data.data.text;
                }

                return null;
            } catch (error) {
                if (attempt === maxRetries) {
                    throw error;
                }
                // Continue to next retry
            }
        }

        return null;
    }

    /**
     * Extracts tweet ID from Twitter/X URL
     * Supports formats:
     * - https://twitter.com/user/status/1234567890
     * - https://x.com/user/status/1234567890
     */
    private extractTweetId(url: string): string | null {
        try {
            const patterns = [
                /(?:twitter\.com|x\.com)\/(?:\w+)\/status\/(\d+)/,
                /(?:twitter\.com|x\.com)\/.*\/status\/(\d+)/,
            ];

            for (const pattern of patterns) {
                const match = url.match(pattern);
                if (match && match[1]) {
                    return match[1];
                }
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Resolves a shortened t.co URL to its final destination
     */
    private async resolveShortUrl(shortUrl: string): Promise<string | null> {
        try {
            // Use HEAD request to follow redirects without downloading content
            const response = await fetch(shortUrl, {
                method: 'HEAD',
                redirect: 'follow',
            });

            // The final URL after redirects
            const finalUrl = response.url;

            // Check if it's a Twitter/X URL
            if (finalUrl.includes('twitter.com/') || finalUrl.includes('x.com/')) {
                return finalUrl;
            }

            return null;
        } catch (error) {
            console.log(`  ⚠️  Error resolving URL: ${error instanceof Error ? error.message : error}`);
            return null;
        }
    }

    /**
     * Checks if a URL is a Twitter/X URL or t.co link
     */
    static isTweetUrl(url: string): boolean {
        return url.includes('twitter.com/') || url.includes('x.com/') || url.includes('t.co/');
    }
}

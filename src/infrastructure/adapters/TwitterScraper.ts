import { ITweetScraper } from '../../domain/ports/ITweetScraper.js';

/**
 * Adapter: Implements tweet scraping using Twitter API v2 with Bearer Token
 */
export class TwitterScraper implements ITweetScraper {
    constructor(private readonly bearerToken: string) { }

    async fetchTweetContent(url: string): Promise<string | null> {
        try {
            // Extract tweet ID from URL
            const tweetId = this.extractTweetId(url);
            if (!tweetId) {
                console.log(`  ⚠️  Could not extract tweet ID from URL: ${url}`);
                return null;
            }

            // Fetch tweet using Twitter API v2 with Bearer Token
            const apiUrl = `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=text,author_id,created_at`;

            const response = await fetch(apiUrl, {
                headers: {
                    'Authorization': `Bearer ${this.bearerToken}`,
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.log(`  ⚠️  Twitter API error: ${response.status} - ${response.statusText}`);
                console.log(`  Details: ${errorText}`);
                return null;
            }

            const data: any = await response.json();

            if (data.data && data.data.text) {
                return data.data.text;
            }

            return null;
        } catch (error) {
            console.error(`  ⚠️  Error fetching tweet: ${error instanceof Error ? error.message : error}`);
            return null;
        }
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
     * Checks if a URL is a Twitter/X URL
     */
    static isTweetUrl(url: string): boolean {
        return url.includes('twitter.com/') || url.includes('x.com/');
    }
}

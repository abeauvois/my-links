/**
 * Port: Defines interface for scraping tweet content
 */
export interface ITweetScraper {
    /**
     * Fetches tweet content from a Twitter/X URL
     * @param url The tweet URL (twitter.com or x.com)
     * @returns Tweet content/text if successful, null otherwise
     */
    fetchTweetContent(url: string): Promise<string | null>;
}

/**
 * Configuration constants for the ExtractLinks use case
 */
export class ExtractLinksConfig {
    static readonly RATE_LIMIT = {
        MAX_WAIT_SECONDS: 15 * 60, // 15 minutes
        BUFFER_MS: 5000, // 5 second buffer after reset
        COUNTDOWN_INTERVAL: 10, // Show countdown every 10 seconds
        MAX_RETRY_ATTEMPTS: 3, // Maximum retry attempts for rate-limited links
    };

    static readonly LINK = {
        MAX_LOG_LENGTH: 80, // Maximum length for logged URLs
    };

    static readonly CONCURRENCY = {
        MAX_PARALLEL_ANALYSIS: 5, // Maximum concurrent link analysis operations
    };
}

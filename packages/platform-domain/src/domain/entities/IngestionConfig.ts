/**
 * Base configuration for data ingestion
 */
export interface IngestionConfig {
    /**
     * Fetch data since this timestamp (optional)
     * If not provided, implementation decides default behavior
     */
    since?: Date;

    /**
     * Maximum number of items to fetch (optional)
     */
    limit?: number;
}

/**
 * Configuration for API-based data sources
 * (Gmail, Twitter, Notion, etc.)
 */
export interface ApiIngestionConfig extends IngestionConfig {
    /**
     * Credentials required for API authentication
     */
    credentials: Record<string, string>;

    /**
     * Additional filters for API queries
     */
    filters?: Record<string, any>;
}

/**
 * Configuration for file-based data sources
 * (Zip files, directories, single files)
 */
export interface FileIngestionConfig extends IngestionConfig {
    /**
     * Path to the file or directory
     */
    path: string;

    /**
     * Whether to process files recursively (for directories)
     */
    recursive?: boolean;

    /**
     * File pattern to match (e.g., "*.eml")
     */
    filePattern?: string;
}

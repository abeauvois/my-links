import { AbstractDataSource } from './AbstractDataSource.js';
import { BaseContent } from './BaseContent.js';
import { SourceAdapter } from './SourceAdapter.js';
import { ApiIngestionConfig, IngestionConfig } from './IngestionConfig.js';
import { ILogger } from '../ports/ILogger.js';

/**
 * Base class for structured data sources (APIs)
 * Examples: Gmail, Twitter, Notion, etc.
 * 
 * These sources typically:
 * - Require authentication
 * - Have pagination
 * - Return structured data with known schemas
 * - Support filtering and querying
 */
export abstract class StructuredDataSource<TRaw, TNormalized extends BaseContent> extends AbstractDataSource<TRaw, TNormalized> {
    constructor(
        sourceType: SourceAdapter,
        logger: ILogger
    ) {
        super(sourceType, logger);
    }

    /**
     * Validate API configuration
     * Ensures required credentials are present
     */
    protected async validateConfig(config: IngestionConfig): Promise<void> {
        const apiConfig = config as ApiIngestionConfig;

        if (!apiConfig.credentials) {
            throw new Error(`${this.sourceType}: credentials are required for API data sources`);
        }

        // Call subclass-specific validation
        await this.validateApiConfig(apiConfig);
    }

    /**
     * Subclass-specific API configuration validation
     * Override to add custom validation logic
     */
    protected async validateApiConfig(config: ApiIngestionConfig): Promise<void> {
        // Default implementation: no additional validation
    }

    /**
     * Fetch raw data from the API
     * Delegates to subclass implementation
     */
    protected abstract fetchRaw(config: IngestionConfig): Promise<TRaw[]>;
}

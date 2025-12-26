import type {
    ConfigResponse,
    ConfigValueResponse,
    ConfigBatchResponse,
    ConfigKeysResponse,
} from '../types.js';
import { BaseClient, type BaseClientConfig } from './BaseClient.js';

/**
 * Configuration client for fetching config values from the API
 */
export class ConfigClient extends BaseClient {
    constructor(config: BaseClientConfig) {
        super(config);
    }

    /**
     * Fetch all available configuration values
     * Requires sessionToken to be set
     */
    async fetchAll(): Promise<ConfigResponse> {
        try {
            this.logger.info('Fetching configuration...');

            const config = await this.authenticatedRequest<ConfigResponse>('/api/config', {
                method: 'GET',
            });

            this.logger.info(`Fetched ${config.keys.length} config keys`);
            return config;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error fetching config: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Fetch a specific configuration value by key
     * Requires sessionToken to be set
     */
    async fetchValue(key: string): Promise<ConfigValueResponse> {
        try {
            this.logger.info(`Fetching config key: ${key}...`);

            const config = await this.authenticatedRequest<ConfigValueResponse>(`/api/config/${key}`, {
                method: 'GET',
            });

            this.logger.info(`Fetched config key: ${key}`);
            return config;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error fetching config key ${key}: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Fetch multiple configuration values by keys
     * Requires sessionToken to be set
     */
    async fetchBatch(keys: string[]): Promise<ConfigBatchResponse> {
        try {
            this.logger.info(`Fetching ${keys.length} config keys...`);

            const config = await this.authenticatedRequest<ConfigBatchResponse>('/api/config/batch', {
                method: 'POST',
                body: JSON.stringify({ keys }),
            });

            this.logger.info(`Fetched ${config.found.length} config keys, ${config.missing.length} missing`);
            return config;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error fetching config batch: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Get list of available configuration keys (without values)
     * Requires sessionToken to be set
     */
    async fetchKeys(): Promise<ConfigKeysResponse> {
        try {
            this.logger.info('Fetching available config keys...');

            const response = await this.authenticatedRequest<ConfigKeysResponse>('/api/config/keys', {
                method: 'GET',
            });

            this.logger.info(`${response.total} config keys available`);
            return response;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error fetching config keys: ${errorMessage}`);
            throw error;
        }
    }
}

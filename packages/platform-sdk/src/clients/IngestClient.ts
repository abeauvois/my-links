import type { WorkflowPreset, IngestOptions, IIngestWorkflow } from '../types.js';
import { IngestWorkflow } from '../IngestWorkflow.js';
import { BaseClient, type BaseClientConfig } from './BaseClient.js';

/**
 * Ingestion client for creating and executing data ingestion workflows
 */
export class IngestClient extends BaseClient {
    constructor(config: BaseClientConfig) {
        super(config);
    }

    /**
     * Create an ingestion workflow for processing data from a source
     *
     * @param preset - Workflow preset (e.g., 'gmail', 'full', 'quick')
     * @param options - Ingestion options including filters and step toggles
     * @returns An IngestWorkflow that can be executed with lifecycle hooks
     *
     * @example
     * ```typescript
     * const workflow = client.ingest.create('gmail', {
     *     filter: { email: 'user@example.com' },
     *     skipAnalysis: false,
     *     skipTwitter: true
     * });
     *
     * await workflow.execute({
     *     onStart: ({ logger }) => logger.info('Starting...'),
     *     onComplete: ({ logger }) => logger.info('Done!'),
     *     onError: ({ logger }) => logger.error('Failed!')
     * });
     * ```
     */
    create(preset: WorkflowPreset, options: IngestOptions = {}): IIngestWorkflow {
        return new IngestWorkflow({
            preset,
            options,
            logger: this.logger,
            baseUrl: this.baseUrl,
            sessionToken: this.sessionToken,
        });
    }
}

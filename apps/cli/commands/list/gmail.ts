import { command } from 'cleye';
import * as p from '@clack/prompts';
import { AuthManager } from '../../lib/AuthManager.js';
import { PlatformApiClient } from '@platform/sdk';

/**
 * Create a clack-based logger that uses spinners for progress
 */

// TODO: Move to a shared utils package because all cli commands will need this
function createClackLogger() {
    return {
        info: (message: string) => p.log.info(message),
        error: (message: string) => p.log.error(message),
        warning: (message: string) => p.log.warn(message),
        debug: () => { }, // Suppress debug logs
        await: (message: string) => {
            const spinner = p.spinner();
            return {
                start: () => spinner.start(message),
                update: (msg: string) => spinner.message(msg),
                stop: () => spinner.stop(message),
            };
        },
    };
}

/**
 * Gmail command - Trigger Gmail ingestion workflow
 *
 * Usage:
 *   cli list source gmail --filter=email@example.com --limit-days=7
 */
export const gmailCommand = command({
    name: 'gmail',
    flags: {
        filter: {
            type: String,
            description: 'Email address to filter Gmail messages',
            alias: 'f',
        },
        limitDays: {
            type: Number,
            description: 'Limit ingestion to emails from the last N days',
            alias: 'l',
            default: 7,
        },
    },
    help: {
        description: 'Trigger Gmail ingestion workflow',
    },
}, async (argv) => {
    p.intro('Gmail Source Ingestion');

    try {
        const baseUrl = process.env.PLATFORM_API_URL || 'http://localhost:3000'; // TODO: should come from a config object, fetched from the platform
        const logger = createClackLogger();

        // Authenticate
        const authManager = new AuthManager({ baseUrl, logger }); // TODO: AuthManager should use a config object, fetched from the platform
        const credentials = await authManager.login();

        if (!credentials) {
            p.log.error('Authentication failed. Please check your credentials and try again.');
            p.outro('Ingestion cancelled');
            process.exit(1);
        }

        // Create authenticated API client
        const apiClient = new PlatformApiClient({  // TODO: PlatformApiClient should use a config object, fetched from the platform
            baseUrl,
            sessionToken: credentials.sessionToken,
            logger,
        });

        // Build filter options
        const filter: { email?: string; limitDays?: number } = {};
        if (argv.flags.filter) {
            filter.email = argv.flags.filter || process.env.PLATFORM_EMAIL; // TODO: should come from a config object, fetched from the platform
        }
        if (argv.flags.limitDays) {
            filter.limitDays = argv.flags.limitDays || 7;
        }
        console.log("🚀 ~ filter:", filter)

        // Display configuration
        const configLines = [];
        if (filter.email) {
            configLines.push(`Filter: ${filter.email}`);
        }
        configLines.push(`Limitx: ${filter.limitDays} days`);
        p.note(configLines.join('\n'), 'Configuration');

        // Create and execute workflow
        const workflow = apiClient.ingest.create('gmail', { filter });

        await workflow.execute({
            onItemProcessed: ({ index, total }: { index: number, total: number }) => {
                console.log(`Processedx ${index + 1}/${total} items`);
            },
            onError: () => {
                p.log.error('An error occurred during ingestion.');
            },
        });

        p.outro('Gmail ingestion completed successfully!');

    } catch (error) {
        p.log.error(error instanceof Error ? error.message : 'Unknown error');
        p.outro('Ingestion failed');
        process.exit(1);
    }
});

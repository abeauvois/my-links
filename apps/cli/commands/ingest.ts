import { command } from 'cleye';
import { loadCliConfig, validateCliConfig } from '../../../config.cli.js';

/**
 * Ingest command - Fetch bookmarks from various sources
 * 
 * Usage:
 *   cli personal bookmark ingest -f gmail -t csv
 *   cli personal bookmark ingest --from gmail --to csv
 */
export const ingestCommand = command({
    name: 'ingest',
    flags: {
        from: {
            type: String,
            description: 'Source to ingest from (gmail, notion, etc.)',
            alias: 'f',
        },
        to: {
            type: String,
            description: 'Output format (csv, notion, etc.)',
            alias: 't',
        },
    },
    help: {
        description: 'Ingest bookmarks from various sources',
    },
}, async (argv) => {
    try {
        const source = argv.flags.from;
        const target = argv.flags.to;

        if (!source) {
            console.error('❌ Error: --from flag is required');
            console.error('Usage: cli personal bookmark ingest -f gmail -t csv\n');
            process.exit(1);
        }

        if (!target) {
            console.error('❌ Error: --to flag is required');
            console.error('Usage: cli personal bookmark ingest -f gmail -t csv\n');
            process.exit(1);
        }

        // Currently only support gmail -> csv
        if (source !== 'gmail') {
            console.error(`❌ Error: Source '${source}' is not supported yet`);
            console.error('Supported sources: gmail\n');
            process.exit(1);
        }

        if (target !== 'csv') {
            console.error(`❌ Error: Target '${target}' is not supported yet`);
            console.error('Supported targets: csv\n');
            process.exit(1);
        }

        console.log('🚀 Personal Bookmark Ingestion\n');
        console.log(`📥 Source: ${source}`);
        console.log(`📤 Target: ${target}\n`);

        // Load configuration
        console.log('⚙️  Loading configuration from config.cli.ts...');
        const config = await loadCliConfig();
        validateCliConfig(config);
        console.log('✅ Configuration loaded\n');

        // Import dependencies
        const { GmailClient } = await import('../../../src/infrastructure/adapters/GmailClient.js');
        const { AnthropicClient } = await import('../../../src/infrastructure/adapters/AnthropicClient.js');
        const { FileTimestampRepository } = await import('../../../src/infrastructure/repositories/FileTimestampRepository.js');
        const { CliuiLogger } = await import('../../../src/infrastructure/adapters/CliuiLogger.js');
        const { CsvFileWriter } = await import('../../../src/infrastructure/adapters/CsvFileWriter.js');
        const { GmailBookmarksWorkflowService } = await import('../../../src/application/services/GmailBookmarksWorkflowService.js');

        // Initialize dependencies
        const logger = new CliuiLogger();
        const gmailClient = new GmailClient(
            config.gmail.clientId,
            config.gmail.clientSecret,
            config.gmail.refreshToken,
            logger
        );
        const anthropicClient = new AnthropicClient(
            config.anthropic.apiKey,
            config.anthropic.model,
            logger
        );

        // Set default timestamp to N days ago based on config
        const defaultTimestamp = new Date(Date.now() - 1000 * 60 * 60 * 24 * config.lastRun.daysAgo);
        const timestampRepository = new FileTimestampRepository(
            config.output.timestampFile,
            defaultTimestamp
        );

        // Create workflow service
        const service = new GmailBookmarksWorkflowService(
            gmailClient,
            anthropicClient,
            timestampRepository,
            config.gmail.filterEmail || '',
            logger
        );

        // Execute workflow
        logger.info('🔄 Fetching and analyzing Gmail messages...\n');
        const bookmarks = await service.fetchRecentMessages();

        if (bookmarks.length === 0) {
            logger.info('ℹ️  No new bookmarks found.');
            logger.info('✨ All done!\n');
            return;
        }

        // Export to CSV
        logger.info(`\n📝 Exporting ${bookmarks.length} bookmark(s) to CSV...`);
        const csvWriter = new CsvFileWriter();
        await csvWriter.write(bookmarks, config.output.csvPath);
        logger.info(`✅ Exported to ${config.output.csvPath}\n`);

        logger.info('✨ Success! Your bookmarks have been ingested and saved.\n');
    } catch (error) {
        console.error('\n❌ Error:', error instanceof Error ? error.message : 'Unknown error');
        if (error instanceof Error && error.stack) {
            console.error('\nStack trace:');
            console.error(error.stack);
        }
        process.exit(1);
    }
});

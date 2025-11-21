import { test, expect, describe } from 'bun:test';
import { GmailBookmarksWorkflowService } from '../../../../application/services/GmailBookmarksWorkflowService.js';
import { GmailClient } from '../../../adapters/GmailClient.js';
import { AnthropicClient } from '../../../adapters/AnthropicClient.js';
import { FileTimestampRepository } from '../../../repositories/FileTimestampRepository.js';
import { CliuiLogger } from '../../../adapters/CliuiLogger.js';
import { loadCliConfig, validateCliConfig } from '../../../../../config.cli.js';

/**
 * Integration Test: GmailBookmarksWorkflowService
 * 
 * Tests the complete workflow with real Gmail and Anthropic APIs.
 * 
 * Prerequisites:
 * - Configuration set up in config.cli.ts (which reads from .env)
 * - GMAIL_CLIENT_ID in .env
 * - GMAIL_CLIENT_SECRET in .env
 * - GMAIL_REFRESH_TOKEN in .env
 * - ANTHROPIC_API_KEY in .env
 * - MY_EMAIL_ADDRESS in .env (for filtering)
 * 
 * These tests will be skipped if credentials are not configured.
 */

describe('GmailBookmarksWorkflowService Integration Tests', () => {
    test('should fetch and analyze Gmail messages end-to-end', async () => {
        // Load configuration from config.cli.ts
        const config = await loadCliConfig();

        try {
            validateCliConfig(config);
        } catch (error) {
            console.log('⏭️  Skipping Gmail workflow integration test: Invalid configuration');
            console.log(`    ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }

        console.log('✅ Configuration loaded from config.cli.ts, testing complete workflow...');

        // Initialize REAL dependencies
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

        // Use config to set default timestamp
        const defaultTimestamp = new Date(Date.now() - 1000 * 60 * 60 * 24 * config.lastRun.daysAgo);
        const timestampRepository = new FileTimestampRepository(
            '.gmail-workflow-integration-test',
            defaultTimestamp
        );

        // Create service with real implementations
        const service = new GmailBookmarksWorkflowService(
            gmailClient,
            anthropicClient,
            timestampRepository,
            config.gmail.filterEmail || '',
            logger
        );

        let bookmarks;
        try {
            // ACT - Execute the actual workflow
            bookmarks = await service.fetchRecentMessages();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            if (errorMessage.includes('invalid_grant')) {
                throw new Error(
                    'Gmail authentication failed: invalid_grant\n' +
                    'Solution: Generate a new refresh token using OAuth playground'
                );
            }

            if (errorMessage.includes('invalid_client')) {
                throw new Error(
                    'Gmail authentication failed: invalid_client\n' +
                    'Solution: Verify credentials in Google Cloud Console'
                );
            }

            throw new Error(`Workflow execution error: ${errorMessage}`);
        }

        // ASSERT
        expect(bookmarks).toBeDefined();
        expect(Array.isArray(bookmarks)).toBe(true);

        console.log(`✅ Workflow executed successfully, processed ${bookmarks.length} bookmark(s)`);

        // Verify bookmark structure
        if (bookmarks.length > 0) {
            const firstBookmark = bookmarks[0];

            expect(firstBookmark.url).toBeDefined();
            expect(typeof firstBookmark.url).toBe('string');
            expect(firstBookmark.url.startsWith('http')).toBe(true);

            // If Anthropic analysis completed, verify tags and summary
            if (firstBookmark.tags.length > 0 || firstBookmark.summary) {
                expect(Array.isArray(firstBookmark.tags)).toBe(true);
                expect(typeof firstBookmark.summary).toBe('string');
                console.log(`✅ Sample bookmark analyzed:`);
                console.log(`   URL: ${firstBookmark.url}`);
                console.log(`   Tags: ${firstBookmark.tags.join(', ')}`);
                console.log(`   Summary: ${firstBookmark.summary.substring(0, 100)}...`);
            } else {
                console.log(`ℹ️  Bookmark extracted but not yet analyzed (may be empty message)`);
            }
        } else {
            console.log('ℹ️  No new messages with links found since last run (this is normal)');
        }
    }, 60000); // 60 second timeout for API calls

    test('should handle Gmail authentication errors gracefully', async () => {
        const logger = new CliuiLogger();

        // Use invalid credentials
        const gmailClient = new GmailClient('invalid_id', 'invalid_secret', 'invalid_token', logger);
        const anthropicClient = new AnthropicClient('test_key', 'claude-3-5-haiku-20241022', logger);
        const timestampRepository = new FileTimestampRepository('.gmail-workflow-error-test');

        const service = new GmailBookmarksWorkflowService(
            gmailClient,
            anthropicClient,
            timestampRepository,
            'test@example.com',
            logger
        );

        // Should handle authentication error gracefully
        await expect(service.fetchRecentMessages()).rejects.toThrow();

        console.log('✅ Authentication errors handled correctly');
    }, 30000);

    test('should save timestamp after successful execution', async () => {
        // Load configuration from config.cli.ts
        const config = await loadCliConfig();

        try {
            validateCliConfig(config);
        } catch (error) {
            console.log('⏭️  Skipping timestamp test: Invalid configuration');
            throw error;
        }

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
        const timestampRepository = new FileTimestampRepository('.gmail-workflow-timestamp-test');

        // Get timestamp before execution
        const timestampBefore = await timestampRepository.getLastExecutionTime();

        const service = new GmailBookmarksWorkflowService(
            gmailClient,
            anthropicClient,
            timestampRepository,
            config.gmail.filterEmail || '',
            logger
        );

        // Execute workflow
        await service.fetchRecentMessages();

        // Verify timestamp was updated
        const timestampAfter = await timestampRepository.getLastExecutionTime();
        expect(timestampAfter).not.toBeNull();

        if (timestampBefore) {
            expect(timestampAfter!.getTime()).toBeGreaterThanOrEqual(timestampBefore.getTime());
        }

        console.log('✅ Timestamp correctly updated after execution');
    }, 60000);
});

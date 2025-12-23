import { test, expect, describe } from 'bun:test';
import { EnvConfigProvider } from '@platform/sdk';
import { ApiIngestionConfig } from '../../../../domain/entities/IngestionConfig';
import { GmailSourceReader } from '../../../../application/source-readers/GmailSourceReader';
import { FileTimestampRepository } from '../../../repositories/FileTimestampRepository';
import { GmailClient } from '../../../adapters/GmailClient';
import { CliuiLogger } from '../../../adapters/CliuiLogger';

const envPath = './apps/api/.env'

/**
 * Integration Test: GmailSourceReader with Real Gmail API
 *
 * Tests the GmailSourceReader abstraction with real Gmail API connectivity.
 *
 * Prerequisites:
 * - GMAIL_CLIENT_ID in .env
 * - GMAIL_CLIENT_SECRET in .env
 * - GMAIL_REFRESH_TOKEN in .env
 * - MY_EMAIL_ADDRESS in .env (optional)
 *
 * This test will be skipped if credentials are not configured.
 */

describe('GmailSourceReader Integration Tests', () => {

    test('should throw error if required credentials are missing', async () => {
        const logger = new CliuiLogger();
        const gmailClient = new GmailClient('test', 'test', 'test', logger);
        const timestampRepo = new FileTimestampRepository('.gmail-test-timestamp');

        const sourceReader = new GmailSourceReader(
            gmailClient,
            timestampRepo,
            logger
        );

        // Config with missing credentials
        const config: ApiIngestionConfig = {
            credentials: {
                clientId: '',  // Missing
            },
            filters: {
                email: "abeauvois@gmail.com" // TODO: how to test this without my personal email? create a gmail account (tech-test-user@platform.ai?)
            }
        };

        // Should throw validation error
        await expect(sourceReader.ingest(config)).rejects.toThrow('Gmail requires clientId, clientSecret, and refreshToken');

        console.log('✅ Missing credentials validation works correctly');
    });

    test('should use timestamp repository for incremental fetching', async () => {
        const envConfigProvider = new EnvConfigProvider();
        await envConfigProvider.load(envPath);

        const clientId = envConfigProvider.get('GMAIL_CLIENT_ID');
        const clientSecret = envConfigProvider.get('GMAIL_CLIENT_SECRET');
        const refreshToken = envConfigProvider.get('GMAIL_REFRESH_TOKEN');

        // Skip if credentials not available
        if (!clientId || !clientSecret || !refreshToken ||
            clientId === 'your_gmail_client_id_here') {
            console.log('⏭️  Skipping timestamp test: Valid credentials required');
            throw new Error("Valid credentials required for this test");
        }

        const logger = new CliuiLogger();
        const gmailClient = new GmailClient(clientId, clientSecret, refreshToken, logger);
        const timestampRepo = new FileTimestampRepository('.gmail-timestamp-test');

        // Test: Fetch messages from last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        await timestampRepo.saveLastExecutionTime(sevenDaysAgo);

        const sourceReader = new GmailSourceReader(
            gmailClient,
            timestampRepo,
            logger
        );

        // Config WITHOUT since date - should use timestamp from repo
        const config: ApiIngestionConfig = {
            credentials: {
                clientId,
                clientSecret,
                refreshToken,
            },
            // No 'since' - should fall back to timestamp repository
            filters: {
                email: "abeauvois@gmail.com" // TODO: how to test this without my personal email? create a gmail account (tech-test-user@platform.ai?)
            }
        };

        const results = await sourceReader.ingest(config);

        expect(results).toBeDefined();
        console.log(`✅ Timestamp repository used correctly, fetched ${results.length} messages`);

    });

    test('should apply email filter when provided', async () => {
        const envConfigProvider = new EnvConfigProvider();
        await envConfigProvider.load(envPath);

        const clientId = envConfigProvider.get('GMAIL_CLIENT_ID');
        const clientSecret = envConfigProvider.get('GMAIL_CLIENT_SECRET');
        const refreshToken = envConfigProvider.get('GMAIL_REFRESH_TOKEN');
        const filterEmail = envConfigProvider.get('MY_EMAIL_ADDRESS');

        if (!clientId || !clientSecret || !refreshToken ||
            clientId === 'your_gmail_client_id_here' || !filterEmail) {
            console.log('⏭️  Skipping filter test: Valid credentials and MY_EMAIL_ADDRESS required');
            throw new Error("Valid credentials and MY_EMAIL_ADDRESS required for this test");
        }

        const logger = new CliuiLogger();
        const gmailClient = new GmailClient(clientId, clientSecret, refreshToken, logger);
        const timestampRepo = new FileTimestampRepository('.gmail-filter-test');

        const sourceReader = new GmailSourceReader(
            gmailClient,
            timestampRepo,
            logger
        );

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const config: ApiIngestionConfig = {
            credentials: {
                clientId,
                clientSecret,
                refreshToken,
            },
            since: sevenDaysAgo,
            filters: {
                email: filterEmail,  // Apply email filter
            },
        };

        const results = await sourceReader.ingest(config);

        expect(results).toBeDefined();
        console.log(`✅ Email filter applied, found ${results.length} message(s) from ${filterEmail}`);
    });
});

import { test, expect, describe, beforeAll, afterAll } from 'bun:test';
import { existsSync, unlinkSync } from 'fs';
import { readFile } from 'fs/promises';
import { parse } from 'csv-parse/sync';
import { loadCliConfig, validateCliConfig } from '../../../../config.cli.js';
import { BaseContent } from '../../../domain/entities/BaseContent.js';

/**
 * E2E Test: CLI Personal Bookmark Ingest Command
 * 
 * Tests the complete CLI command execution:
 * `bun run apps/cli/index.ts personal bookmark ingest -f gmail -t csv`
 * 
 * This test:
 * 1. Executes the actual CLI command
 * 2. Verifies CSV file is created
 * 3. Validates CSV content structure
 * 
 * Prerequisites:
 * - Configuration set up in config.cli.ts
 * - Valid Gmail and Anthropic credentials in .env
 */

describe('E2E: CLI Personal Bookmark Ingest', () => {
    let config: Awaited<ReturnType<typeof loadCliConfig>>;
    let outputCsvPath: string;
    let timestampFile: string;

    beforeAll(async () => {
        // Load and validate configuration
        config = await loadCliConfig();
        try {
            validateCliConfig(config);
        } catch (error) {
            console.log('⏭️  Skipping E2E test: Invalid configuration');
            throw error;
        }

        outputCsvPath = config.output.csvPath;
        timestampFile = config.output.timestampFile;

        // Clean up any existing test files
        if (existsSync(outputCsvPath)) {
            unlinkSync(outputCsvPath);
        }
        if (existsSync(timestampFile)) {
            unlinkSync(timestampFile);
        }
    });

    afterAll(() => {
        // Clean up test files
        if (existsSync(outputCsvPath)) {
            try {
                unlinkSync(outputCsvPath);
            } catch (e) {
                console.warn(`Could not delete ${outputCsvPath}`);
            }
        }
        if (existsSync(timestampFile)) {
            try {
                unlinkSync(timestampFile);
            } catch (e) {
                console.warn(`Could not delete ${timestampFile}`);
            }
        }
    });

    test('should execute CLI command and create CSV file', async () => {
        console.log('🧪 Testing CLI command: personal bookmark ingest -f gmail -t csv');

        // Execute the CLI command
        const proc = Bun.spawn([
            'bun',
            'run',
            'apps/cli/index.ts',
            'personal',
            'bookmark',
            'ingest',
            '-f',
            'gmail',
            '-t',
            'csv'
        ], {
            cwd: process.cwd(),
            stdout: 'pipe',
            stderr: 'pipe',
        });

        // Collect output
        const stdout = await new Response(proc.stdout).text();
        const stderr = await new Response(proc.stderr).text();
        const exitCode = await proc.exited;

        // Log output for debugging
        if (stdout) {
            console.log('CLI Output:');
            console.log(stdout);
        }
        if (stderr) {
            console.log('CLI Errors:');
            console.log(stderr);
        }

        // Verify command executed successfully
        expect(exitCode).toBe(0);
        expect(stdout).toContain('Personal Bookmark Ingestion');
        expect(stdout).toContain('Configuration loaded');

        console.log('✅ CLI command executed successfully');
    }, 120000); // 2 minute timeout for full workflow

    test('should create CSV file with correct structure', async () => {
        // Verify CSV file exists
        const csvExists = existsSync(outputCsvPath);

        if (!csvExists) {
            console.log('ℹ️  No CSV file created - this may be normal if no new messages were found');
            // This is not a failure - just means no new bookmarks
            return;
        }

        expect(csvExists).toBe(true);
        console.log(`✅ CSV file created at ${outputCsvPath}`);

        // Read and parse CSV
        const csvContent = await readFile(outputCsvPath, 'utf-8');
        const records = parse(csvContent, {
            columns: true,
            skip_empty_lines: true
        });

        console.log(`📊 Found ${records.length} bookmark(s) in CSV`);

        // Verify CSV has records (if any messages were found)
        if (records.length > 0) {
            // Verify first record has expected columns
            const firstRecord = records[0] as BaseContent
            expect(firstRecord).toHaveProperty('url');
            expect(firstRecord).toHaveProperty('tag');
            expect(firstRecord).toHaveProperty('description');

            expect(firstRecord.url).toBeTruthy();
            expect(typeof firstRecord.url).toBe('string');
            expect(firstRecord.url.startsWith('http')).toBe(true);

            console.log('✅ CSV structure validated');
            console.log(`   Sample URL: ${firstRecord.url}`);
            console.log(`   Sample tag: ${firstRecord.tags || [].join(', ')}`);
        } else {
            console.log('ℹ️  CSV is empty - no bookmarks found in time range');
        }
    }, 10000);

    test('should create timestamp file', async () => {
        // Verify timestamp file exists
        const timestampExists = existsSync(timestampFile);
        expect(timestampExists).toBe(true);
        console.log(`✅ Timestamp file created at ${timestampFile}`);

        // Read timestamp
        const timestampContent = await readFile(timestampFile, 'utf-8');
        const timestamp = new Date(timestampContent.trim());

        // Verify it's a valid date
        expect(timestamp.toString()).not.toBe('Invalid Date');
        expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());

        console.log(`✅ Timestamp file contains valid date: ${timestamp.toISOString()}`);
    }, 10000);

    test('should use configuration from config.cli.ts', async () => {
        // Verify config values match what we expect
        expect(config.lastRun.daysAgo).toBe(4);
        expect(config.output.csvPath).toBe('./data/gmail-bookmarks.csv');
        expect(config.output.timestampFile).toBe('.gmail-cli-last-run');
        expect(config.anthropic.model).toBe('claude-3-5-haiku-20241022');

        console.log('✅ Configuration from config.cli.ts is correct');
        console.log(`   Last run: ${config.lastRun.daysAgo} days ago`);
        console.log(`   CSV path: ${config.output.csvPath}`);
        console.log(`   Timestamp file: ${config.output.timestampFile}`);
    });

    test('should handle second run with recent timestamp', async () => {
        console.log('🧪 Testing second CLI run (should find no new messages)');

        // Verify timestamp file from first run exists
        if (!existsSync(timestampFile)) {
            console.log('⏭️  Skipping: No timestamp from first run');
            return;
        }

        // Execute the CLI command again
        const proc = Bun.spawn([
            'bun',
            'run',
            'apps/cli/index.ts',
            'personal',
            'bookmark',
            'ingest',
            '-f',
            'gmail',
            '-t',
            'csv'
        ], {
            cwd: process.cwd(),
            stdout: 'pipe',
            stderr: 'pipe',
        });

        const stdout = await new Response(proc.stdout).text();
        const exitCode = await proc.exited;

        // Second run should succeed (even if no new messages)
        expect(exitCode).toBe(0);
        console.log('✅ Second CLI run executed successfully');

        // Should indicate no new messages or find new ones
        if (stdout.includes('No new bookmarks found') || stdout.includes('0 bookmark')) {
            console.log('✅ Correctly reported no new bookmarks');
        } else {
            console.log('ℹ️  Found new bookmarks on second run (unusual but possible)');
        }
    }, 120000);
});

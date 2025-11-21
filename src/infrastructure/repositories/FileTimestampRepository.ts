import { ITimestampRepository } from '../../domain/ports/ITimestampRepository.js';
import { existsSync } from 'fs';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';

/**
 * Infrastructure Adapter: FileTimestampRepository
 * 
 * Persists the last execution timestamp to a local file.
 * Implements ITimestampRepository port.
 * 
 * Storage format: Plain text file with ISO timestamp
 */

export class FileTimestampRepository implements ITimestampRepository {
    private readonly timestampFilePath: string;
    private readonly defaultTimestamp?: Date;

    constructor(timestampFilePath: string = '.gmail-last-run', defaultTimestamp?: Date) {
        this.timestampFilePath = timestampFilePath || '.gmail-last-run';
        this.defaultTimestamp = defaultTimestamp;
    }

    async getLastExecutionTime(): Promise<Date | null> {
        try {
            if (!existsSync(this.timestampFilePath)) {
                if (this.defaultTimestamp === undefined) {
                    throw new Error(`Timestamp file not found: ${this.timestampFilePath}. Please run the workflow at least once to initialize the timestamp.`);
                }
                return this.defaultTimestamp;
            }

            const content = await readFile(this.timestampFilePath, 'utf-8');
            const timestamp = content.trim();

            if (!timestamp) {
                if (this.defaultTimestamp === undefined) {
                    throw new Error(`Timestamp file is empty: ${this.timestampFilePath}. Please run the workflow at least once to initialize the timestamp.`);
                }
                return this.defaultTimestamp;
            }

            return new Date(timestamp);
        } catch (error) {
            // Re-throw our custom errors
            if (error instanceof Error && error.message.includes('Timestamp file')) {
                throw error;
            }
            // For other errors (file read issues, etc.), throw if no default timestamp
            if (this.defaultTimestamp === undefined) {
                throw new Error(`Failed to read timestamp file: ${this.timestampFilePath}. ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
            return this.defaultTimestamp;
        }
    }

    async saveLastExecutionTime(timestamp: Date): Promise<void> {
        try {
            // Ensure directory exists
            const dir = dirname(this.timestampFilePath);
            if (dir !== '.') {
                await mkdir(dir, { recursive: true });
            }

            // Save ISO timestamp to file
            await writeFile(this.timestampFilePath, timestamp.toISOString(), 'utf-8');
        } catch (error) {
            throw new Error(
                `Failed to save timestamp: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }
}

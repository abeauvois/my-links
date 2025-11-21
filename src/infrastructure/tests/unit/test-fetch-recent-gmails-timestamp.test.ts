import { test, expect, describe, beforeEach } from 'bun:test';
import { FileTimestampRepository } from '../../repositories/FileTimestampRepository';

/**
 * Unit Tests: FileTimestampRepository
 * 
 * Tests the business logic for storing and retrieving timestamps
 * since the last execution time.
 * 
 * Following TDD approach (RED phase - these tests should fail initially)
 */

describe('FileTimestampRepository', () => {
    test('should throw error when no timestamp file exists and no default provided', async () => {
        // Arrange: Create repository with non-existent file and no default
        const fileTimestampRepo = new FileTimestampRepository('.test-nonexistent-file-12345');

        // Act & Assert: Should throw error when timestamp file doesn't exist
        await expect(fileTimestampRepo.getLastExecutionTime()).rejects.toThrow(
            'Timestamp file not found'
        );

        console.log('✅ Correctly throws error when timestamp file not found');
    });

    test('should return default timestamp when no file exists but default is provided', async () => {
        // Arrange: Create repository with default timestamp
        const defaultTimestamp = new Date('2024-01-01');
        const repoWithDefault = new FileTimestampRepository('.test-nonexistent', defaultTimestamp);

        // Act
        const result = await repoWithDefault.getLastExecutionTime();

        // Assert: Should return the default timestamp
        expect(result).toEqual(defaultTimestamp);
        console.log('✅ Returns default timestamp when file not found');
    });

});

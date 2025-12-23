import { test, expect, describe, beforeEach } from 'bun:test';
import { DirectorySourceReader } from '../../../application/source-readers/DirectorySourceReader';
import { BaseContent } from '../../../domain/entities/BaseContent.js';
import { FileIngestionConfig } from '../../../domain/entities/IngestionConfig.js';
import { IFilesystemReader } from '../../../domain/ports/IFilesystemReader.js';
import { IZipReader } from '../../../domain/ports/IZipReader.js';
import { ITarReader } from '../../../domain/ports/ITarReader.js';
import { RawFile, createRawFile } from '../../../domain/entities/RawFile.js';
import { MockLogger } from './MockLogger';

// Mock implementations
class MockFilesystemReader implements IFilesystemReader {
    private files: RawFile[] = [];

    setFiles(files: Map<string, string>) {
        // Convert Map<filename, content> to RawFile[]
        this.files = Array.from(files.entries()).map(([filename, content]) =>
            createRawFile(filename, content)
        );
    }

    async readFiles(
        directoryPath: string,
        recursive?: boolean,
        filePattern?: string
    ): Promise<RawFile[]> {
        return this.files;
    }
}

class MockZipReader implements IZipReader {
    private files: RawFile[] = [];

    setFiles(files: Map<string, string>) {
        // Convert Map<filename, content> to RawFile[]
        this.files = Array.from(files.entries()).map(([filename, content]) =>
            createRawFile(filename, content)
        );
    }

    async extractFiles(zipPath: string, filePattern?: string): Promise<RawFile[]> {
        return this.files;
    }
}

class MockTarReader implements ITarReader {
    private files: RawFile[] = [];

    setFiles(files: Map<string, string>) {
        // Convert Map<filename, content> to RawFile[]
        this.files = Array.from(files.entries()).map(([filename, content]) =>
            createRawFile(filename, content)
        );
    }

    async extractFiles(tarPath: string, filePattern?: string): Promise<RawFile[]> {
        return this.files;
    }
}

describe('DirectorySourceReader', () => {
    let mockFilesystemReader: MockFilesystemReader;
    let mockZipReader: MockZipReader;
    let mockTarReader: MockTarReader;
    let mockLogger: MockLogger;
    let sourceReader: DirectorySourceReader;

    beforeEach(() => {
        mockFilesystemReader = new MockFilesystemReader();
        mockZipReader = new MockZipReader();
        mockTarReader = new MockTarReader();
        mockLogger = new MockLogger();
        sourceReader = new DirectorySourceReader(
            mockFilesystemReader,
            mockZipReader,
            mockTarReader,
            mockLogger
        );
    });

    test('should have Directory source type', () => {
        expect(sourceReader.getSourceType()).toBe('Directory');
    });

    test('should throw error if path is missing', async () => {
        const config: FileIngestionConfig = {
            path: '',
        };

        await expect(sourceReader.ingest(config)).rejects.toThrow('path is required');
    });

    test('should fetch and normalize files from directory', async () => {
        const files = new Map([
            ['email1.eml', 'Content of email 1 with link: https://example.com'],
            ['email2.eml', 'Content of email 2 with link: https://test.com'],
        ]);

        mockFilesystemReader.setFiles(files);

        const config: FileIngestionConfig = {
            path: '/path/to/directory',
        };

        const results = await sourceReader.ingest(config);

        expect(results).toHaveLength(2);
        expect(results[0]).toBeInstanceOf(BaseContent);
        expect(results[0].sourceAdapter).toBe('Directory');
        expect(results[0].rawContent).toContain('https://example.com');
        expect(results[1].rawContent).toContain('https://test.com');
    });

    test('should handle empty directory', async () => {
        const files = new Map<string, string>();
        mockFilesystemReader.setFiles(files);

        const config: FileIngestionConfig = {
            path: '/path/to/empty',
        };

        const results = await sourceReader.ingest(config);

        expect(results).toHaveLength(0);
    });

    test('should handle single file', async () => {
        const files = new Map([
            ['single.eml', 'Single email content'],
        ]);

        mockFilesystemReader.setFiles(files);

        const config: FileIngestionConfig = {
            path: '/path/to/directory',
        };

        const results = await sourceReader.ingest(config);

        expect(results).toHaveLength(1);
        expect(results[0].sourceAdapter).toBe('Directory');
        expect(results[0].rawContent).toBe('Single email content');
    });

    test('should normalize all files with Directory source adapter', async () => {
        const files = new Map([
            ['file1.eml', 'Content 1'],
            ['file2.eml', 'Content 2'],
            ['file3.eml', 'Content 3'],
        ]);

        mockFilesystemReader.setFiles(files);

        const config: FileIngestionConfig = {
            path: '/path/to/directory',
        };

        const results = await sourceReader.ingest(config);

        expect(results).toHaveLength(3);
        results.forEach((result: BaseContent) => {
            expect(result.sourceAdapter).toBe('Directory');
            expect(result.tags).toEqual([]);
            expect(result.summary).toBe('');
        });
    });

    test('should log progress during ingestion', async () => {
        const files = new Map([
            ['email.eml', 'Email content'],
        ]);

        mockFilesystemReader.setFiles(files);

        const config: FileIngestionConfig = {
            path: '/path/to/directory',
        };

        await sourceReader.ingest(config);

        expect(mockLogger.logs.length).toBeGreaterThan(0);
        expect(mockLogger.logs.some(log => log.includes('Fetching data'))).toBe(true);
        expect(mockLogger.logs.some(log => log.includes('Normalizing'))).toBe(true);
        expect(mockLogger.logs.some(log => log.includes('Ingestion complete'))).toBe(true);
    });

    test('should preserve file content during normalization', async () => {
        const testContent = 'This is test email content with special chars: éàü & <html>';
        const files = new Map([
            ['test.eml', testContent],
        ]);

        mockFilesystemReader.setFiles(files);

        const config: FileIngestionConfig = {
            path: '/path/to/directory',
        };

        const results = await sourceReader.ingest(config);

        expect(results).toHaveLength(1);
        expect(results[0].rawContent).toBe(testContent);
        expect(results[0].url).toBe(testContent);
    });

    test('should set timestamps on normalized content', async () => {
        const files = new Map([
            ['email.eml', 'Content'],
        ]);

        mockFilesystemReader.setFiles(files);

        const config: FileIngestionConfig = {
            path: '/path/to/directory',
        };

        const before = new Date();
        const results = await sourceReader.ingest(config);
        const after = new Date();

        expect(results).toHaveLength(1);
        expect(results[0].createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(results[0].createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    test('should support recursive option', async () => {
        const files = new Map([
            ['dir1/file1.eml', 'Content 1'],
            ['dir2/file2.eml', 'Content 2'],
        ]);

        mockFilesystemReader.setFiles(files);

        const config: FileIngestionConfig = {
            path: '/path/to/directory',
            recursive: true,
        };

        const results = await sourceReader.ingest(config);

        expect(results).toHaveLength(2);
        results.forEach((result: BaseContent) => {
            expect(result.sourceAdapter).toBe('Directory');
        });
    });

    test('should support filePattern option', async () => {
        const files = new Map([
            ['file1.eml', 'Content 1'],
            ['file2.txt', 'Content 2'],
        ]);

        mockFilesystemReader.setFiles(files);

        const config: FileIngestionConfig = {
            path: '/path/to/directory',
            filePattern: '*.eml',
        };

        const results = await sourceReader.ingest(config);

        // Should only get .eml files
        expect(results).toHaveLength(2);
    });
});

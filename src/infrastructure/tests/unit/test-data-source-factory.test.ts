import { describe, test, expect, beforeEach } from 'bun:test';
import { DataSourceFactory } from '../../factories/DataSourceFactory.js';
import { SourceAdapter } from '../../../domain/entities/SourceAdapter.js';
import { GmailDataSource } from '../../adapters/GmailDataSource.js';
import { ZipFileDataSource } from '../../adapters/ZipFileDataSource.js';
import { DirectoryDataSource } from '../../adapters/DirectoryDataSource.js';
import { ILogger } from '../../../domain/ports/ILogger.js';

// Mock logger for testing
class MockLogger implements ILogger {
    logs: string[] = [];

    info(message: string, options?: { prefix?: string; suffix?: string }): void {
        this.logs.push(`INFO: ${message}`);
    }

    error(message: string, options?: { prefix?: string; suffix?: string }): void {
        this.logs.push(`ERROR: ${message}`);
    }

    warning(message: string, options?: { prefix?: string; suffix?: string }): void {
        this.logs.push(`WARNING: ${message}`);
    }

    debug(message: string, options?: { prefix?: string; suffix?: string }): void {
        this.logs.push(`DEBUG: ${message}`);
    }

    await(message: string, options?: { prefix?: string; suffix?: string }) {
        return {
            start: () => { },
            update: (msg: string) => { },
            stop: () => { },
        };
    }
}

describe('DataSourceFactory', () => {
    let mockLogger: MockLogger;

    beforeEach(() => {
        mockLogger = new MockLogger();
    });

    describe('create', () => {
        test('should create GmailDataSource for Gmail source type', () => {
            const mockTimestampRepo = {
                getLastExecutionTime: async () => null,
                saveLastExecutionTime: async () => { }
            };
            const mockEmailClient = {
                fetchMessagesSince: async () => []
            };

            const dataSource = DataSourceFactory.create(
                'Gmail',
                mockLogger,
                { emailClient: mockEmailClient, timestampRepository: mockTimestampRepo }
            );

            expect(dataSource).toBeInstanceOf(GmailDataSource);
            expect(dataSource.getSourceType()).toBe('Gmail');
        });

        test('should create ZipFileDataSource for ZipFile source type', () => {
            const mockZipExtractor = {
                extractFiles: async () => new Map()
            };

            const dataSource = DataSourceFactory.create(
                'ZipFile',
                mockLogger,
                { zipExtractor: mockZipExtractor }
            );

            expect(dataSource).toBeInstanceOf(ZipFileDataSource);
            expect(dataSource.getSourceType()).toBe('ZipFile');
        });

        test('should create DirectoryDataSource for Directory source type', () => {
            const mockDirectoryReader = {
                readFiles: async () => new Map()
            };

            const dataSource = DataSourceFactory.create(
                'Directory',
                mockLogger,
                { directoryReader: mockDirectoryReader }
            );

            expect(dataSource).toBeInstanceOf(DirectoryDataSource);
            expect(dataSource.getSourceType()).toBe('Directory');
        });

        test('should throw error for unsupported source type', () => {
            expect(() => {
                DataSourceFactory.create(
                    'Outlook' as SourceAdapter,
                    mockLogger,
                    {}
                );
            }).toThrow('Unsupported source adapter: Outlook');
        });

        test('should throw error for None source type', () => {
            expect(() => {
                DataSourceFactory.create(
                    'None',
                    mockLogger,
                    {}
                );
            }).toThrow('Cannot create data source for None type');
        });

        test('should throw error when required dependencies are missing', () => {
            expect(() => {
                DataSourceFactory.create(
                    'Gmail',
                    mockLogger,
                    {} // Missing emailClient and timestampRepository
                );
            }).toThrow('Gmail data source requires emailClient and timestampRepository');
        });

        test('should create correct instance for each supported type', () => {
            const mockEmailClient = {
                fetchMessagesSince: async () => []
            };
            const mockTimestampRepo = {
                getLastExecutionTime: async () => null,
                saveLastExecutionTime: async () => { }
            };
            const mockZipExtractor = {
                extractFiles: async () => new Map()
            };
            const mockDirectoryReader = {
                readFiles: async () => new Map()
            };

            const sources: Array<{ type: SourceAdapter; deps: any; expectedClass: any }> = [
                {
                    type: 'Gmail',
                    deps: { emailClient: mockEmailClient, timestampRepository: mockTimestampRepo },
                    expectedClass: GmailDataSource
                },
                {
                    type: 'ZipFile',
                    deps: { zipExtractor: mockZipExtractor },
                    expectedClass: ZipFileDataSource
                },
                {
                    type: 'Directory',
                    deps: { directoryReader: mockDirectoryReader },
                    expectedClass: DirectoryDataSource
                }
            ];

            sources.forEach(({ type, deps, expectedClass }) => {
                const dataSource = DataSourceFactory.create(type, mockLogger, deps);
                expect(dataSource).toBeInstanceOf(expectedClass);
                expect(dataSource.getSourceType()).toBe(type);
            });
        });
    });

    describe('type safety', () => {
        test('should accept valid SourceAdapter types', () => {
            const validTypes: SourceAdapter[] = ['Gmail', 'ZipFile', 'Directory'];

            validTypes.forEach(type => {
                // Should not throw type error
                const sourceType: SourceAdapter = type;
                expect(sourceType).toBe(type);
            });
        });

        test('should work with type narrowing', () => {
            const unknownType: string = 'Gmail';

            // Type guard would be used here in real code
            const sourceType = unknownType as SourceAdapter;
            expect(sourceType).toBe('Gmail');
        });
    });
});

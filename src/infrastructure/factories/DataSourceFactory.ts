import { AbstractDataSource } from '../../domain/entities/AbstractDataSource.js';
import { BaseContent } from '../../domain/entities/BaseContent.js';
import { SourceAdapter } from '../../domain/entities/SourceAdapter.js';
import { ILogger } from '../../domain/ports/ILogger.js';
import { IEmailClient } from '../../domain/ports/IEmailClient.js';
import { ITimestampRepository } from '../../domain/ports/ITimestampRepository.js';
import { IZipExtractor } from '../../domain/ports/IZipExtractor.js';
import { IDirectoryReader } from '../../domain/ports/IDirectoryReader.js';
import { GmailDataSource } from '../adapters/GmailDataSource.js';
import { ZipFileDataSource } from '../adapters/ZipFileDataSource.js';
import { DirectoryDataSource } from '../adapters/DirectoryDataSource.js';

/**
 * Dependencies that may be needed by different data sources
 */
export interface DataSourceDependencies {
    emailClient?: IEmailClient;
    timestampRepository?: ITimestampRepository;
    zipExtractor?: IZipExtractor;
    directoryReader?: IDirectoryReader;
}

/**
 * Factory for creating data source instances based on SourceAdapter type
 * 
 * This factory pattern provides:
 * - Centralized creation logic for data sources
 * - Type-safe instantiation based on SourceAdapter
 * - Dependency injection for different implementations
 * - Easy extensibility for new source types
 * 
 * @example
 * ```typescript
 * const dataSource = DataSourceFactory.create(
 *   'Gmail',
 *   logger,
 *   { emailClient, timestampRepository }
 * );
 * ```
 */
export class DataSourceFactory {
    /**
     * Creates a data source instance for the specified source adapter type
     * 
     * @param source - The type of data source to create
     * @param logger - Logger instance for logging
     * @param dependencies - Required dependencies for the specific data source type
     * @returns An instance of the appropriate data source
     * @throws Error if the source type is unsupported or dependencies are missing
     */
    static create(
        source: SourceAdapter,
        logger: ILogger,
        dependencies: DataSourceDependencies
    ): AbstractDataSource<any, BaseContent> {
        switch (source) {
            case 'Gmail':
                return DataSourceFactory.createGmailDataSource(logger, dependencies);

            case 'ZipFile':
                return DataSourceFactory.createZipFileDataSource(logger, dependencies);

            case 'Directory':
                return DataSourceFactory.createDirectoryDataSource(logger, dependencies);

            case 'None':
                throw new Error('Cannot create data source for None type');

            case 'Outlook':
            case 'EmlFile':
            case 'NotionDatabase':
            case 'Other':
                throw new Error(`Unsupported source adapter: ${source}`);

            default:
                // TypeScript will ensure this is never reached if all cases are handled
                const exhaustiveCheck: never = source;
                throw new Error(`Unhandled source adapter: ${exhaustiveCheck}`);
        }
    }

    /**
     * Creates a Gmail data source
     */
    private static createGmailDataSource(
        logger: ILogger,
        dependencies: DataSourceDependencies
    ): GmailDataSource {
        const { emailClient, timestampRepository } = dependencies;

        if (!emailClient || !timestampRepository) {
            throw new Error('Gmail data source requires emailClient and timestampRepository');
        }

        return new GmailDataSource(emailClient, timestampRepository, logger);
    }

    /**
     * Creates a ZipFile data source
     */
    private static createZipFileDataSource(
        logger: ILogger,
        dependencies: DataSourceDependencies
    ): ZipFileDataSource {
        const { zipExtractor } = dependencies;

        if (!zipExtractor) {
            throw new Error('ZipFile data source requires zipExtractor');
        }

        return new ZipFileDataSource(zipExtractor, logger);
    }

    /**
     * Creates a Directory data source
     */
    private static createDirectoryDataSource(
        logger: ILogger,
        dependencies: DataSourceDependencies
    ): DirectoryDataSource {
        const { directoryReader } = dependencies;

        if (!directoryReader) {
            throw new Error('Directory data source requires directoryReader');
        }

        return new DirectoryDataSource(directoryReader, logger);
    }
}

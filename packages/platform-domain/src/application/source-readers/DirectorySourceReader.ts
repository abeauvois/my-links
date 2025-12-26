import { AbstractFileSourceReader } from './AbstractFileSourceReader';
import { BaseContent } from '../../domain/entities/BaseContent.js';
import { RawFile } from '../../domain/entities/RawFile.js';
import { FileIngestionConfig, IngestionConfig } from '../../domain/entities/IngestionConfig.js';
import { IFilesystemReader } from '../../domain/ports/IFilesystemReader.js';
import { IZipReader } from '../../domain/ports/IZipReader.js';
import { ITarReader } from '../../domain/ports/ITarReader.js';
import { ILogger } from '../../domain/ports/ILogger.js';

/**
 * Directory Source Reader
 * Reads and normalizes files from a directory or archive into BaseContent
 * Supports recursive scanning and file pattern filtering
 *
 * Automatically detects and handles:
 * - Directories (via FilesystemReader)
 * - Zip archives .zip (via ZipReader)
 * - Tar archives .tar, .tar.gz, .tgz (via TarReader)
 */
export class DirectorySourceReader extends AbstractFileSourceReader<RawFile, BaseContent> {
    constructor(
        private readonly filesystemReader: IFilesystemReader,
        private readonly zipReader: IZipReader,
        private readonly tarReader: ITarReader,
        logger: ILogger
    ) {
        super('Directory', logger);
    }

    /**
     * Fetch files from directory or archive
     * Automatically detects source type based on path extension
     */
    protected async fetchRaw(config: IngestionConfig): Promise<RawFile[]> {
        const fileConfig = config as FileIngestionConfig;
        const path = fileConfig.path;
        const lower = path.toLowerCase();

        if (lower.endsWith('.zip')) {
            return this.zipReader.extractFiles(path, fileConfig.filePattern);
        }

        if (lower.endsWith('.tar') || lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) {
            return this.tarReader.extractFiles(path, fileConfig.filePattern);
        }

        return this.filesystemReader.readFiles(
            path,
            fileConfig.recursive,
            fileConfig.filePattern
        );
    }

    /**
     * Normalize files to BaseContent
     */
    protected async normalize(files: RawFile[]): Promise<BaseContent[]> {
        const now = new Date();

        return files.map(file => new BaseContent(
            file.content,
            'Directory',
            [],
            '',
            file.content,
            now,
            now,
            file.fileType
        ));
    }
}

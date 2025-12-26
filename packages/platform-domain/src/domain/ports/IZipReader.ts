import { RawFile } from '../entities/RawFile';

/**
 * Port for extracting files from zip archives
 * Abstracts zip file operations
 */
export interface IZipReader {
    /**
     * Extract all files from a zip archive
     * @param zipPath - Path to the zip file
     * @param filePattern - Optional glob pattern to filter files (e.g., "*.eml")
     * @returns Array of RawFile objects with file metadata and content
     */
    extractFiles(
        zipPath: string,
        filePattern?: string
    ): Promise<RawFile[]>;
}

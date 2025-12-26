import { RawFile } from '../entities/RawFile';

/**
 * Port for extracting files from tar archives (including .tar.gz, .tgz)
 * Abstracts tar file operations
 */
export interface ITarReader {
    /**
     * Extract all files from a tar archive
     * @param tarPath - Path to the tar file (.tar, .tar.gz, .tgz)
     * @param filePattern - Optional glob pattern to filter files (e.g., "*.eml")
     * @returns Array of RawFile objects with file metadata and content
     */
    extractFiles(
        tarPath: string,
        filePattern?: string
    ): Promise<RawFile[]>;
}

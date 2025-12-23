import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'node:path';
import { IFilesystemReader } from '../../domain/ports/IFilesystemReader.js';
import { RawFile, createRawFile } from '../../domain/entities/RawFile.js';

/**
 * Filesystem Reader Adapter
 * Reads files from directories on the local filesystem
 */
export class FilesystemReader implements IFilesystemReader {
    /**
     * Read all files from a directory
     * @param directoryPath - Path to the directory
     * @param recursive - Whether to scan recursively (default: false)
     * @param filePattern - Optional glob pattern to filter files (e.g., "*.eml")
     * @returns Array of RawFile objects with file metadata and content
     */
    async readFiles(
        directoryPath: string,
        recursive: boolean = false,
        filePattern?: string
    ): Promise<RawFile[]> {
        this.validateDirectoryPath(directoryPath);

        const files: RawFile[] = [];
        this.readFilesRecursive(directoryPath, directoryPath, files, recursive, filePattern);
        return files;
    }

    private validateDirectoryPath(directoryPath: string): void {
        try {
            const stats = statSync(directoryPath);
            if (!stats.isDirectory()) {
                throw new Error(`Path is not a directory: ${directoryPath}`);
            }
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                throw new Error(`Directory not found: ${directoryPath}`);
            }
            throw error;
        }
    }

    /**
     * Internal recursive file reader
     */
    private readFilesRecursive(
        basePath: string,
        currentPath: string,
        files: RawFile[],
        recursive: boolean,
        filePattern?: string
    ): void {
        const entries = readdirSync(currentPath);

        for (const entry of entries) {
            const fullPath = join(currentPath, entry);
            const stats = statSync(fullPath);

            if (stats.isDirectory()) {
                if (recursive) {
                    this.readFilesRecursive(basePath, fullPath, files, recursive, filePattern);
                }
            } else if (stats.isFile()) {
                if (filePattern && !this.matchesPattern(entry, filePattern)) {
                    continue;
                }

                const content = readFileSync(fullPath, 'utf-8');
                const relativePath = fullPath.replace(basePath + '/', '');
                files.push(createRawFile(relativePath, content));
            }
        }
    }

    /**
     * Simple glob pattern matcher
     * Supports basic wildcards like "*.eml"
     */
    private matchesPattern(filename: string, pattern: string): boolean {
        const regexPattern = pattern
            .replace(/\./g, '\\.')
            .replace(/\*/g, '.*');

        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(filename);
    }
}

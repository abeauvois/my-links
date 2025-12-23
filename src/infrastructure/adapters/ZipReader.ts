import JSZip from 'jszip';
import { readFileSync, statSync } from 'fs';
import { extname } from 'node:path';
import { IZipReader } from '../../domain/ports/IZipReader.js';
import { RawFile, createRawFile } from '../../domain/entities/RawFile.js';

/**
 * Zip Reader Adapter
 * Extracts files from zip archives
 */
export class ZipReader implements IZipReader {
    private readonly ALLOWED_EXTENSIONS = ['eml', 'md', 'text', 'csv', 'txt', 'json'];

    /**
     * Extract all files from a zip archive
     * @param zipPath - Path to the zip file
     * @param filePattern - Optional glob pattern to filter files (e.g., "*.eml")
     * @returns Array of RawFile objects with file metadata and content
     */
    async extractFiles(zipPath: string, filePattern?: string): Promise<RawFile[]> {
        this.validateZipPath(zipPath);

        const buffer = readFileSync(zipPath);
        const zip = await JSZip.loadAsync(buffer);
        const files: RawFile[] = [];

        for (const [filename, zipEntry] of Object.entries(zip.files)) {
            if (zipEntry.dir) continue;
            if (!this.hasAllowedExtension(filename)) continue;
            if (filePattern && !this.matchesPattern(filename, filePattern)) continue;

            const content = await zipEntry.async('text');
            files.push(createRawFile(filename, content));
        }

        return files;
    }

    private validateZipPath(zipPath: string): void {
        try {
            const stats = statSync(zipPath);
            if (!stats.isFile()) {
                throw new Error(`Path is not a file: ${zipPath}`);
            }
            if (!zipPath.toLowerCase().endsWith('.zip')) {
                throw new Error(`Path is not a zip file: ${zipPath}`);
            }
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                throw new Error(`File not found: ${zipPath}`);
            }
            throw error;
        }
    }

    private hasAllowedExtension(filename: string): boolean {
        const ext = extname(filename).slice(1).toLowerCase();
        return this.ALLOWED_EXTENSIONS.includes(ext);
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

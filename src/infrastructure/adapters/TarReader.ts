import { createReadStream, statSync } from 'fs';
import { createGunzip } from 'zlib';
import { extname, basename } from 'node:path';
import { ITarReader } from '../../domain/ports/ITarReader.js';
import { RawFile, createRawFile } from '../../domain/entities/RawFile.js';
import * as tar from 'tar';

/**
 * Tar Reader Adapter
 * Extracts files from tar archives (.tar, .tar.gz, .tgz)
 */
export class TarReader implements ITarReader {
    private readonly ALLOWED_EXTENSIONS = ['eml', 'md', 'text', 'csv', 'txt', 'json'];

    /**
     * Extract all files from a tar archive
     * @param tarPath - Path to the tar file (.tar, .tar.gz, .tgz)
     * @param filePattern - Optional glob pattern to filter files (e.g., "*.eml")
     * @returns Array of RawFile objects with file metadata and content
     */
    async extractFiles(tarPath: string, filePattern?: string): Promise<RawFile[]> {
        this.validateTarPath(tarPath);

        const files: RawFile[] = [];
        const isGzipped = this.isGzipped(tarPath);

        return new Promise((resolve, reject) => {
            const entries: Array<{ path: string; content: string }> = [];

            const parser = new tar.Parser({
                onReadEntry: (entry) => {
                    if (entry.type !== 'File') {
                        entry.resume();
                        return;
                    }

                    const filename = entry.path;
                    if (!this.hasAllowedExtension(filename)) {
                        entry.resume();
                        return;
                    }
                    if (filePattern && !this.matchesPattern(filename, filePattern)) {
                        entry.resume();
                        return;
                    }

                    const chunks: Buffer[] = [];
                    entry.on('data', (chunk: Buffer) => chunks.push(chunk));
                    entry.on('end', () => {
                        const content = Buffer.concat(chunks).toString('utf-8');
                        entries.push({ path: filename, content });
                    });
                }
            });

            parser.on('end', () => {
                for (const entry of entries) {
                    files.push(createRawFile(entry.path, entry.content));
                }
                resolve(files);
            });

            parser.on('error', reject);

            const readStream = createReadStream(tarPath);
            if (isGzipped) {
                readStream.pipe(createGunzip()).pipe(parser);
            } else {
                readStream.pipe(parser);
            }
        });
    }

    private validateTarPath(tarPath: string): void {
        try {
            const stats = statSync(tarPath);
            if (!stats.isFile()) {
                throw new Error(`Path is not a file: ${tarPath}`);
            }
            if (!this.isTarFile(tarPath)) {
                throw new Error(`Path is not a tar file: ${tarPath}`);
            }
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                throw new Error(`File not found: ${tarPath}`);
            }
            throw error;
        }
    }

    private isTarFile(path: string): boolean {
        const lower = path.toLowerCase();
        return lower.endsWith('.tar') ||
               lower.endsWith('.tar.gz') ||
               lower.endsWith('.tgz');
    }

    private isGzipped(path: string): boolean {
        const lower = path.toLowerCase();
        return lower.endsWith('.tar.gz') || lower.endsWith('.tgz');
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
        // Match against filename only, not full path
        return regex.test(basename(filename)) || regex.test(filename);
    }
}

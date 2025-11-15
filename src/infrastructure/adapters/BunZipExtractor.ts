import JSZip from 'jszip';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { IZipExtractor } from '../../domain/ports/IZipExtractor.js';

/**
 * Adapter: Implements zip extraction using JSZip library
 * Also supports extracting files directly from a directory
 * Supports multiple file extensions: .eml, .md, .text, .csv
 */
export class BunZipExtractor implements IZipExtractor {
    private readonly ALLOWED_EXTENSIONS = ['eml', 'md', 'text', 'csv'];

    /**
     * Check if a filename has an allowed extension
     */
    private hasAllowedExtension(filename: string): boolean {
        const lowerFilename = filename.toLowerCase();
        return this.ALLOWED_EXTENSIONS.some(ext => lowerFilename.endsWith(`.${ext}`));
    }
    async extractEmlFiles(zipFilePath: string): Promise<Map<string, string>> {
        // Check if the path exists and determine if it's a directory or file
        try {
            const stats = statSync(zipFilePath);
            if (stats.isDirectory()) {
                return await this.extractEmlFilesFromDirectory(zipFilePath);
            }
        } catch (error) {
            throw new Error(`Path not found: ${zipFilePath}`);
        }

        // Try to load as a zip file
        try {
            const file = Bun.file(zipFilePath);
            const arrayBuffer = await file.arrayBuffer();
            const zip = await JSZip.loadAsync(arrayBuffer);

            const emlFiles = new Map<string, string>();

            for (const [filename, zipEntry] of Object.entries(zip.files)) {
                // Only process files with allowed extensions (not directories)
                if (!zipEntry.dir && this.hasAllowedExtension(filename)) {
                    const content = await zipEntry.async('text');
                    emlFiles.set(filename, content);
                }
            }

            return emlFiles;
        } catch (error) {
            throw new Error(`Failed to process path as zip file or directory: ${zipFilePath}`);
        }
    }

    private async extractEmlFilesFromDirectory(directoryPath: string): Promise<Map<string, string>> {
        const emlFiles = new Map<string, string>();

        try {
            const files = readdirSync(directoryPath);

            for (const filename of files) {
                if (this.hasAllowedExtension(filename)) {
                    const filePath = join(directoryPath, filename);
                    const stats = statSync(filePath);

                    // Only process files, not directories
                    if (stats.isFile()) {
                        const file = Bun.file(filePath);
                        const content = await file.text();
                        emlFiles.set(filename, content);
                    }
                }
            }

            return emlFiles;
        } catch (error) {
            throw new Error(`Failed to read files from directory: ${directoryPath}`);
        }
    }
}

import JSZip from 'jszip';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { IZipExtractor } from '../../domain/ports/IZipExtractor.js';

/**
 * Adapter: Implements zip extraction using JSZip library
 * Also supports extracting EML files directly from a directory
 */
export class BunZipExtractor implements IZipExtractor {
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
                // Only process .eml files (not directories)
                if (!zipEntry.dir && filename.toLowerCase().endsWith('.eml')) {
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
                if (filename.toLowerCase().endsWith('.eml')) {
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
            throw new Error(`Failed to read EML files from directory: ${directoryPath}`);
        }
    }
}
